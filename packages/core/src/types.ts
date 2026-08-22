export type Currency = "USD" | string;

export type ProductCondition =
  | "new"
  | "open_box"
  | "refurbished"
  | "used_like_new"
  | "used_good"
  | "used_fair"
  | "unknown";

export interface Money {
  amount: number;
  currency: Currency;
}

export interface ProductIdentifier {
  type: "gtin" | "upc" | "ean" | "isbn" | "mpn" | "sku";
  value: string;
}

export interface CanonicalProduct {
  id: string;
  title: string;
  normalizedTitle: string;
  brand?: string;
  model?: string;
  category?: string;
  identifiers: ProductIdentifier[];
  imageUrl?: string;
  attributes?: Record<string, string>;
}

export interface SellerInfo {
  name: string;
  rating?: number;
  reviewCount?: number;
}

export interface DeliveryEstimate {
  minDays?: number;
  maxDays?: number;
  minDate?: string;
  maxDate?: string;
  localPickup?: boolean;
  distanceMiles?: number;
}

export interface Offer {
  id: string;
  product: CanonicalProduct;
  retailerId: string;
  retailerName: string;
  seller?: SellerInfo;
  condition: ProductCondition;
  itemPrice: Money;
  shipping: Money;
  estimatedTax?: Money;
  couponDiscount?: Money;
  cashback?: Money;
  totalBeforeCashback: Money;
  effectiveCost: Money;
  delivery?: DeliveryEstimate;
  returnDays?: number;
  warrantyMonths?: number;
  sourceUrl: string;
  affiliateUrl?: string;
  sourceTimestamp: string;
  freshnessSeconds?: number;
  riskFlags: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export type RankingPreset =
  | "best_overall"
  | "cheapest"
  | "fastest"
  | "trusted"
  | "cashback"
  | "local";

export interface RankingWeights {
  price: number;
  delivery: number;
  trust: number;
  returns: number;
  cashback: number;
  local: number;
  riskPenalty: number;
}

export interface SearchIntent {
  rawQuery: string;
  query: string;
  maxPrice?: number;
  condition?: ProductCondition;
  localPickup?: boolean;
  requiredBy?: string;
  preset?: RankingPreset;
}

export interface ScoreBreakdown {
  price: number;
  delivery: number;
  trust: number;
  returns: number;
  cashback: number;
  local: number;
  riskPenalty: number;
}

export interface RankedOffer extends Offer {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  rankReason: string;
}

export interface ConnectorHealth {
  connectorId: string;
  ok: boolean;
  message: string;
  checkedAt: string;
}

export interface SearchContext {
  requestId: string;
  userId?: string;
  referralCode?: string;
  locale?: string;
}

export interface CommerceConnector {
  readonly id: string;
  readonly displayName: string;
  isEnabled(): boolean;
  search(intent: SearchIntent, context: SearchContext): Promise<Offer[]>;
  health(): Promise<ConnectorHealth>;
}
