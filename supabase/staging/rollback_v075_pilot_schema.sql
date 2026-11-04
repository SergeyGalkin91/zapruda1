-- REVIEWED ROLLBACK: execute only on a disposable clone after stopping clients.
-- This refuses to discard user content or idempotency history. Never CASCADE.
do $$begin
 if exists(select 1 from pg_policies where schemaname='public' and tablename='chat_messages'
   and policyname='staging_geo_messages_global_send')then
  raise exception 'Rollback refused: subsequent global chat policy depends on confirmed-write hardening; review a forward plan';
 end if;
 if exists(select 1 from public.chat_messages)
 or exists(select 1 from storage.objects where bucket_id='chat-photos')
 or exists(select 1 from public.angler_gear)
 or exists(select 1 from public.angler_gear_sets)
 or exists(select 1 from public.private_fishing_marks)
 or exists(select 1 from public.user_activity_windows)
 or exists(select 1 from public.beta_test_applications)
 or exists(select 1 from public.partner_trips where boat_trip or duration_hours is not null
   or meeting_area<>'' or gear_requirements<>'' or safety_notes<>''
   or experience_needed<>'Любой уровень' or social_style<>'Не важно')
 or exists(select 1 from zapruda_internal.pilot_report_publications_v075)then
 raise exception 'Rollback refused: preserve content and use a reviewed forward migration';
 end if;
end$$;
drop index public.pilot_catch_report_author_idx;
-- Other two access indexes are removed with their new owning tables below.
alter table public.partner_trips drop column experience_needed,drop column social_style,
 drop column duration_hours,drop column meeting_area,drop column gear_requirements,
 drop column safety_notes,drop column boat_trip;
drop function public.my_fishing_progress(),public.my_fishing_specializations_v2();
drop table public.beta_test_applications;
drop view public.my_activity_badges;
drop table public.user_activity_windows;
drop function public.set_my_primary_gear_set(uuid);
drop table public.private_fishing_marks;
drop policy pilot_gear_confirmed_insert on public.angler_gear;
drop policy pilot_gear_confirmed_update on public.angler_gear;
drop policy pilot_kit_confirmed_insert on public.angler_gear_sets;
drop policy pilot_kit_confirmed_update on public.angler_gear_sets;
-- Retain adopted gear/kit tables and narrowed column grants; never reopen type/primary mutation.
drop policy pilot_chat_no_direct_storage on storage.objects;
delete from storage.buckets where id='chat-photos';
drop table public.chat_message_photos;
drop trigger pilot_chat_place_confirmed on public.chat_places;
drop function zapruda_internal.pilot_chat_place_confirmed_v075();
drop policy pilot_chat_confirmed_write on public.chat_messages;
drop policy pilot_reaction_confirmed_write on public.chat_message_reactions;
alter table public.chat_messages drop constraint pilot_chat_message_owner;
drop index public.pilot_chat_creator_time;
-- Existing catalog, chat, reactions and ensure_chat_place are retained.
drop function public.publish_report_with_catches(uuid,jsonb,jsonb);
drop table zapruda_internal.pilot_report_publications_v075;
drop policy pilot_confirmed_report_insert on public.fishing_reports;
drop policy pilot_confirmed_catch_insert on public.catches;
drop policy pilot_confirmed_comment_insert on public.comments;
drop index public.pilot_catch_owner_idx;
drop index public.pilot_comment_owner_idx;
alter table public.catches drop constraint pilot_catch_report_owner_fk,drop constraint pilot_catch_values;
alter table public.comments drop constraint pilot_comment_size;
alter table public.fishing_reports drop constraint pilot_report_owner_key;
drop function zapruda_internal.pilot_confirmed_actor_v075();
-- Retain the pre-existing catches/comments tables, column grants, and RLS.
-- The current hosted schema has subsequent migrations: automatic rollback is
-- intentionally refused, even when no QA content remains. This file is a tested
-- rollback for the captured pre-subsequent disposable snapshot, not a live undo.
