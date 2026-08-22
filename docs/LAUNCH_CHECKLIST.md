# Launch checklist

- [ ] Replace demo-only search with at least two approved live commerce sources.
- [ ] Configure a strong `RIGHTPRICE_CLICKOUT_SECRET`.
- [ ] Apply and review Supabase RLS migrations.
- [ ] Verify outbound URLs cannot be tampered with.
- [ ] Verify affiliate disclosures on every monetized result surface.
- [ ] Confirm each merchant's current cashback/referral/sub-affiliate rules.
- [ ] Configure `AFFILIATE_INGEST_SECRET` and map each approved network webhook/feed into normalized idempotent ingestion.
- [ ] Configure `CRON_SECRET` and verify the scheduled price-alert endpoint rejects unauthorized calls.
- [ ] Reconcile a real test transaction end-to-end before enabling user rewards.
- [ ] Add rate limiting to public search/clickout at deployment edge or application layer.
- [ ] Add error/analytics provider and alerting.
- [ ] Run accessibility, mobile, E2E and Lighthouse checks.
- [ ] Generate and commit a dependency lockfile in the connected development environment.
