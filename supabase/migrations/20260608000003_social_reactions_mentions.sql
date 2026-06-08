-- Social feed polish: emoji reactions + @mentions. Additive columns only (no data change);
-- the existing likes/comments RLS already covers them (each row is still written by its
-- owner via the existing INSERT policies).

-- Emoji reactions: which emoji a "like" is. Existing likes become ❤️. The PK
-- (payment_tx_hash, liker_address) is unchanged → one reaction per person; re-reacting
-- updates the emoji in place.
alter table public.likes
  add column if not exists emoji text not null default '❤️'
  check (char_length(emoji) between 1 and 16);

-- @mentions: the resolved, lowercased addresses a comment mentions. Bounded to a sane
-- count so a hand-crafted request (the author's own row) can't bloat the row / GIN index.
alter table public.comments
  add column if not exists mentions text[] not null default '{}'
  check (array_length(mentions, 1) is null or array_length(mentions, 1) <= 20);

-- For the "comments mentioning me" lookup (mentions @> {me}).
create index if not exists comments_mentions_idx on public.comments using gin (mentions);
