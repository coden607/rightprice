# Integration activation checklist

RightPrice must only enable a supplier or network after the intended use is allowed by that program. A configured connector is a technical capability, not evidence of affiliate approval.

## Coverage strategy

RightPrice has two integration paths:

1. **Direct APIs**, when a retailer exposes an approved API suited to product discovery/comparison. eBay Browse is the first direct implementation.
2. **Approved normalized feeds/gateways**, for retailers and affiliate networks whose access is supplied through product feeds, network exports, publisher APIs, or account-specific endpoints.

The normalized feed path now supports multi-merchant networks and the following named configuration gates:

- Impact
- CJ
- Awin
- Rakuten Advertising
- Partnerize
- Walmart
- Temu
- Wish
- Amazon (comparison-approval gate required)
- AliExpress
- Best Buy
- Target
- Newegg
- The Home Depot
- Lowe's
- Etsy

Disabled integrations perform no network calls.

## Normalized feed contract

An approved feed/gateway should return an array, or an object containing `items`, `products`, `offers`, or `results`.

Each row uses the canonical fields below:

```json
{
  "id": "merchant-product-id",
  "title": "Product title",
  "price": 99.99,
  "shipping": 0,
  "cashback": 0,
  "url": "https://merchant.example/product",
  "affiliateUrl": "https://approved-tracking.example/...",
  "imageUrl": "https://...",
  "brand": "Brand",
  "upc": "012345678905",
  "seller": "Seller name",
  "retailerId": "merchant-slug",
  "retailerName": "Merchant display name"
}
```

`retailerId` and `retailerName` are optional. They are especially useful for network feeds containing offers from many merchants.

A feed may be either:

- a bulk feed, which RightPrice filters locally, or
- a search gateway. Set `<PREFIX>_QUERY_PARAM` (for example `q`) and RightPrice forwards the shopper's query to that endpoint.

If an approved endpoint requires one HTTP authentication header, configure `<PREFIX>_AUTH_HEADER` and `<PREFIX>_AUTH_TOKEN`. Tokens remain server-only.

## eBay

1. Create/choose an eBay developer application.
2. Add `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` as server-only secrets.
3. Complete eBay Partner Network enrollment separately if monetizing.
4. Add `EBAY_CAMPAIGN_ID` only after approval.
5. Set `ENABLE_EBAY_CONNECTOR=true`.
6. Verify `/api/health` and a live `/api/search` result.
7. Keep product/catalog work on current Browse/Catalog/Metadata APIs; do not reintroduce the retired Finding/Shopping/Product calls.
8. Normalize eBay apparel/footwear size values before canonical variant matching.

## Amazon

Amazon is deliberately double-gated:

```text
AMAZON_ENABLED=true
AMAZON_COMPARISON_APPROVED=true
```

Both are required before RightPrice will activate the configured Amazon feed connector. `AMAZON_COMPARISON_APPROVED` must only be enabled when the intended comparison/aggregation use is actually authorized under the applicable Amazon program terms.

## Rakuten Advertising

Treat RightPrice installable/mobile/extension-style implementations as requiring the applicable downloadable-software/AI-shopping-assistant review before Rakuten tracking is enabled. Keep any advertiser-specific approval requirements as separate program records.

## Affiliate networks

Impact, CJ, Awin, Rakuten Advertising and Partnerize can unlock many merchants through one normalized connector while preserving each row's retailer identity. Do not assume network membership means every advertiser permits every placement, cashback mechanism, sub-affiliate arrangement, or promotional method.

## Walmart, Temu, Wish and other retailers

Use the retailer's approved publisher feed/API or an authorized network feed. Do not substitute unofficial scraping when an authorized route is required. Keep cashback and referral-sharing off until the specific program permissions are recorded.

## Supabase

1. Create project.
2. Apply `supabase/migrations/001_initial.sql`.
3. Add public URL/publishable key.
4. Add service-role key server-side only.
5. Configure Auth redirect URL to `<APP_URL>/auth/callback` when account UI is enabled.
6. Review RLS with production roles before launch.

## Stripe payouts

Payout integration is intentionally not activated without an approved Stripe product/account configuration. The schema and reward lifecycle are ready; provider onboarding and payout creation must use Stripe-hosted/tokenized collection, never raw bank credentials stored by RightPrice.

## Merchant/network rule gate

Before enabling cashback, referrals, sub-affiliate revenue, creator links, software distribution, or automated promotions for any merchant, record the program permissions in `affiliate_programs`. Do not infer one merchant's permissions from another's.


## Feed formats and field mapping

The approved-feed connector accepts JSON, JSONL/NDJSON, CSV, TSV/TAB and gzip-compressed versions of those formats. Format is auto-detected from the URL/content when possible.

Every network/retailer prefix supports:

```text
<PREFIX>_FORMAT=auto|json|jsonl|csv|tsv
<PREFIX>_FIELD_ID=
<PREFIX>_FIELD_TITLE=
<PREFIX>_FIELD_PRICE=
<PREFIX>_FIELD_SHIPPING=
<PREFIX>_FIELD_CASHBACK=
<PREFIX>_FIELD_URL=
<PREFIX>_FIELD_AFFILIATE_URL=
<PREFIX>_FIELD_IMAGE_URL=
<PREFIX>_FIELD_BRAND=
<PREFIX>_FIELD_UPC=
<PREFIX>_FIELD_SELLER=
<PREFIX>_FIELD_RETAILER_ID=
<PREFIX>_FIELD_RETAILER_NAME=
```

This lets an approved network catalog be connected without changing application code when its column names differ from RightPrice's canonical schema. Dotted JSON paths are supported for nested JSON fields.

### Awin preset

Awin publisher product feeds are pre-mapped to the documented comparison-feed columns:

```text
aw_product_id       -> id
product_name        -> title
search_price        -> price
delivery_cost       -> shipping
merchant_deep_link  -> source URL
aw_deep_link        -> affiliate URL
merchant_image_url  -> image
brand_name          -> brand
upc                  -> UPC
merchant_id          -> retailer ID
merchant_name        -> retailer name
```

Set `AWIN_FEED_URL`, `AWIN_ENABLED=true`, and any required auth token after the publisher account has access to the desired advertiser feeds. Field overrides remain available if a particular feed uses different columns.
