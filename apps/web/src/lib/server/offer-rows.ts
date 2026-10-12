import type { Offer, ProductIdentifier } from "@rightprice/core";

export interface RetailerRow {
  id: string;
  name: string;
  connector_type: string;
  enabled: boolean;
}

export interface ProductRow {
  title: string;
  normalized_title: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  image_url: string | null;
  attributes: Record<string, string>;
}

export interface ProductIdentifierRow {
  identifier_type: string;
  identifier_value: string;
  confidence: number;
}

export interface OfferRow {
  retailer_id: string;
  external_offer_id: string;
  seller_name: string | null;
  seller_rating: number | null;
  condition: string;
  currency: string;
  item_price: number;
  shipping: number;
  estimated_tax: number | null;
  coupon_discount: number;
  cashback: number;
  total_before_cashback: number;
  effective_cost: number;
  source_url: string;
  affiliate_url: string | null;
  return_days: number | null;
  risk_flags: string[];
  source_timestamp: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface OfferSnapshotRow {
  item_price: number;
  shipping: number;
  effective_cost: number;
  available: boolean;
}

export interface OfferPersistenceRows {
  retailer: RetailerRow;
  product: ProductRow;
  identifiers: ProductIdentifierRow[];
  offer: OfferRow;
  snapshot: OfferSnapshotRow;
}

const STRONG_IDENTIFIER_ORDER = ["gtin", "upc", "ean", "isbn"] as const;

export function strongIdentifier(identifiers: ProductIdentifier[]): ProductIdentifier | null {
  for (const type of STRONG_IDENTIFIER_ORDER) {
    const match = identifiers.find((identifier) => identifier.type === type);
    if (match) return match;
  }
  return null;
}

export function buildOfferPersistenceRows(offer: Offer): OfferPersistenceRows {
  const product = offer.product;
  return {
    retailer: {
      id: offer.retailerId,
      name: offer.retailerName,
      connector_type: "search",
      enabled: true
    },
    product: {
      title: product.title,
      normalized_title: product.normalizedTitle,
      brand: product.brand ?? null,
      model: product.model ?? null,
      category: product.category ?? null,
      image_url: product.imageUrl ?? null,
      attributes: product.attributes ?? {}
    },
    identifiers: product.identifiers.map((identifier) => ({
      identifier_type: identifier.type,
      identifier_value: identifier.value,
      confidence: 1
    })),
    offer: {
      retailer_id: offer.retailerId,
      external_offer_id: offer.id,
      seller_name: offer.seller?.name ?? null,
      seller_rating: offer.seller?.rating ?? null,
      condition: offer.condition,
      currency: offer.itemPrice.currency,
      item_price: offer.itemPrice.amount,
      shipping: offer.shipping.amount,
      estimated_tax: offer.estimatedTax?.amount ?? null,
      coupon_discount: offer.couponDiscount?.amount ?? 0,
      cashback: offer.cashback?.amount ?? 0,
      total_before_cashback: offer.totalBeforeCashback.amount,
      effective_cost: offer.effectiveCost.amount,
      source_url: offer.sourceUrl,
      affiliate_url: offer.affiliateUrl ?? null,
      return_days: offer.returnDays ?? null,
      risk_flags: offer.riskFlags,
      source_timestamp: offer.sourceTimestamp,
      metadata: offer.metadata ?? {}
    },
    snapshot: {
      item_price: offer.itemPrice.amount,
      shipping: offer.shipping.amount,
      effective_cost: offer.effectiveCost.amount,
      available: true
    }
  };
}
