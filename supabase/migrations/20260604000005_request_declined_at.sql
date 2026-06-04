-- Hush — when a request was declined, so notifications/activity can show the decline
-- date (created_at is when it was asked; this is when the requestee declined it).
alter table public.requests
  add column if not exists declined_at timestamptz;
