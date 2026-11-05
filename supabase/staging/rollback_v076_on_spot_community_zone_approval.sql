-- STAGING shutdown for community zones. Review history and room identity stay private.
alter table zc_osp_internal.zones
  add constraint osp_community_zones_disabled check (zone_kind<>'community' or not approved) not valid;
update zc_osp_internal.zones set approved=false where zone_kind='community' and approved;
alter table zc_osp_internal.zones validate constraint osp_community_zones_disabled;
