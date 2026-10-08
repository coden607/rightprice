import {
  calculateOfferTotals,
  money,
  normalizeTitle,
  type CommerceConnector,
  type ConnectorHealth,
  type Offer,
  type ProductCondition,
  type SearchContext,
  type SearchIntent
} from "@rightprice/core";

type EbayToken = { access_token: string; expires_in: number };
type EbayMoney = { value?: string; currency?: string };
type EbayItemSummary = {
  itemId: string;
  title: string;
  itemWebUrl?: string;
  itemAffiliateWebUrl?: string;
  price?: EbayMoney;
  image?: { imageUrl?: string };
  condition?: string;
  seller?: { username?: string; feedbackPercentage?: string; feedbackScore?: number };
  shippingOptions?: Array<{
    shippingCost?: EbayMoney;
    minEstimatedDeliveryDate?: string;
    maxEstimatedDeliveryDate?: string;
  }>;
  itemLocation?: { city?: string; stateOrProvince?: string; postalCode?: string; country?: string };
};
type EbaySearchResponse = { itemSummaries?: EbayItemSummary[] };

let tokenCache: { token: string; expiresAt: number } | undefined;

function condition(value?: string): ProductCondition {
  if (!value) return "unknown";
  const normalized = value.toLowerCase();
  if (normalized.includes("refurb")) return "refurbished";
  if (normalized.includes("open box")) return "open_box";
  if (normalized.includes("new")) return "new";
  if (normalized.includes("used")) return "used_good";
  return "unknown";
}

function daysUntil(iso?: string): number | undefined {
  if (!iso) return undefined;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return undefined;
  return Math.max(0, Math.ceil((parsed - Date.now()) / 86_400_000));
}

export interface EbayConnectorConfig {
  clientId?: string;
  clientSecret?: string;
  marketplaceId?: string;
  campaignId?: string;
  enabled?: boolean;
}

export class EbayBrowseConnector implements CommerceConnector {
  readonly id = "ebay";
  readonly displayName = "eBay";
  private readonly config: EbayConnectorConfig;

  constructor(config: EbayConnectorConfig) {
    this.config = config;
  }

  isEnabled(): boolean {
    return Boolean(this.config.enabled && this.config.clientId && this.config.clientSecret);
  }

  private async accessToken(): Promise<string> {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
    if (!this.config.clientId || !this.config.clientSecret) throw new Error("eBay credentials are not configured");

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");
    const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "https://api.ebay.com/oauth/api_scope"
      }),
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`eBay OAuth failed (${response.status})`);
    const body = (await response.json()) as EbayToken;
    tokenCache = {
      token: body.access_token,
      expiresAt: Date.now() + Math.max(60, body.expires_in - 120) * 1000
    };
    return body.access_token;
  }

  async search(intent: SearchIntent, context: SearchContext): Promise<Offer[]> {
    if (!this.isEnabled()) return [];
    const token = await this.accessToken();
    const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
    url.searchParams.set("q", intent.query);
    url.searchParams.set("limit", "20");
    if (intent.maxPrice != null) {
      url.searchParams.set("filter", `price:[..${intent.maxPrice}],priceCurrency:USD`);
    }

    const endUserContext = this.config.campaignId
      ? `affiliateCampaignId=${this.config.campaignId},affiliateReferenceId=${encodeURIComponent(context.requestId)}`
      : undefined;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": this.config.marketplaceId ?? "EBAY_US",
        ...(endUserContext ? { "X-EBAY-C-ENDUSERCTX": endUserContext } : {})
      },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`eBay Browse search failed (${response.status})`);
    const body = (await response.json()) as EbaySearchResponse;

    const offers = (body.itemSummaries ?? []).flatMap((item): Offer[] => {
      const price = Number(item.price?.value);
      if (!Number.isFinite(price)) return [];
      const shippingOption = item.shippingOptions?.[0];
      const shippingAmount = Number(shippingOption?.shippingCost?.value ?? 0);
      const itemPrice = money(price, item.price?.currency ?? "USD");
      const shipping = money(Number.isFinite(shippingAmount) ? shippingAmount : 0, itemPrice.currency);
      const totals = calculateOfferTotals({ itemPrice, shipping });
      const destination = item.itemAffiliateWebUrl ?? item.itemWebUrl;
      if (!destination) return [];

      return [{
        id: `ebay:${item.itemId}`,
        product: {
          id: `ebay-product:${item.itemId}`,
          title: item.title,
          normalizedTitle: normalizeTitle(item.title),
          identifiers: [{ type: "sku", value: item.itemId }],
          imageUrl: item.image?.imageUrl
        },
        retailerId: "ebay",
        retailerName: "eBay",
        seller: item.seller?.username ? {
          name: item.seller.username,
          rating: item.seller.feedbackPercentage ? Number(item.seller.feedbackPercentage) : undefined,
          reviewCount: item.seller.feedbackScore
        } : undefined,
        condition: condition(item.condition),
        itemPrice,
        shipping,
        ...totals,
        delivery: {
          minDate: shippingOption?.minEstimatedDeliveryDate,
          maxDate: shippingOption?.maxEstimatedDeliveryDate,
          minDays: daysUntil(shippingOption?.minEstimatedDeliveryDate),
          maxDays: daysUntil(shippingOption?.maxEstimatedDeliveryDate)
        },
        returnDays: 30,
        sourceUrl: item.itemWebUrl ?? destination,
        affiliateUrl: item.itemAffiliateWebUrl,
        sourceTimestamp: new Date().toISOString(),
        freshnessSeconds: 900,
        riskFlags: [],
        metadata: {
          source: "ebay-browse-api",
          affiliateEligible: Boolean(item.itemAffiliateWebUrl)
        }
      }];
    });

    return offers.filter((offer) => {
      if (intent.condition && offer.condition !== intent.condition) return false;
      if (intent.localPickup && !offer.delivery?.localPickup) return false;
      return true;
    });
  }

  async health(): Promise<ConnectorHealth> {
    if (!this.isEnabled()) {
      return { connectorId: this.id, ok: false, message: "Disabled or credentials missing", checkedAt: new Date().toISOString() };
    }
    try {
      await this.accessToken();
      return { connectorId: this.id, ok: true, message: "OAuth credentials valid", checkedAt: new Date().toISOString() };
    } catch (error) {
      return { connectorId: this.id, ok: false, message: error instanceof Error ? error.message : "Unknown eBay error", checkedAt: new Date().toISOString() };
    }
  }
}
