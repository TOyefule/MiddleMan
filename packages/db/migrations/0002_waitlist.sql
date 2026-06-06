-- waitlist_entries: public lead capture table for MiddleMan and Sentinel pre-launch
-- No RLS auth required for inserts — submissions are unauthenticated.
-- Only service_role (backend/admin) can SELECT.

create type waitlist_product as enum ('middleman', 'sentinel');

create table waitlist_entries (
  id            uuid primary key default gen_random_uuid(),
  product       waitlist_product not null,
  email         text not null,
  first_name    text,
  tier          text not null,
  -- MiddleMan qualification
  sub_count       text,
  monthly_spend   text,
  -- Sentinel qualification
  company_name    text,
  role            text,
  company_size    text,
  saas_tool_count text,
  biggest_challenge text,
  -- Attribution
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  created_at    timestamptz not null default now()
);

create unique index waitlist_product_email_idx on waitlist_entries (product, email);
create index waitlist_product_tier_idx        on waitlist_entries (product, tier);
create index waitlist_created_at_idx          on waitlist_entries (created_at);

-- RLS: allow anonymous INSERT, block SELECT/UPDATE/DELETE for non-service roles
alter table waitlist_entries enable row level security;

create policy "waitlist_insert_anon"
  on waitlist_entries
  for insert
  to anon, authenticated
  with check (true);
