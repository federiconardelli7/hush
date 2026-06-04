-- Hush — optional note on a money request ("what's it for", e.g. "lunch money").
-- Plaintext, like the payment caption + decline_reason; RLS already scopes the row
-- to the two parties. The amount stays encrypted; this is coordination text only.
alter table public.requests
  add column if not exists note text
  check (note is null or char_length(note) <= 200);
