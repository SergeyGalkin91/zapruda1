-- STAGING ONLY. These tables already have explicit column ACL and row visibility
-- policies. No private GPS, evidence originals or social_* DM table is added.
do $$declare relation_name text;begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')then
  foreach relation_name in array array['comments','chat_message_reactions','chat_message_photos']loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
     and schemaname='public' and tablename=relation_name)then
    execute format('alter publication supabase_realtime add table public.%I',relation_name);
   end if;
  end loop;
 end if;
end$$;
