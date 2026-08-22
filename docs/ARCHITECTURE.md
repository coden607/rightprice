# RightPrice Architecture

## Core rule

RightPrice separates **canonical products** from **retailer offers**. Retailer adapters may fail independently; the orchestrator returns valid partial results and exposes connector health/errors instead of taking down search.

## Trust boundary

- Browser receives normalized display fields and an opaque signed click token.
- Raw affiliate destination URLs are signed server-side.
- Clickout route verifies the signature/expiry before redirecting.
- Affiliate clicks and financial events are written only by server/service-role code.
- `ledger_events` is append-only at the database layer.
- Affiliate commission is not an input to the ranking engine.

## Search flow

1. Parse natural-language constraints deterministically.
2. Search enabled `CommerceConnector`s concurrently.
3. Normalize every result to the canonical `Offer` model.
4. Rank with user/preset weights.
5. Sign outbound click destinations.
6. Render explanations and a clear affiliate disclosure.

## Retailer integration

Every connector implements:

- `isEnabled()`
- `search(intent, context)`
- `health()`

Store-specific terms and monetization permissions belong in `affiliate_programs`, not hard-coded in ranking/UI logic.

## Product matching

Resolution order:

1. exact GTIN/UPC/EAN/ISBN;
2. MPN/brand/model;
3. structured attributes;
4. title/semantic similarity;
5. confidence gate.

Conflicting strong identifiers block auto-merge.

## Money

Never persist a mutable authoritative `balance`. Balances are projections over immutable `ledger_events`. Returns/fraud/payouts create new debit/credit events with unique idempotency keys.
