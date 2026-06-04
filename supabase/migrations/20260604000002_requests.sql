-- Hush — money requests. The amount is NEVER stored in plaintext: it's kept as a
-- Poseidon ciphertext (7-element PCT) encrypted to each party's eERC public key, so
-- only the requester and requestee can decrypt it (upholds D-3; the server stays
-- blind). Once paid, the settled transfer is confidential on-chain as usual.

create table if not exists public.requests (
  id                   uuid primary key default gen_random_uuid(),
  requester_address    text not null check (requester_address = lower(requester_address)),
  requestee_address    text not null check (requestee_address = lower(requestee_address)),
  amount_enc_requestee text[] not null,   -- 7-element PCT, encrypted to the requestee
  amount_enc_requester text[] not null,   -- 7-element PCT, encrypted to the requester (own view)
  status               text not null default 'pending'
                         check (status in ('pending','fulfilled','declined','canceled')),
  tx_hash              text,              -- the fulfilling payment, once paid
  created_at           timestamptz not null default now()
);
create index if not exists requests_requestee_idx on public.requests (requestee_address, created_at desc);
create index if not exists requests_requester_idx on public.requests (requester_address, created_at desc);

alter table public.requests enable row level security;

-- visible to the two parties; only the requester creates; either party may update status.
create policy requests_select on public.requests for select
  using (public.current_wallet() in (requester_address, requestee_address));
create policy requests_insert on public.requests for insert
  with check (requester_address = public.current_wallet());
create policy requests_update on public.requests for update
  using (public.current_wallet() in (requester_address, requestee_address))
  with check (public.current_wallet() in (requester_address, requestee_address));
