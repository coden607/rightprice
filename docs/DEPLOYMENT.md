# Deployment

## Vercel

RightPrice is an npm-workspaces monorepo. Import the repository as a monorepo project and select `apps/web` as the Vercel project's Root Directory. Because the web app imports `packages/core` and `packages/connectors`, enable Vercel's **Include source files outside of the Root Directory in the Build Step** option for the project.

The web application's `apps/web/vercel.json` contains the protected daily price-alert cron route. Configure `CRON_SECRET`; Vercel sends the configured secret to protected cron requests when the project is configured according to its Cron Jobs guidance.

Configure at least:

```text
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RIGHTPRICE_CLICKOUT_SECRET=
CRON_SECRET=
AFFILIATE_INGEST_SECRET=
```

Then add only retailer/network credentials for programs that are approved for the intended use.

Keep `ENABLE_DEMO_CONNECTOR=false` in production. Keep `ENABLE_CASHBACK=false` until a live program is configured with explicit cashback permission and a tested reward rule. Keep `ENABLE_LEVEL_TWO_REFERRALS=false` unless the compensation model and applicable program terms have separately been approved.

## Supabase

Apply `supabase/migrations/001_initial.sql` before enabling account, referral, reward, alert, or commission-ingestion features. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## GitHub CI

The repository includes `.github/workflows/ci.yml`. Generate and commit a lockfile on a networked development machine, then switch CI dependency installation from `npm install` to `npm ci` for reproducible builds.
