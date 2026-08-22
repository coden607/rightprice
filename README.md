# RightPrice

RightPrice is a modular, shopper-first commerce comparison PWA. It turns a natural-language shopping request into normalized offers and ranks them by the criteria that matter to the shopper: effective cost, delivery, seller trust, returns, cashback and local pickup.

The architecture is intentionally designed so affiliate revenue **cannot** influence organic offer ranking.

## What is implemented

- Next.js App Router PWA with responsive mobile-first UI
- natural-language shopping-intent parser
- canonical product model and identifier-confidence matching
- normalized `Offer` model and true-cost calculation
- user-selectable ranking presets plus normalized custom priority sliders
- concurrent connector orchestration with partial-failure behavior
- demo connector for development only
- eBay Browse API connector with OAuth and optional EPN campaign context
- approved generic JSON product/affiliate feed connector
- tamper-resistant, expiring outbound click tokens
- first-party referral attribution cookie
- Supabase magic-link account flow
- signup referral-edge attribution
- Supabase schema + RLS
- append-only commission/reward ledger enforcement
- deterministic, merchant-policy-aware commission allocation
- rewards and referral dashboards
- persistent target-price alerts with protected scheduled re-checks and in-app notifications
- normalized, authenticated affiliate transaction ingestion with idempotent allocations/reversals
- barcode scanner with manual fallback
- connector-health operations view
- official MCP v2 stdio server exposing safe read/calculation tools
- agent personas and reusable skill files
- CI and Vercel config
- launch/integration/security documentation

## Safety and business rules built into code

1. Affiliate commission is not a ranking input.
2. Recruitment by itself earns $0.
3. Second-level referral compensation is disabled by default.
4. Cashback/sub-affiliate allocations only occur when a merchant program is configured to permit them.
5. Financial history is append-only; reversals are new ledger events.
6. Demo results do not run in production unless explicitly enabled.
7. A failed retailer connector does not destroy results from working connectors.
8. Strong conflicting product identifiers prevent automatic product merging.

## Repository

```text
apps/
  web/          Next.js PWA
  mcp-server/   MCP v2 stdio server
packages/
  core/         product, money, ranking, matching, commissions
  connectors/   retailer/feed integrations and orchestration
supabase/
  migrations/   database, RLS, ledger protections
agents/         agent-role definitions
.agents/skills/ reusable implementation skills
docs/           architecture and launch guidance
```

## Local setup

Requirements:

- Node.js 22+
- npm
- Supabase account for persistent user/reward features
- retailer/affiliate credentials only for integrations you are approved to use

```bash
./scripts/setup.sh
npm run dev
```

`setup.sh` creates `apps/web/.env.local` and `apps/mcp-server/.env.local` from the root `.env.example`. Edit the web file for the PWA and the MCP file when running the standalone MCP server.

Open `http://localhost:3000`.

Without external credentials, development mode uses clearly marked demo retailer results so the entire UI/ranking/clickout path can be exercised. Production does **not** enable demo results unless `ENABLE_DEMO_CONNECTOR=true` is explicitly set.

## Supabase

Create a Supabase project and apply:

```text
supabase/migrations/001_initial.sql
```

Then set:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
AFFILIATE_INGEST_SECRET=
```

The service-role key must remain server-only.

## Clickout signing

Generate a strong secret and configure:

```text
RIGHTPRICE_CLICKOUT_SECRET=
```

RightPrice signs offer ID, retailer ID, destination, issue time and expiry. The clickout endpoint refuses malformed, modified, expired or non-HTTP(S) destinations.

## eBay

After obtaining approved credentials:

```text
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_MARKETPLACE_ID=EBAY_US
ENABLE_EBAY_CONNECTOR=true
```

For EPN monetization, configure `EBAY_CAMPAIGN_ID` only after the affiliate program setup is approved for the intended use.

## Generic approved feed

A simple JSON feed can unlock additional approved merchants quickly:

```text
ENABLE_GENERIC_FEED=true
GENERIC_FEED_URL=https://merchant.example/feed.json
GENERIC_FEED_NAME=Merchant Name
```

Default feed field names are:

```json
{
  "id": "...",
  "title": "...",
  "price": 99.99,
  "shipping": 0,
  "cashback": 2.5,
  "url": "https://...",
  "affiliateUrl": "https://...",
  "imageUrl": "https://...",
  "brand": "...",
  "upc": "...",
  "seller": "..."
}
```

Production network adapters should map their own feed schema to the same canonical connector contract.

## MCP server

The MCP app exposes deterministic RightPrice tools without granting financial mutation capabilities:

- `parse_search_intent`
- `search_offers`
- `connector_health`
- `calculate_commission_allocation`

Run after installing dependencies:

```bash
npm --workspace @rightprice/mcp-server start
```

Financial writes, payout creation and administrative mutations are deliberately not exposed to an unauthenticated local MCP tool surface.

## Verification

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

The pure core tests can run on Node 22 even before third-party packages are installed:

```bash
npm run test
```

## Production activation order

1. Deploy the PWA with demo connector disabled.
2. Connect Supabase and verify RLS.
3. Configure a strong clickout signing secret.
4. Activate one approved live commerce source.
5. Verify real search -> signed clickout -> affiliate attribution.
6. Map that network's signed webhook/feed event into the protected normalized `/api/internal/affiliate-transactions` contract.
7. Confirm a real pending -> confirmed -> ledger allocation -> reversal test end-to-end.
8. Only then enable consumer cashback/referral payouts for programs that explicitly permit the mechanism.
9. Add more connectors through the same contract.

See `docs/DEPLOYMENT.md`, `docs/LAUNCH_CHECKLIST.md` and `docs/INTEGRATIONS.md`.
