import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import {
  allocateCommission,
  parseSearchIntent,
  type RankingPreset
} from "@rightprice/core";
import {
  EbayBrowseConnector,
  MockCommerceConnector,
  searchAllConnectors
} from "@rightprice/connectors";
import { randomUUID } from "node:crypto";

function connectors() {
  return [
    new MockCommerceConnector(process.env.ENABLE_DEMO_CONNECTOR === "true" || process.env.NODE_ENV !== "production"),
    new EbayBrowseConnector({
      clientId: process.env.EBAY_CLIENT_ID,
      clientSecret: process.env.EBAY_CLIENT_SECRET,
      marketplaceId: process.env.EBAY_MARKETPLACE_ID,
      campaignId: process.env.EBAY_CAMPAIGN_ID,
      enabled: process.env.ENABLE_EBAY_CONNECTOR === "true"
    })
  ];
}

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

const server = new McpServer({ name: "rightprice-commerce", version: "0.1.0" });

server.registerTool(
  "parse_search_intent",
  {
    description: "Convert a natural-language shopping request into deterministic RightPrice search constraints.",
    inputSchema: z.object({ query: z.string().min(2).max(300) })
  },
  async ({ query }) => json(parseSearchIntent(query))
);

server.registerTool(
  "search_offers",
  {
    description: "Search enabled RightPrice commerce connectors and return shopper-first ranked normalized offers.",
    inputSchema: z.object({
      query: z.string().min(2).max(300),
      preset: z.enum(["best_overall", "cheapest", "fastest", "trusted", "cashback", "local"]).default("best_overall")
    })
  },
  async ({ query, preset }) => {
    const intent = parseSearchIntent(query);
    intent.preset = preset as RankingPreset;
    const result = await searchAllConnectors(connectors(), intent, { requestId: randomUUID() });
    return json({
      offers: result.offers.map((offer) => ({
        id: offer.id,
        title: offer.product.title,
        retailer: offer.retailerName,
        payNow: offer.totalBeforeCashback,
        effectiveCost: offer.effectiveCost,
        delivery: offer.delivery,
        score: offer.score,
        reason: offer.rankReason,
        sourceUrl: offer.sourceUrl
      })),
      connectorErrors: result.connectorErrors
    });
  }
);

server.registerTool(
  "connector_health",
  {
    description: "Return non-secret health status for configured RightPrice commerce connectors.",
    inputSchema: z.object({})
  },
  async () => json(await Promise.all(connectors().map((connector) => connector.health())))
);

server.registerTool(
  "calculate_commission_allocation",
  {
    description: "Calculate a deterministic affiliate commission allocation while enforcing merchant cashback/sub-affiliate permissions.",
    inputSchema: z.object({
      grossCommission: z.number().nonnegative(),
      buyerCashbackRate: z.number().min(0).max(1),
      directReferrerRate: z.number().min(0).max(1),
      secondLevelRate: z.number().min(0).max(1).default(0),
      allowsCashback: z.boolean(),
      allowsSubaffiliate: z.boolean(),
      maxReferralDepth: z.number().int().min(0).max(5).default(0),
      hasBuyer: z.boolean().default(true),
      hasDirectReferrer: z.boolean().default(false),
      hasSecondLevelReferrer: z.boolean().default(false)
    })
  },
  async (input) => json(allocateCommission(
    input.grossCommission,
    {
      buyerCashbackRate: input.buyerCashbackRate,
      directReferrerRate: input.directReferrerRate,
      secondLevelRate: input.secondLevelRate
    },
    {
      allowsCashback: input.allowsCashback,
      allowsSubaffiliate: input.allowsSubaffiliate,
      maxReferralDepth: input.maxReferralDepth
    },
    {
      hasBuyer: input.hasBuyer,
      hasDirectReferrer: input.hasDirectReferrer,
      hasSecondLevelReferrer: input.hasSecondLevelReferrer
    }
  ))
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("RightPrice MCP server failed", error);
  process.exitCode = 1;
});
