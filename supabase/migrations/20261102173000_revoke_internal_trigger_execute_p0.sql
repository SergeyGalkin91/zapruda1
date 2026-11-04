-- v0.7.1 P0: private trigger functions must not be directly callable via RPC.
-- Trigger execution itself does not require clients to hold EXECUTE on trigger funcs.
revoke execute on function public.enforce_competition_result_team_match() from public, anon, authenticated;
revoke execute on function public.enforce_competition_team_limit() from public, anon, authenticated;
revoke execute on function public.guard_guide_quote_payment_fields() from public, anon, authenticated;
