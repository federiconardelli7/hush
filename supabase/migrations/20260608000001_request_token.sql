-- F-17 follow-up / in-app feedback: let a money request specify which token is asked for.
-- Additive + nullable: existing requests read as null → treated as the default token (TEST)
-- on display and fulfill. No RLS change — the existing requests_* row policies cover the
-- new column. No amount is ever stored (the amount stays the token-agnostic encrypted PCT);
-- this only records WHICH token the request is denominated in.
alter table public.requests
  add column token_address text
  check (token_address is null or token_address = lower(token_address));
