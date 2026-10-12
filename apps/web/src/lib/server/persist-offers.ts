import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Offer, ProductIdentifier } from "@rightprice/core";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildOfferPersistenceRows,
  strongIdentifier,
  type OfferPersistenceRows
} from "./offer-rows";

async function resolveProductId(
  client: SupabaseClient,
  rows: OfferPersistenceRows,
  identifiers: ProductIdentifier[]
): Promise<string> {
  const strong = strongIdentifier(identifiers);
  if (strong) {
    const { data: identified, error: identifierError } = await client
      .from("product_identifiers")
      .select("product_id")
      .eq("identifier_type", strong.type)
      .eq("identifier_value", strong.value)
      .limit(1);
    if (identifierError) throw identifierError;
    if (identified && identified.length > 0) return identified[0].product_id as string;
  }

  const { data: existing, error: lookupError } = await client
    .from("products")
    .select("id")
    .eq("normalized_title", rows.product.normalized_title)
    .limit(1);
  if (lookupError) throw lookupError;
  if (existing && existing.length > 0) return existing[0].id as string;

  const { data: inserted, error: insertError } = await client
    .from("products")
    .insert(rows.product)
    .select("id")
    .single();
  if (insertError) throw insertError;

  if (rows.identifiers.length > 0) {
    const { error: identifiersError } = await client.from("product_identifiers").upsert(
      rows.identifiers.map((identifier) => ({
        ...identifier,
        product_id: inserted.id as string
      })),
      { onConflict: "identifier_type,identifier_value,product_id", ignoreDuplicates: true }
    );
    if (identifiersError) throw identifiersError;
  }
  return inserted.id as string;
}

async function persistOne(client: SupabaseClient, offer: Offer): Promise<void> {
  const rows = buildOfferPersistenceRows(offer);

  const { error: retailerError } = await client
    .from("retailers")
    .upsert(rows.retailer, { onConflict: "id" });
  if (retailerError) throw retailerError;

  const productId = await resolveProductId(client, rows, offer.product.identifiers);

  const { error: offerError } = await client
    .from("offers")
    .upsert({ ...rows.offer, product_id: productId }, { onConflict: "retailer_id,external_offer_id" });
  if (offerError) throw offerError;

  const { data: offerRow, error: offerLookupError } = await client
    .from("offers")
    .select("id")
    .eq("retailer_id", rows.offer.retailer_id)
    .eq("external_offer_id", rows.offer.external_offer_id)
    .single();
  if (offerLookupError) throw offerLookupError;

  const { error: snapshotError } = await client.from("offer_snapshots").insert({
    ...rows.snapshot,
    offer_id: offerRow.id as string
  });
  if (snapshotError) throw snapshotError;
}

export async function persistSearchOffers(offers: Offer[]): Promise<{ persisted: boolean; count: number }> {
  const client = createAdminClient();
  if (!client) return { persisted: false, count: 0 };
  let count = 0;
  for (const offer of offers) {
    await persistOne(client, offer);
    count += 1;
  }
  return { persisted: true, count };
}
