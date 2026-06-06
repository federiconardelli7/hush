-- Faucet / auth-server state, lifted out of the in-process server's in-memory Maps
-- so the faucet can run as STATELESS Vercel serverless functions: a nonce issued on
-- one invocation must be verifiable on the next, and cooldowns must hold across
-- instances. Written ONLY by the faucet via the service-role key (bypasses RLS) —
-- no client (anon/authenticated) ever touches these tables.

-- Single-use auth nonces. The row is deleted the moment a token is minted.
create table if not exists public.faucet_nonces (
  nonce       text primary key,
  address     text        not null,
  message     text        not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Supports the opportunistic expiry sweep (delete where expires_at < now()).
create index if not exists faucet_nonces_expires_at_idx on public.faucet_nonces (expires_at);

-- Sliding-window rate limiter. `identifier` is a lowercased wallet address (per-user
-- cooldown) or "ip:<x-forwarded-for>" (per-IP burst cap); `action` ∈ drip|mint|nonce.
create table if not exists public.faucet_rate_limits (
  identifier    text        not null,
  action        text        not null,
  window_start  timestamptz not null default now(),
  count         integer     not null default 0,
  primary key (identifier, action)
);

-- RLS on with NO anon/authenticated policies → every client read/write is denied.
-- The faucet uses the service-role key for all access here.
alter table public.faucet_nonces      enable row level security;
alter table public.faucet_rate_limits enable row level security;

-- Atomic sliding-window rate check: in ONE statement, bump the (identifier, action)
-- counter — resetting the window when it has elapsed — and return true iff still within
-- p_max. Single-statement so concurrent serverless invocations can't both pass a
-- one-per-window cap (the old in-process server's Map was atomic; this restores that).
-- SECURITY INVOKER (default): only the service-role caller (which bypasses RLS) can run
-- it against the deny-all tables; anon/authenticated hit RLS and fail closed.
create or replace function public.faucet_rate_hit(
  p_identifier text,
  p_action     text,
  p_window_ms  bigint,
  p_max        integer
) returns boolean
language plpgsql
as $$
declare
  v_count integer;
begin
  insert into public.faucet_rate_limits as r (identifier, action, window_start, count)
    values (p_identifier, p_action, now(), 1)
  on conflict (identifier, action) do update
    set
      count = case
        when r.window_start < now() - (p_window_ms::text || ' milliseconds')::interval then 1
        else r.count + 1
      end,
      window_start = case
        when r.window_start < now() - (p_window_ms::text || ' milliseconds')::interval then now()
        else r.window_start
      end
  returning r.count into v_count;
  return v_count <= p_max;
end;
$$;
