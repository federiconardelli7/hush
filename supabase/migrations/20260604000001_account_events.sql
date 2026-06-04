-- Hush — account events: a user's own money in/out (deposit / withdraw).
-- NO AMOUNT column (privacy invariant): deposit/withdraw amounts are public on-chain
-- but are still re-derived client-side, never stored. Powers the Activity
-- "Added money" / "Cashed out" rows. RLS: owner-only (keyed on current_wallet()).

create table if not exists public.account_events (
  tx_hash    text primary key,
  chain_id   integer not null default 43113,
  address    text not null check (address = lower(address)),
  kind       text not null check (kind in ('deposit','withdraw')),
  created_at timestamptz not null default now()
);
create index if not exists account_events_owner_idx
  on public.account_events (address, created_at desc);

alter table public.account_events enable row level security;

create policy account_events_select on public.account_events
  for select using (address = public.current_wallet());
create policy account_events_insert on public.account_events
  for insert with check (address = public.current_wallet());
