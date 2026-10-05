-- RightPrice v1 shopping lists, shareable creator collections, and explicit Data API grants.
-- This migration is designed for Supabase's 2026 explicit table-exposure behavior.

-- Trigger helper functions should not be callable as public RPC endpoints.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.prevent_ledger_mutation() from public, anon, authenticated;

alter table public.profiles
  add column if not exists handle text,
  add column if not exists bio text;
create unique index if not exists profiles_handle_unique_idx on public.profiles(lower(handle)) where handle is not null;

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  is_public boolean not null default false,
  share_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (share_slug is null or share_slug ~ '^[a-zA-Z0-9_-]{6,80}$')
);
create index if not exists shopping_lists_user_idx on public.shopping_lists(user_id, updated_at desc);
create index if not exists shopping_lists_public_idx on public.shopping_lists(share_slug) where is_public = true;

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  title text not null,
  query text not null,
  retailer_id text,
  retailer_name text,
  external_offer_id text,
  snapshot_total numeric(14,2),
  snapshot_effective numeric(14,2),
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists shopping_list_items_list_idx on public.shopping_list_items(list_id, created_at);

alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;

create policy "lists owner read"
on public.shopping_lists for select to authenticated
using ((select auth.uid()) = user_id);

create policy "lists public read"
on public.shopping_lists for select to anon, authenticated
using (is_public = true and share_slug is not null);

create policy "lists owner insert"
on public.shopping_lists for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "lists owner update"
on public.shopping_lists for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "lists owner delete"
on public.shopping_lists for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "list items owner read"
on public.shopping_list_items for select to authenticated
using (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = (select auth.uid())));

create policy "list items public read"
on public.shopping_list_items for select to anon, authenticated
using (exists (select 1 from public.shopping_lists l where l.id = list_id and l.is_public = true and l.share_slug is not null));

create policy "list items owner insert"
on public.shopping_list_items for insert to authenticated
with check (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = (select auth.uid())));

create policy "list items owner update"
on public.shopping_list_items for update to authenticated
using (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = (select auth.uid())))
with check (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = (select auth.uid())));

create policy "list items owner delete"
on public.shopping_list_items for delete to authenticated
using (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = (select auth.uid())));

-- Supabase is moving all projects to explicit Data API grants. Make access intentional.
grant usage on schema public to anon, authenticated;

-- Public catalog: RLS still decides which rows are visible.
grant select on public.products, public.product_identifiers, public.offers, public.offer_snapshots, public.retailers to anon, authenticated;

-- Signed-in self-service surfaces.
grant select on public.profiles to authenticated;
grant select, update on public.user_preferences to authenticated;
grant select, insert, update, delete on public.saved_searches, public.price_alerts to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.referral_edges, public.affiliate_transactions, public.ledger_events, public.payouts to authenticated;
grant select, insert, update, delete on public.shopping_lists, public.shopping_list_items to authenticated;

-- Public shared collections are read through RLS.
grant select on public.shopping_lists, public.shopping_list_items to anon;

-- Sensitive/system tables are never client-accessible.
revoke all on public.affiliate_programs, public.affiliate_clicks, public.fraud_events, public.connector_runs, public.audit_events from anon, authenticated;

insert into public.retailers (id, name, website_url, enabled, affiliate_enabled, connector_type, compliance_status)
values
  ('impact', 'Impact merchant network', 'https://impact.com', false, false, 'feed', 'review_required'),
  ('cj', 'CJ merchant network', 'https://www.cj.com', false, false, 'feed', 'review_required'),
  ('awin', 'Awin merchant network', 'https://www.awin.com', false, false, 'feed', 'review_required'),
  ('rakuten', 'Rakuten Advertising merchant network', 'https://rakutenadvertising.com', false, false, 'feed', 'review_required'),
  ('partnerize', 'Partnerize merchant network', 'https://partnerize.com', false, false, 'feed', 'review_required'),
  ('wish', 'Wish', 'https://www.wish.com', false, false, 'feed', 'review_required'),
  ('aliexpress', 'AliExpress', 'https://www.aliexpress.com', false, false, 'feed', 'review_required'),
  ('bestbuy', 'Best Buy', 'https://www.bestbuy.com', false, false, 'feed', 'review_required'),
  ('target', 'Target', 'https://www.target.com', false, false, 'feed', 'review_required'),
  ('newegg', 'Newegg', 'https://www.newegg.com', false, false, 'feed', 'review_required'),
  ('homedepot', 'The Home Depot', 'https://www.homedepot.com', false, false, 'feed', 'review_required'),
  ('lowes', 'Lowe''s', 'https://www.lowes.com', false, false, 'feed', 'review_required'),
  ('etsy', 'Etsy', 'https://www.etsy.com', false, false, 'feed', 'review_required')
on conflict (id) do nothing;
