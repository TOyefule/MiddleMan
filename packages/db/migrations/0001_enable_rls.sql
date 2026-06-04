-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security policies for MiddleMan.
-- Run AFTER drizzle-kit generates and applies the schema migration.
-- ─────────────────────────────────────────────────────────────────────────────
-- Auth model:
--   • Consumer requests use the `authenticated` role, with a Clerk-issued JWT.
--     The JWT carries `sub` = Clerk user_id, mapped to public.users.clerk_user_id.
--   • Admin app uses the same `authenticated` role; admin privilege is determined
--     by membership in public.admins with is_active = true.
--   • Background jobs / webhooks use the `service_role` and bypass RLS entirely.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  );
$$;

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select id from public.users
  where clerk_user_id = public.current_clerk_user_id();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.admins
    where clerk_user_id = public.current_clerk_user_id()
      and is_active = true
  );
$$;

-- ─── Enable RLS on every table (deny by default) ───────────────────────────
alter table public.users                    enable row level security;
alter table public.kyc_profiles             enable row level security;
alter table public.payment_methods          enable row level security;
alter table public.providers                enable row level security;
alter table public.provider_plans           enable row level security;
alter table public.subscriptions            enable row level security;
alter table public.virtual_cards            enable row level security;
alter table public.charges                  enable row level security;
alter table public.bills                    enable row level security;
alter table public.bill_line_items          enable row level security;
alter table public.ledger_entries           enable row level security;
alter table public.dunning_attempts         enable row level security;
alter table public.notifications            enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.cancellation_requests    enable row level security;
alter table public.admins                   enable row level security;
alter table public.audit_log                enable row level security;
alter table public.webhook_events           enable row level security;
alter table public.plaid_items              enable row level security;

-- ─── users ────────────────────────────────────────────────────────────────
create policy users_self_read on public.users
  for select to authenticated
  using (clerk_user_id = public.current_clerk_user_id() or public.is_admin());

create policy users_self_update on public.users
  for update to authenticated
  using (clerk_user_id = public.current_clerk_user_id())
  with check (clerk_user_id = public.current_clerk_user_id());

-- ─── kyc_profiles ─────────────────────────────────────────────────────────
create policy kyc_self_read on public.kyc_profiles
  for select to authenticated
  using (user_id = public.current_user_id() or public.is_admin());

create policy kyc_self_write on public.kyc_profiles
  for insert to authenticated
  with check (user_id = public.current_user_id());

create policy kyc_self_update on public.kyc_profiles
  for update to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- ─── payment_methods ──────────────────────────────────────────────────────
create policy pm_self_read on public.payment_methods
  for select to authenticated
  using (user_id = public.current_user_id() or public.is_admin());

create policy pm_self_write on public.payment_methods
  for all to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- ─── providers / provider_plans (catalog, public read) ────────────────────
create policy providers_public_read on public.providers
  for select to authenticated using (true);

create policy provider_plans_public_read on public.provider_plans
  for select to authenticated using (true);

-- ─── subscriptions ────────────────────────────────────────────────────────
create policy subs_self_read on public.subscriptions
  for select to authenticated
  using (user_id = public.current_user_id() or public.is_admin());

create policy subs_self_write on public.subscriptions
  for all to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- ─── virtual_cards ────────────────────────────────────────────────────────
-- Users can read but not directly mutate their cards — service role only.
create policy vc_self_read on public.virtual_cards
  for select to authenticated
  using (user_id = public.current_user_id() or public.is_admin());

-- ─── charges (read-only for users) ────────────────────────────────────────
create policy charges_self_read on public.charges
  for select to authenticated
  using (user_id = public.current_user_id() or public.is_admin());

-- ─── bills + line items (read-only for users) ─────────────────────────────
create policy bills_self_read on public.bills
  for select to authenticated
  using (user_id = public.current_user_id() or public.is_admin());

create policy bill_lines_self_read on public.bill_line_items
  for select to authenticated
  using (
    exists (
      select 1 from public.bills b
      where b.id = bill_id
        and (b.user_id = public.current_user_id() or public.is_admin())
    )
  );

-- ─── ledger_entries (admin only — financial source of truth) ──────────────
create policy ledger_admin_read on public.ledger_entries
  for select to authenticated
  using (public.is_admin());

-- ─── dunning_attempts ─────────────────────────────────────────────────────
create policy dunning_self_read on public.dunning_attempts
  for select to authenticated
  using (
    exists (
      select 1 from public.bills b
      where b.id = bill_id
        and (b.user_id = public.current_user_id() or public.is_admin())
    )
  );

-- ─── notifications + preferences ──────────────────────────────────────────
create policy notif_self_read on public.notifications
  for select to authenticated
  using (user_id = public.current_user_id() or public.is_admin());

create policy notif_prefs_self_all on public.notification_preferences
  for all to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- ─── cancellation_requests ────────────────────────────────────────────────
create policy cancel_self_all on public.cancellation_requests
  for all to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- ─── plaid_items ──────────────────────────────────────────────────────────
create policy plaid_items_self_read on public.plaid_items
  for select to authenticated
  using (user_id = public.current_user_id() or public.is_admin());

create policy plaid_items_self_write on public.plaid_items
  for all to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- ─── admins (admin only) ──────────────────────────────────────────────────
create policy admins_admin_read on public.admins
  for select to authenticated
  using (public.is_admin() or clerk_user_id = public.current_clerk_user_id());

-- ─── audit_log (admin only) ───────────────────────────────────────────────
create policy audit_admin_read on public.audit_log
  for select to authenticated
  using (public.is_admin());

-- ─── webhook_events (service role only — deny all authenticated) ──────────
-- No policies = no rows visible to authenticated users.
-- Service role bypasses RLS and writes inbound webhook payloads here.
