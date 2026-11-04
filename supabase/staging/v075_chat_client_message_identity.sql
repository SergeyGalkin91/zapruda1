-- STAGING ONLY yudtbifopfnjtjanaqrd; not an automatic production migration.
-- The UI keeps one client UUID across lost-response retries. Existing INSERT
-- RLS still requires the confirmed actor's own user_id and permitted geography.
-- PK collisions fail; no UPSERT/UPDATE, role or broad table privilege is added.
grant insert(id) on public.chat_messages to authenticated;
