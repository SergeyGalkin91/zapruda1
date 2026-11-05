-- Privacy-preserving feature shutdown. Retain all user/member/message data and global chat.
-- Restore only via a new audited delta; never replay the full applied migration.
revoke all on function public.zc_osp_catalog(),public.zc_osp_join(uuid),public.zc_osp_leave(uuid) from public,anon,authenticated;
create or replace function zc_osp_internal.can_access_place(p_place uuid,p_zone_only boolean)
returns boolean language sql stable security definer set search_path=pg_catalog,public,zc_osp_internal as $$
 select not p_zone_only and exists(select 1 from public.chat_places p where p.id=p_place and p.level<>'spot-zone')
  and not exists(select 1 from zc_osp_internal.zones z where z.chat_place_id=p_place)
$$;
notify pgrst,'reload schema';
