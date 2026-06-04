-- Hush — "Notify again" support. A requester can re-surface a still-pending request in
-- the requestee's inbox at most once per 24h (enforced client-side); we store only the
-- timestamp of the last nudge — no amount, no message. The requestee's notifications use
-- max(created_at, last_reminded_at) as the effective time, so a nudged request bumps back
-- to the top as "new". The existing requests_update RLS already lets the requester write
-- their own row, so no policy change is needed.
alter table public.requests
  add column if not exists last_reminded_at timestamptz;
