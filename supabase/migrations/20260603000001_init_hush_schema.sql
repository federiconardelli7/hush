-- Hush v1 — confidential-payments social layer.
-- Amounts/balances are NEVER stored here (they live encrypted on-chain). RLS keys off
-- the caller's wallet from a 'wallet_address' JWT claim (wired via Privy → Supabase auth).
-- The service role bypasses RLS for admin/seed.

-- caller's wallet (lowercased) from request JWT claims, or '' when unauthenticated
create or replace function public.current_wallet()
returns text language sql stable set search_path = '' as $$
  select lower(coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'wallet_address', ''
  ))
$$;

-- profiles: wallet address -> username / display name (public discovery)
create table if not exists public.profiles (
  address       text primary key check (address = lower(address)),
  username      text unique not null,
  display_name  text not null,
  avatar_tint   text,
  created_at    timestamptz not null default now()
);

-- private contact book (per owner): a nickname for a wallet, never shown to others
create table if not exists public.contacts (
  owner_address    text not null,
  contact_address  text not null check (contact_address = lower(contact_address)),
  nickname         text not null,
  created_at       timestamptz not null default now(),
  primary key (owner_address, contact_address)
);

-- feed visibility for a payment event
do $$ begin
  create type public.audience as enum ('friends','public','private');
exception when duplicate_object then null; end $$;

-- one row per confidential payment. NO AMOUNT COLUMN (privacy invariant).
create table if not exists public.payments (
  tx_hash          text primary key,
  chain_id         integer not null default 43113,
  sender_address   text not null check (sender_address = lower(sender_address)),
  receiver_address text not null check (receiver_address = lower(receiver_address)),
  audience         public.audience not null default 'friends',
  caption          text check (caption is null or char_length(caption) <= 280),
  created_at       timestamptz not null default now()
);
create index if not exists payments_sender_idx   on public.payments (sender_address, created_at desc);
create index if not exists payments_receiver_idx on public.payments (receiver_address, created_at desc);
create index if not exists payments_audience_idx on public.payments (audience, created_at desc);

create table if not exists public.likes (
  payment_tx_hash text not null references public.payments(tx_hash) on delete cascade,
  liker_address   text not null,
  created_at      timestamptz not null default now(),
  primary key (payment_tx_hash, liker_address)
);

create table if not exists public.comments (
  id              uuid primary key default gen_random_uuid(),
  payment_tx_hash text not null references public.payments(tx_hash) on delete cascade,
  author_address  text not null,
  body            text not null check (char_length(body) between 1 and 500),
  created_at      timestamptz not null default now()
);
create index if not exists comments_payment_idx on public.comments (payment_tx_hash, created_at);

-- mutual-contact check (for 'friends' feed visibility). SECURITY DEFINER so it can read
-- both sides' contacts past their owner-only RLS.
create or replace function public.is_mutual_contact(a text, b text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.contacts where owner_address = a and contact_address = b)
     and exists (select 1 from public.contacts where owner_address = b and contact_address = a)
$$;

create or replace function public.can_see_payment(p_tx text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.payments p
    where p.tx_hash = p_tx and (
      p.audience = 'public'
      or public.current_wallet() in (p.sender_address, p.receiver_address)
      or (p.audience = 'friends' and public.is_mutual_contact(public.current_wallet(), p.sender_address))
    )
  )
$$;

-- ── Row-Level Security ──
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.payments enable row level security;
alter table public.likes    enable row level security;
alter table public.comments enable row level security;

-- profiles: world-readable (discovery); self-writable
create policy profiles_read   on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert with check (address = public.current_wallet());
create policy profiles_update on public.profiles for update using (address = public.current_wallet()) with check (address = public.current_wallet());

-- contacts: strictly owner-only
create policy contacts_all on public.contacts for all
  using (owner_address = public.current_wallet())
  with check (owner_address = public.current_wallet());

-- payments: visibility by audience; only the sender may record one
create policy payments_select on public.payments for select using (
  audience = 'public'
  or public.current_wallet() in (sender_address, receiver_address)
  or (audience = 'friends' and public.is_mutual_contact(public.current_wallet(), sender_address))
);
create policy payments_insert on public.payments for insert with check (sender_address = public.current_wallet());

-- likes / comments: readable if the payment is visible; writable by the author
create policy likes_select   on public.likes    for select using (public.can_see_payment(payment_tx_hash));
create policy likes_insert   on public.likes    for insert with check (liker_address = public.current_wallet());
create policy likes_delete   on public.likes    for delete using (liker_address = public.current_wallet());
create policy comments_select on public.comments for select using (public.can_see_payment(payment_tx_hash));
create policy comments_insert on public.comments for insert with check (author_address = public.current_wallet());
