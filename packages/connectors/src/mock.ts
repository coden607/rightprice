import {
  calculateOfferTotals,
  money,
  normalizeTitle,
  type CommerceConnector,
  type ConnectorHealth,
  type Offer,
  type SearchContext,
  type SearchIntent
} from "@rightprice/core";

function makeOffer(params: {
  id: string;
  retailerName: string;
  title: string;
  price: number;
  shipping: number;
  cashback: number;
  days: number;
  rating: number;
  returns: number;
  local?: boolean;
  distanceMiles?: number;
}): Offer {
  const itemPrice = money(params.price);
  const shipping = money(params.shipping);
  const cashback = money(params.cashback);
  const totals = calculateOfferTotals({ itemPrice, shipping, cashback });
  const slug = params.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    id: params.id,
    product: {
      id: `mock-product:${slug}`,
      title: params.title,
      normalizedTitle: normalizeTitle(params.title),
      brand: params.title.split(" ")[0],
      identifiers: []
    },
    retailerId: `mock-${params.retailerName.toLowerCase().replace(/\W+/g, "-")}`,
    retailerName: params.retailerName,
    seller: { name: params.retailerName, rating: params.rating, reviewCount: 1200 },
    condition: "new",
    itemPrice,
    shipping,
    cashback,
    ...totals,
    delivery: {
      minDays: Math.max(0, params.days - 1),
      maxDays: params.days,
      localPickup: params.local ?? false,
      distanceMiles: params.distanceMiles
    },
    returnDays: params.returns,
    sourceUrl: `https://example.com/rightprice-demo/${params.id}`,
    affiliateUrl: `https://example.com/rightprice-demo/${params.id}?affiliate=rightprice`,
    sourceTimestamp: new Date().toISOString(),
    freshnessSeconds: 300,
    riskFlags: [],
    metadata: { demo: true }
  };
}

export class MockCommerceConnector implements CommerceConnector {
  readonly id = "mock";
  readonly displayName = "Demo retailers";

  constructor(private readonly enabled = true) {}

  isEnabled(): boolean {
    return this.enabled;
  }

  async search(intent: SearchIntent, _context: SearchContext): Promise<Offer[]> {
    const title = intent.query || "Popular Product";
    const offers = [
      makeOffer({ id: "demo-value", retailerName: "ValueMart Demo", title, price: 84.99, shipping: 0, cashback: 1.7, days: 4, rating: 4.7, returns: 30 }),
      makeOffer({ id: "demo-fast", retailerName: "FastShip Demo", title, price: 91.49, shipping: 0, cashback: 2.75, days: 1, rating: 4.9, returns: 30 }),
      makeOffer({ id: "demo-local", retailerName: "LocalStore Demo", title, price: 89.25, shipping: 0, cashback: 0.9, days: 0, rating: 4.8, returns: 60, local: true, distanceMiles: 2.4 }),
      makeOffer({ id: "demo-cheap", retailerName: "Marketplace Demo", title, price: 79.5, shipping: 5.99, cashback: 0, days: 7, rating: 4.2, returns: 14 })
    ];

    return offers.filter((offer) => {
      if (intent.maxPrice != null && offer.totalBeforeCashback.amount > intent.maxPrice) return false;
      if (intent.condition && offer.condition !== intent.condition) return false;
      if (intent.localPickup && !offer.delivery?.localPickup) return false;
      return true;
    });
  }

  async health(): Promise<ConnectorHealth> {
    return {
      connectorId: this.id,
      ok: true,
      message: "Demo connector available",
      checkedAt: new Date().toISOString()
    };
  }
}
