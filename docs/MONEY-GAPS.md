# RightPrice MONEY-GAP Report

Date: 2026-10-09
Auditor: OpenClaw money-mode subagent
Baseline: commit `f32bcec` (feat: ingest production affiliate product feeds #6)
Verification: **18/18 unit tests pass · typecheck clean (all 4 packages) · production build succeeds · 0 lint errors (2 warnings)**

---

## 1. Current state — what exists and works

RightPrice is an unusually complete commerce-comparison MVP. The money plumbing is architecturally done; what is missing is **live inventory with affiliate tracking attached**, plus the **persistence and acquisition layers** that turn a search tool into an earning asset.

### Fully implemented and verified

| Area | Status | Evidence |
|---|---|---|
| Next.js PWA (mobile-first, installable, offline) | ✅ | `apps/web`, SW + manifest, CI smoke-tests 15 routes |
| Natural-language intent parser | ✅ | `packages/core/src/search-intent.ts` + tests |
| Deal-ranking engine (6 presets + custom sliders) | ✅ | `ranking.ts` — **commission explicitly excluded from ranking** (test-enforced) |
| Product matching (UPC/GTIN confidence merge) | ✅ | `product-match.ts` + tests |
| True-cost math (multi-currency safe) | ✅ | `money.ts` + tests |
| eBay Browse API connector (OAuth, EPN campaign slot) | ✅ | `packages/connectors/src/ebay.ts` — disabled until creds |
| Generic JSON feed connector (JSON/JSONL/CSV/TSV/gzip, field mapping, 17 network presets incl. Awin pre-map) | ✅ | `generic-json-feed.ts` + tests (merged in PR #6) |
| Connector orchestration with partial-failure isolation | ✅ | `orchestrator.ts` — one dead connector never kills results |
| Signed, expiring clickout tokens (HMAC-SHA256, timing-safe) | ✅ | `lib/server/clickout.ts` |
| Click attribution (referral cookie, IP hash, UA) | ✅ | `api/clickout/route.ts`, `record-click.ts` |
| Supabase auth (magic link) + schema + RLS | ✅ | 2 migrations, append-only ledger trigger |
| Affiliate transaction ingestion (idempotent, allocation, reversals, program-approval gate) | ✅ | `api/internal/affiliate-transactions/route.ts` |
| Deterministic commission allocation (cents-safe, policy-gated, reversal-correct) | ✅ | `commission.ts` + tests |
| Rewards/referral dashboards | ✅ | `/rewards`, `/referrals` + API |
| Price alerts (cron re-check, throttle, dedupe, in-app notify) | ✅ | `api/cron/price-alerts/route.ts` |
| MCP v2 server (4 safe read/calc tools) | ✅ | `apps/mcp-server` |
| FTC affiliate disclosure page + API disclosure string | ✅ | `/disclosure`, every search payload |
| CI: test + typecheck + lint + build + production HTTP smoke | ✅ | `.github/workflows/ci.yml` |

### The one-sentence diagnosis

> **RightPrice can take a dollar the moment a live, approved affiliate source is connected — but today it has zero live sources, and its search results are transient (nothing is persisted), so it also cannot compound SEO, price history, or deal scoring yet.**

---

## 2. Gap map — what exists vs. what's needed to take a dollar

| # | Capability | Today | Needed for first dollar | Gap class |
|---|---|---|---|---|
| 1 | Live product inventory | Mock demo only (disabled in prod) | ≥1 approved live source | **BLOCKED — Steve's accounts** |
| 2 | Affiliate program approvals | None configured | eBay EPN + 1 network minimum | **BLOCKED — Steve's approvals** |
| 3 | Click → conversion tracking loop | Built, needs live network webhooks | Wire each network's real webhook | **BLOCKED — Steve's accounts** (we build the mapper) |
| 4 | Offer persistence / price history | Schema only — `offers`, `offer_snapshots` tables **exist but nothing writes them** | Persist search results → history → deal scoring | **BUILDABLE NOW** |
| 5 | SEO landing pages | 13 static routes only; zero product/category pages | Crawlable offer + product pages, dynamic sitemap | **BUILDABLE NOW** |
| 6 | Analytics/monitoring | None (launch checklist flags it) | Privacy-friendly analytics + error alerting | **BUILDABLE NOW** |
| 7 | Rate limiting | None on search/clickout | Edge/app rate limits (checklist item) | **BUILDABLE NOW** |
| 8 | Payout rails | Schema + lifecycle ready; zero Stripe code | Stripe Connect for cashback/referral payouts | **BLOCKED — Steve's Stripe account** |
| 9 | Cashback/referral enablement | Code complete, flag-gated off | Program terms recorded + `ENABLE_*` flags flipped | **BLOCKED — program terms** |
| 10 | E2E / a11y / Lighthouse CI | Not present | Guard launch quality | **BUILDABLE NOW** |

---

## 3. Ranked work plan

### TIER 0 — Build now, zero Steve-input, pure engineering

Ordered by revenue leverage:

1. **Offer persistence pipeline** (unlocks the most downstream value).
   After each search, upsert `products` / `product_identifiers` / `offers` and insert `offer_snapshots` rows. This single change activates: price-history charts, "is this a real deal?" scoring (the deals page already advertises this), re-engagement alerts from stored data, and the raw material for SEO pages.
   Files: `apps/web/src/app/api/search/route.ts` post-search, or a fire-and-forget server helper. Idempotent on `(retailer_id, external_offer_id)`.

2. **SEO landing pages + dynamic sitemap.**
   `/product/[slug]` pages from persisted products (price range, retailer count, price-history sparkline, current best offer), `/category/[slug]` hubs, sitemap generated from DB with `expires_at` awareness. This is the organic acquisition engine — today it does not exist at all.

3. **Analytics + error alerting.** Vercel Analytics or Plausible + Sentry (or self-hosted equivalents). Without this, conversion funnel on the money path (search → clickout → sale) is invisible.

4. **Rate limiting** on `/api/search` and `/api/clickout` (per launch checklist). Protects affiliate-link reputation and infra cost.

5. **E2E smoke (Playwright) + Lighthouse CI budget.** The HTTP smoke exists; add clickout-token E2E and Core Web Vitals budget so money-path regressions can't ship.

### TIER 1 — Steve creates accounts (we do the wiring)

6. **eBay Browse API + eBay Partner Network** — the single highest-leverage activation. One developer account + one EPN enrollment unlocks ~1.5 billion live listings through a connector that is already built, tested, and has an `EBAY_CAMPAIGN_ID` slot waiting. Expect a few hours of Steve's time; minutes of ours.

7. **Wire the real conversion webhook/feed** from the activated network into the protected normalized `/api/internal/affiliate-transactions` contract (the mapper is network-specific; the ingestion route, allocation, ledger, and reversal logic are already done and idempotent).

8. **One more network via the generic feed** (Awin is pre-mapped — see INTEGRATIONS.md). Multiplies merchant coverage without new code.

9. **Stripe Connect** for payouts (schema/lifecycle ready; integration deliberately not activated without Steve's Stripe account).

### TIER 2 — After first confirmed commission

10. Flip `ENABLE_CASHBACK` / referral flags for programs whose terms explicitly permit it; record terms in `affiliate_programs`.
11. Amazon PA-API (see chicken-egg warning below).
12. App-store distribution of the PWA (TWA), deal newsletters from price-history data.

---

## 4. Steve's approval checklist (exact signups, in priority order)

### ▶ FIRST: eBay (one account pair, biggest coverage)

- [ ] **eBay Developer Program** — create app, get Client ID + Secret (server-only).
      https://developer.ebay.com/ → sign in → Application Keys → create an app under "Browse API" scope.
- [ ] **eBay Partner Network (EPN)** — join, get Campaign ID, configure allowed placement (your domain).
      https://www.ebaypartnernetwork.com/ → Sign Up. Approval typically 1–3 business days.
- [ ] Give us: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_CAMPAIGN_ID` → we set `ENABLE_EBAY_CONNECTOR=true` and verify live search → signed clickout → EPN attribution.

### ▶ SECOND: one affiliate network for feed-based merchants

- [ ] **Awin** (pre-mapped in code): https://www.awin.com/us → "Join as a Publisher". $5 refundable verification deposit. Then apply to specific advertiser programs inside Awin.
- [ ] **Impact** (hosts Walmart, Temu, Best Buy, Target, Home Depot, Lowe's, Etsy programs): https://app.impact.com join as a brand partner/publisher.
- [ ] **CJ Affiliate**: https://www.cj.com/publisher → signup. Strong in retail.
- [ ] **ShareASale** (Awin-owned, US retail depth): https://www.shareasale.com/signup.cfm
- [ ] **Rakuten Advertising**: https://rakutenadvertising.com/ — note: downloadable-software/AI-assistant review may apply to app/extension placements.
- [ ] **Partnerize**: https://partnerize.com/

Each network account → advertiser approvals → we map that network's feed columns (already supported via `<PREFIX>_FIELD_*` env overrides) and set `*_FEED_URL` + `*_ENABLED=true`.

### ▶ THIRD: payouts (only when cashback/rewards go live)

- [ ] **Stripe**: https://dashboard.stripe.com/register → then Connect onboarding for payout capability.

### ▶ Amazon — special warning (chicken-egg + strict terms)

- [ ] **Amazon Associates**: https://affiliate-program.amazon.com/ — you must generate **3 qualifying sales within 180 days** before Product Advertising API (PA-API) access is granted, and Amazon's Operating Agreement heavily restricts comparison/aggregation presentation. The repo already enforces a double gate (`AMAZON_ENABLED` + `AMAZON_COMPARISON_APPROVED`) — **do not enable the second flag until the comparison use is actually authorized.** Treat Amazon as a Tier-2 play.

### Server-side secrets Steve must also generate/set (5 minutes)

- [ ] `RIGHTPRICE_CLICKOUT_SECRET` (strong random)
- [ ] `CRON_SECRET`
- [ ] `AFFILIATE_INGEST_SECRET`
- [ ] Supabase: project URL, publishable key, service-role key
- [ ] Vercel project for `apps/web` with "include source outside root directory" enabled

---

## 5. Bottom line

**The engineering is ~90% done; the business activation is ~0% done.** The repo passes every check (tests, typecheck, build, smoke) and enforces unusually good compliance hygiene (commission-blind ranking, append-only ledger, program-term gates, FTC disclosure). The shortest path to first revenue:

1. Steve: eBay Developer + EPN signup (this week).
2. Us: wire creds, verify live search → clickout → attribution loop end-to-end.
3. Us (parallel, no Steve needed): offer persistence + SEO pages so traffic compounds while approvals pend.
4. Steve: one feed network (Awin or Impact) for merchant breadth.
5. First confirmed commission → flip cashback flags per terms → Stripe Connect for payouts.
