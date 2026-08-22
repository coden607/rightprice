import { rankOffers, weightsForPreset, type CommerceConnector, type RankedOffer, type RankingWeights, type SearchContext, type SearchIntent } from "@rightprice/core";

export interface ConnectorSearchResult {
  offers: RankedOffer[];
  connectorErrors: Array<{ connectorId: string; message: string }>;
}

export async function searchAllConnectors(
  connectors: CommerceConnector[],
  intent: SearchIntent,
  context: SearchContext,
  customWeights?: RankingWeights
): Promise<ConnectorSearchResult> {
  const enabled = connectors.filter((connector) => connector.isEnabled());
  const settled = await Promise.allSettled(enabled.map(async (connector) => ({
    connectorId: connector.id,
    offers: await connector.search(intent, context)
  })));

  const offers = settled.flatMap((result) => result.status === "fulfilled" ? result.value.offers : []);
  const connectorErrors = settled.flatMap((result, index) => {
    if (result.status === "fulfilled") return [];
    return [{
      connectorId: enabled[index]?.id ?? "unknown",
      message: result.reason instanceof Error ? result.reason.message : "Connector search failed"
    }];
  });

  const weights = customWeights ?? weightsForPreset(intent.preset ?? "best_overall");
  return { offers: rankOffers(offers, weights), connectorErrors };
}
