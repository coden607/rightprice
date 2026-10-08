import {
  EbayBrowseConnector,
  GenericJsonFeedConnector,
  MockCommerceConnector,
  type GenericFeedFormat,
  type GenericJsonFeedFieldMap
} from "@rightprice/connectors";

const STANDARD_FIELDS: GenericJsonFeedFieldMap = {
  id: "id",
  title: "title",
  price: "price",
  shipping: "shipping",
  cashback: "cashback",
  url: "url",
  affiliateUrl: "affiliateUrl",
  imageUrl: "imageUrl",
  brand: "brand",
  upc: "upc",
  seller: "seller",
  retailerId: "retailerId",
  retailerName: "retailerName"
};

const AWIN_FIELDS: GenericJsonFeedFieldMap = {
  id: "aw_product_id",
  title: "product_name",
  price: "search_price",
  shipping: "delivery_cost",
  url: "merchant_deep_link",
  affiliateUrl: "aw_deep_link",
  imageUrl: "merchant_image_url",
  brand: "brand_name",
  upc: "upc",
  retailerId: "merchant_id",
  retailerName: "merchant_name"
};

interface FeedSpec {
  prefix: string;
  id: string;
  displayName: string;
  requiresComparisonApproval?: boolean;
  fields?: GenericJsonFeedFieldMap;
}

const NETWORK_AND_SUPPLIER_FEEDS: FeedSpec[] = [
  { prefix: "IMPACT", id: "impact", displayName: "Impact merchant network" },
  { prefix: "CJ", id: "cj", displayName: "CJ merchant network" },
  { prefix: "AWIN", id: "awin", displayName: "Awin merchant network", fields: AWIN_FIELDS },
  { prefix: "RAKUTEN", id: "rakuten", displayName: "Rakuten Advertising merchant network" },
  { prefix: "PARTNERIZE", id: "partnerize", displayName: "Partnerize merchant network" },
  { prefix: "WALMART", id: "walmart", displayName: "Walmart" },
  { prefix: "TEMU", id: "temu", displayName: "Temu" },
  { prefix: "WISH", id: "wish", displayName: "Wish" },
  { prefix: "AMAZON", id: "amazon", displayName: "Amazon", requiresComparisonApproval: true },
  { prefix: "ALIEXPRESS", id: "aliexpress", displayName: "AliExpress" },
  { prefix: "BESTBUY", id: "bestbuy", displayName: "Best Buy" },
  { prefix: "TARGET", id: "target", displayName: "Target" },
  { prefix: "NEWEGG", id: "newegg", displayName: "Newegg" },
  { prefix: "HOMEDEPOT", id: "homedepot", displayName: "The Home Depot" },
  { prefix: "LOWES", id: "lowes", displayName: "Lowe's" },
  { prefix: "ETSY", id: "etsy", displayName: "Etsy" }
];

function env(prefix: string, suffix: string): string | undefined {
  return process.env[`${prefix}_${suffix}`];
}

function feedFormat(prefix: string): GenericFeedFormat {
  const value = env(prefix, "FORMAT")?.toLowerCase();
  return value === "json" || value === "jsonl" || value === "csv" || value === "tsv" ? value : "auto";
}

function fieldMap(prefix: string, defaults: GenericJsonFeedFieldMap): GenericJsonFeedFieldMap {
  return {
    id: env(prefix, "FIELD_ID") ?? defaults.id,
    title: env(prefix, "FIELD_TITLE") ?? defaults.title,
    price: env(prefix, "FIELD_PRICE") ?? defaults.price,
    shipping: env(prefix, "FIELD_SHIPPING") ?? defaults.shipping,
    cashback: env(prefix, "FIELD_CASHBACK") ?? defaults.cashback,
    url: env(prefix, "FIELD_URL") ?? defaults.url,
    affiliateUrl: env(prefix, "FIELD_AFFILIATE_URL") ?? defaults.affiliateUrl,
    imageUrl: env(prefix, "FIELD_IMAGE_URL") ?? defaults.imageUrl,
    brand: env(prefix, "FIELD_BRAND") ?? defaults.brand,
    upc: env(prefix, "FIELD_UPC") ?? defaults.upc,
    seller: env(prefix, "FIELD_SELLER") ?? defaults.seller,
    retailerId: env(prefix, "FIELD_RETAILER_ID") ?? defaults.retailerId,
    retailerName: env(prefix, "FIELD_RETAILER_NAME") ?? defaults.retailerName
  };
}

function configuredFeed(spec: FeedSpec): GenericJsonFeedConnector {
  const enabled = env(spec.prefix, "ENABLED") === "true";
  const approved = !spec.requiresComparisonApproval || env(spec.prefix, "COMPARISON_APPROVED") === "true";
  const authHeader = env(spec.prefix, "AUTH_HEADER");
  const authToken = env(spec.prefix, "AUTH_TOKEN");

  return new GenericJsonFeedConnector({
    id: spec.id,
    displayName: spec.displayName,
    endpoint: env(spec.prefix, "FEED_URL"),
    enabled: enabled && approved,
    allowsCashback: env(spec.prefix, "ALLOWS_CASHBACK") === "true",
    queryParam: env(spec.prefix, "QUERY_PARAM"),
    format: feedFormat(spec.prefix),
    headers: authHeader && authToken ? { [authHeader]: authToken } : undefined,
    fields: fieldMap(spec.prefix, spec.fields ?? STANDARD_FIELDS)
  });
}

export function configuredConnectors() {
  return [
    new MockCommerceConnector(process.env.ENABLE_DEMO_CONNECTOR === "true" || process.env.NODE_ENV !== "production"),
    new EbayBrowseConnector({
      clientId: process.env.EBAY_CLIENT_ID,
      clientSecret: process.env.EBAY_CLIENT_SECRET,
      marketplaceId: process.env.EBAY_MARKETPLACE_ID,
      campaignId: process.env.EBAY_CAMPAIGN_ID,
      enabled: process.env.ENABLE_EBAY_CONNECTOR === "true"
    }),
    new GenericJsonFeedConnector({
      id: "approved-feed",
      displayName: process.env.GENERIC_FEED_NAME ?? "Approved Merchant Feed",
      endpoint: process.env.GENERIC_FEED_URL,
      enabled: process.env.ENABLE_GENERIC_FEED === "true",
      allowsCashback: process.env.GENERIC_FEED_ALLOWS_CASHBACK === "true",
      queryParam: process.env.GENERIC_FEED_QUERY_PARAM,
      format: feedFormat("GENERIC_FEED"),
      headers: process.env.GENERIC_FEED_AUTH_HEADER && process.env.GENERIC_FEED_AUTH_TOKEN
        ? { [process.env.GENERIC_FEED_AUTH_HEADER]: process.env.GENERIC_FEED_AUTH_TOKEN }
        : undefined,
      fields: fieldMap("GENERIC_FEED", STANDARD_FIELDS)
    }),
    ...NETWORK_AND_SUPPLIER_FEEDS.map(configuredFeed)
  ];
}
