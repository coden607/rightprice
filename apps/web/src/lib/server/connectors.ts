import { EbayBrowseConnector, GenericJsonFeedConnector, MockCommerceConnector } from "@rightprice/connectors";

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
      fields: {
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
        seller: "seller"
      }
    })
  ];
}
