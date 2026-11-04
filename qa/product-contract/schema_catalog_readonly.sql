select jsonb_build_object(
'checked_at',now(),
'tables',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'options',c.reloptions) order by n.nspname,c.relname),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','storage','zapruda_internal','zc_spot_internal') and c.relkind in('r','p','v','m')),
'columns',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'anon_select',has_column_privilege('anon',c.oid,a.attnum,'SELECT'),'auth_select',has_column_privilege('authenticated',c.oid,a.attnum,'SELECT')) order by n.nspname,c.relname,a.attnum),'[]'::jsonb) from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attnum>0 and not a.attisdropped and n.nspname in('public','storage','zapruda_internal','zc_spot_internal') and c.relkind in('r','p','v','m')),
'constraints',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',t.relname,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) order by n.nspname,t.relname,c.conname),'[]'::jsonb) from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname in('public','storage','zapruda_internal','zc_spot_internal')),
'policies',(select coalesce(jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname),'[]'::jsonb) from pg_policies p where schemaname in('public','storage','zapruda_internal','zc_spot_internal')),
'functions',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'result',pg_get_function_result(p.oid),'definer',p.prosecdef,'config',p.proconfig,'definition_md5',md5(pg_get_functiondef(p.oid)),'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'auth_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE')) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),'[]'::jsonb) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prokind='f' and n.nspname in('public','storage','zapruda_internal','zc_spot_internal')),
'triggers',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) order by n.nspname,c.relname,t.tgname),'[]'::jsonb) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in('public','storage','zapruda_internal','zc_spot_internal')),
'grants',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'role',r.role,'select',has_table_privilege(r.role,c.oid,'SELECT'),'insert',has_table_privilege(r.role,c.oid,'INSERT'),'update',has_table_privilege(r.role,c.oid,'UPDATE'),'delete',has_table_privilege(r.role,c.oid,'DELETE'),'truncate',has_table_privilege(r.role,c.oid,'TRUNCATE')) order by n.nspname,c.relname,r.role),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join (values('anon'),('authenticated'),('service_role')) r(role) where n.nspname in('public','storage','zapruda_internal','zc_spot_internal') and c.relkind in('r','p','v','m')),
'buckets',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types) order by id),'[]'::jsonb) from storage.buckets)
) snapshot;

-- Supplement used for the indexes/views/Realtime sections of the same snapshot.
select jsonb_build_object(
  'checked_at', now(),
  'indexes', (select coalesce(jsonb_agg(jsonb_build_object(
    'schema', schemaname, 'table', tablename, 'name', indexname,
    'definition', indexdef
  ) order by schemaname, tablename, indexname), '[]'::jsonb)
    from pg_indexes where schemaname in ('public','storage','zapruda_internal','zc_spot_internal')),
  'views', (select coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'name', c.relname,
    'definition_md5', md5(pg_get_viewdef(c.oid, false))
  ) order by n.nspname, c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('v','m') and n.nspname in ('public','storage','zapruda_internal','zc_spot_internal')),
  'realtime_tables', (select coalesce(jsonb_agg(jsonb_build_object(
    'publication', pubname, 'schema', schemaname, 'table', tablename
  ) order by pubname, schemaname, tablename), '[]'::jsonb)
    from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname in ('public','storage','zapruda_internal','zc_spot_internal'))
) supplement;
