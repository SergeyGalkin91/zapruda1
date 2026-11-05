-- STAGING ONLY. Cover the three new FK access paths reported by advisors.
-- No policy, permission, row or table ownership change.
create index pilot_catch_report_author_idx on public.catches(report_id,user_id);
create index pilot_chat_photo_message_author_idx on public.chat_message_photos(message_id,user_id);
create index pilot_publication_author_idx on zapruda_internal.pilot_report_publications_v075(user_id);
