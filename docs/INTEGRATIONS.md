# Integration activation checklist

## eBay

1. Create/choose an eBay developer application.
2. Add `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` as server-only secrets.
3. Complete eBay Partner Network enrollment separately if monetizing.
4. Add `EBAY_CAMPAIGN_ID` only after approval.
5. Set `ENABLE_EBAY_CONNECTOR=true`.
6. Verify `/api/health` and a live `/api/search` result.
7. Confirm affiliate link behavior against current EPN terms before production traffic.

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

Before enabling cashback, referrals or sub-affiliate revenue for any merchant, record program permissions in `affiliate_programs`. Do not infer one merchant's permissions from another's.
