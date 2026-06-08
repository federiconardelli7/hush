-- Social feed (likes + comments) policy completion.
-- The base tables + their SELECT/INSERT RLS already exist (20260603000001_init_hush_schema.sql).
-- This adds the two gaps the social layer needs, additively (no data change):
--   1. authors can delete their own comments (there was no DELETE policy);
--   2. you can only like/comment on payments you can actually see — tightened IN PLACE
--      with ALTER POLICY (no drop/recreate window), defense-in-depth beyond the read gate.

-- 1. Authors delete their own comments (drop-if-exists keeps this migration re-runnable).
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete using (author_address = public.current_wallet());

-- 2. Harden the existing INSERT policies in place: bind to the caller AND require the
--    payment be visible to them. ALTER keeps the check non-empty throughout (no window),
--    and re-running just re-sets the same expression (idempotent).
alter policy likes_insert on public.likes
  with check (
    liker_address = public.current_wallet()
    and public.can_see_payment(payment_tx_hash)
  );

alter policy comments_insert on public.comments
  with check (
    author_address = public.current_wallet()
    and public.can_see_payment(payment_tx_hash)
  );
