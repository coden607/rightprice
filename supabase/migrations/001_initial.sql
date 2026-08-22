-- RightPrice initial production schema
-- Apply with Supabase CLI or SQL editor after reviewing environment-specific settings.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  referral_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  price_weight numeric(5,4) not null default 0.40 check (price_weight between 0 and 1),
  delivery_weight numeric(5,4) not null default 0.20 check (delivery_weight between 0 and 1),
  trust_weight numeric(5,4) not null default 0.15 check (trust_weight between 0 and 1),
  returns_weight numeric(5,4) not null default 0.10 check (returns_weight between 0 and 1),
  cashback_weight numeric(5,4) not null default 0.10 check (cashback_weight between 0 and 1),
  local_weight numeric(5,4) not null default 0.05 check (local_weight between 0 and 1),
  updated_at timestamptz not null default now()
);

create table if not exists public.retailers (
  id text primary key,
  name text not null,
  website_url text,
  enabled boolean not null default false,
  affiliate_enabled boolean not null default false,
  connector_type text not null,
  compliance_status text not null default 'review_required' check (compliance_status in ('approved','review_required','blocked')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_programs (
  id uuid primary key default gen_random_uuid(),
  retailer_id text not null references public.retailers(id) on delete cascade,
  network text not null,
  external_program_id text,
  allows_cashback boolean not null default false,
  allows_subaffiliate boolean not null default false,
  max_referral_depth smallint not null default 0 check (max_referral_depth between 0 and 5),
  terms_url text,
  terms_checked_at timestamptz,
  status text not null default 'pending' check (status in ('pending','approved','paused','rejected')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (retailer_id, network, external_program_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  normalized_title text not null,
  brand text,
  model text,
  category text,
  image_url text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_normalized_title_idx on public.products using gin (to_tsvector('simple', normalized_title));

create table if not exists public.product_identifiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  identifier_type text not null check (identifier_type in ('gtin','upc','ean','isbn','mpn','sku')),
  identifier_value text not null,
  source text,
  confidence numeric(5,4) not null default 1 check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  unique(identifier_type, identifier_value, product_id)
);
create index if not exists product_identifiers_lookup_idx on public.product_identifiers(identifier_type, identifier_value);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  retailer_id text not null references public.retailers(id) on delete restrict,
  external_offer_id text not null,
  seller_name text,
  seller_rating numeric(7,3),
  condition text not null default 'unknown',
  currency text not null default 'USD',
  item_price numeric(14,2) not null check (item_price >= 0),
  shipping numeric(14,2) not null default 0 check (shipping >= 0),
  estimated_tax numeric(14,2),
  coupon_discount numeric(14,2) not null default 0 check (coupon_discount >= 0),
  cashback numeric(14,2) not null default 0 check (cashback >= 0),
  total_before_cashback numeric(14,2) not null check (total_before_cashback >= 0),
  effective_cost numeric(14,2) not null check (effective_cost >= 0),
  source_url text not null,
  affiliate_url text,
  delivery_min timestamptz,
  delivery_max timestamptz,
  local_pickup boolean not null default false,
  distance_miles numeric(9,2),
  return_days integer,
  warranty_months integer,
  risk_flags jsonb not null default '[]'::jsonb,
  source_timestamp timestamptz not null,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (retailer_id, external_offer_id)
);
create index if not exists offers_product_idx on public.offers(product_id);
create index if not exists offers_retailer_idx on public.offers(retailer_id);
create index if not exists offers_effective_cost_idx on public.offers(effective_cost);

create table if not exists public.offer_snapshots (
  id bigint generated always as identity primary key,
  offer_id uuid not null references public.offers(id) on delete cascade,
  item_price numeric(14,2) not null,
  shipping numeric(14,2) not null,
  effective_cost numeric(14,2) not null,
  available boolean not null default true,
  captured_at timestamptz not null default now()
);
create index if not exists offer_snapshots_offer_time_idx on public.offer_snapshots(offer_id, captured_at desc);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  query text not null,
  intent jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  saved_search_id uuid references public.saved_searches(id) on delete cascade,
  target_price numeric(14,2),
  reference_price numeric(14,2),
  target_percent_drop numeric(7,3),
  local_only boolean not null default false,
  enabled boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  check (product_id is not null or saved_search_id is not null)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  href text,
  dedupe_key text unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_time_idx on public.notifications(user_id, created_at desc);

create table if not exists public.referral_edges (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null unique references public.profiles(id) on delete cascade,
  referral_code text not null,
  attributed_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','invalid','fraud_hold')),
  metadata jsonb not null default '{}'::jsonb,
  check (referrer_user_id <> referred_user_id)
);
create index if not exists referral_edges_referrer_idx on public.referral_edges(referrer_user_id);

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  offer_external_id text not null,
  retailer_id text not null,
  referral_code text,
  attribution_ref text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_clicks_created_idx on public.affiliate_clicks(created_at desc);
create index if not exists affiliate_clicks_referral_idx on public.affiliate_clicks(referral_code) where referral_code is not null;
create index if not exists affiliate_clicks_attribution_ref_idx on public.affiliate_clicks(attribution_ref) where attribution_ref is not null;

create table if not exists public.affiliate_transactions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.affiliate_programs(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  click_id uuid references public.affiliate_clicks(id) on delete set null,
  external_transaction_id text not null,
  order_amount numeric(14,2),
  commission_amount numeric(14,2) not null check (commission_amount >= 0),
  currency text not null default 'USD',
  status text not null check (status in ('tracked','pending','confirmed','hold','payable','paid','reversed','invalid','fraud_hold')),
  occurred_at timestamptz,
  confirmed_at timestamptz,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, external_transaction_id)
);

create table if not exists public.ledger_events (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.affiliate_transactions(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in (
    'affiliate_commission_pending','affiliate_commission_confirmed','buyer_cashback_allocated',
    'referrer_reward_allocated','rightprice_revenue_allocated','return_reversal','fraud_hold',
    'fraud_release','payout','manual_correction'
  )),
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  direction text not null check (direction in ('credit','debit')),
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ledger_events_user_time_idx on public.ledger_events(user_id, created_at desc);
create index if not exists ledger_events_transaction_idx on public.ledger_events(transaction_id);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null,
  external_payout_id text,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'USD',
  status text not null check (status in ('requested','review','processing','paid','failed','canceled')),
  idempotency_key text not null unique,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fraud_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  risk_score numeric(6,5) not null check (risk_score between 0 and 1),
  status text not null default 'open' check (status in ('open','reviewed','cleared','confirmed')),
  signals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.connector_runs (
  id bigint generated always as identity primary key,
  connector_id text not null,
  operation text not null,
  ok boolean not null,
  duration_ms integer,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Prevent mutation/deletion of ledger history. Corrections are new events.
create or replace function public.prevent_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'ledger_events is append-only; create a corrective event instead';
end;
$$;

drop trigger if exists ledger_events_immutable_update on public.ledger_events;
create trigger ledger_events_immutable_update before update on public.ledger_events
for each row execute function public.prevent_ledger_mutation();

drop trigger if exists ledger_events_immutable_delete on public.ledger_events;
create trigger ledger_events_immutable_delete before delete on public.ledger_events
for each row execute function public.prevent_ledger_mutation();

-- New user bootstrap. Referral attribution is deliberately performed separately after validation.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  generated_code text;
begin
  generated_code := upper(substr(replace(new.id::text, '-', ''), 1, 10));
  insert into public.profiles(id, display_name, referral_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), generated_code)
  on conflict (id) do nothing;
  insert into public.user_preferences(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.retailers enable row level security;
alter table public.affiliate_programs enable row level security;
alter table public.products enable row level security;
alter table public.product_identifiers enable row level security;
alter table public.offers enable row level security;
alter table public.offer_snapshots enable row level security;
alter table public.saved_searches enable row level security;
alter table public.price_alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.referral_edges enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.affiliate_transactions enable row level security;
alter table public.ledger_events enable row level security;
alter table public.payouts enable row level security;
alter table public.fraud_events enable row level security;
alter table public.connector_runs enable row level security;
alter table public.audit_events enable row level security;

-- Public shopping catalog is readable. Writes remain server/service-role only.
create policy "products public read" on public.products for select using (true);
create policy "product identifiers public read" on public.product_identifiers for select using (true);
create policy "active offers public read" on public.offers for select using (expires_at is null or expires_at > now());
create policy "offer snapshots public read" on public.offer_snapshots for select using (true);
create policy "retailers public read" on public.retailers for select using (enabled = true);

-- Users may read/update their own profile and preferences.
create policy "profile self read" on public.profiles for select using (auth.uid() = id);
create policy "preferences self read" on public.user_preferences for select using (auth.uid() = user_id);
create policy "preferences self update" on public.user_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "saved searches self all" on public.saved_searches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "price alerts self all" on public.price_alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications self read" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications self update" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Referral participants can read their own relationship, but only trusted server logic creates/changes it.
create policy "referrals participant read" on public.referral_edges for select using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

-- Users see only their own financial records. All writes are server-side.
create policy "transactions self read" on public.affiliate_transactions for select using (auth.uid() = user_id);
create policy "ledger self read" on public.ledger_events for select using (auth.uid() = user_id);
create policy "payout self read" on public.payouts for select using (auth.uid() = user_id);

-- No direct client policies on affiliate_clicks, connector_runs, audit_events or affiliate_programs.
-- Those tables are intentionally service-role/admin controlled.

insert into public.retailers (id, name, website_url, enabled, affiliate_enabled, connector_type, compliance_status)
values
  ('mock', 'Demo retailers', null, true, false, 'mock', 'approved'),
  ('ebay', 'eBay', 'https://www.ebay.com', false, false, 'api', 'review_required'),
  ('walmart', 'Walmart', 'https://www.walmart.com', false, false, 'feed', 'review_required'),
  ('temu', 'Temu', 'https://www.temu.com', false, false, 'affiliate', 'review_required'),
  ('amazon', 'Amazon', 'https://www.amazon.com', false, false, 'api', 'review_required')
on conflict (id) do nothing;
