-- Hush — optional reason a requestee can attach when declining a money request
-- (e.g. "wrong amount", "already paid you cash"). Plaintext, like the payment
-- caption; RLS already scopes the row to the two parties. Amounts are never here.
alter table public.requests
  add column if not exists decline_reason text
  check (decline_reason is null or char_length(decline_reason) <= 200);
