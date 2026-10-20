# Affiliate onboarding — click/approve checklist

RightPrice is technically prepared to ingest approved affiliate feeds and preserve affiliate deep links. This file keeps the remaining human approval steps short and consistent.

## Current operating rule

Do not enable a network until its account is approved and the required feed/API credentials are present. Program signup, identity/tax verification, payout setup, and acceptance of network terms must be completed by the account holder.

## Reusable application answers

Use the deployed RightPrice URL from `NEXT_PUBLIC_APP_URL`.

**Site / property type**

Price-comparison and shopping-discovery web application.

**Promotional-space description**

> RightPrice is a shopper-first price-comparison PWA that helps users compare product price, shipping, seller trust, returns, and cashback where permitted across approved retailers. Affiliate compensation never changes organic ranking.

**Primary audience**

Online shoppers looking for the best overall purchase option based on price, shipping speed, seller quality, and other user-selected criteria.

**Promotion methods**

- RightPrice website/PWA
- Search and product-comparison pages
- Editorial/deal discovery pages
- Direct product clickouts using each network's approved tracking links

Do not select traffic sources or promotional methods that RightPrice does not actually use.

**Affiliate disclosure**

RightPrice may earn a commission when a shopper buys through an eligible retailer link. Commission does not affect the organic ranking of offers.

## Network order

1. eBay Partner Network — developer account exists; partner application status is tracked separately.
2. impact.com — application status is tracked separately.
3. Awin — strong fit for product feeds and price comparison.
4. CJ Affiliate — product-feed/API path.
5. Walmart — retailer affiliate feed path.
6. Temu — affiliate/deal-sharing path.
7. Partnerize.
8. Rakuten Advertising.
9. Amazon Associates — comparison use remains blocked until current program eligibility and comparison/API use are confirmed.
10. AliExpress.
11. Best Buy.
12. Target.
13. Newegg.
14. The Home Depot.
15. Lowe's.
16. Etsy.
17. Wish.

## What RightPrice needs after approval

For eBay:

```text
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_CAMPAIGN_ID=
ENABLE_EBAY_CONNECTOR=true
```

For feed-based networks:

```text
<PREFIX>_FEED_URL=
<PREFIX>_FORMAT=auto
<PREFIX>_AUTH_HEADER=
<PREFIX>_AUTH_TOKEN=
<PREFIX>_ENABLED=true
```

Only set `*_ALLOWS_CASHBACK=true` when the specific program permits cashback/sub-affiliate allocation.

## 25-item anticipated revenue wave

The implementation should progress in this order:

1. Affiliate program registry.
2. Program priority ordering.
3. Official program links.
4. Program-status environment markers.
5. Pending-approval state.
6. Needs-credentials state.
7. Configured-but-disabled state.
8. Monetizing state.
9. Amazon comparison hard gate.
10. eBay direct Browse API readiness.
11. Feed-network readiness.
12. Exact missing-env diagnostics.
13. Revenue launch-gate summary.
14. Signed clickout readiness.
15. Supabase attribution/reward readiness.
16. Affiliate transaction-ingest readiness.
17. Cron/price-alert readiness.
18. Canonical production URL readiness.
19. Demo-inventory production guard.
20. Admin onboarding dashboard.
21. Readiness API.
22. Reusable affiliate application copy.
23. Affiliate-disclosure consistency check.
24. Post-approval connector health verification.
25. First real click -> tracked conversion -> commission-ledger smoke test.

Items 1-23 are technical/preparation work that can be completed before network approval. Items 24-25 require at least one approved live affiliate source.
