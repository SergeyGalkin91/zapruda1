import { readdirSync } from "node:fs";
import { applySqlFile, createIsolatedPostgres } from "./isolated-postgres";

export function ospDelta(suffix: string) {
  const paths = readdirSync("supabase/staging").filter((n) =>
    new RegExp("^\\d{14}_" + suffix + "\\.sql$").test(n),
  );
  if (paths.length !== 1) throw new Error("Expected one STAGING delta: " + suffix);
  return "staging/" + paths[0]!;
}

/** Disconnected PostgreSQL baseline matching the live chat dependencies. */
export async function createIsolatedOnSpotPostgres() {
  const db = await createIsolatedPostgres();
  for (const p of [
    "tests/unit/pilot_dependencies_context.sql",
    "tests/unit/report_dependencies_adopted.sql",
    "tests/unit/chat_dependencies_adopted.sql",
    "staging/v075_report_integrity.sql",
    "staging/v075_public_chat.sql",
    "staging/v075_chat_client_message_identity.sql",
    "staging/v075_chat_read_state.sql",
  ])
    await applySqlFile(db, p);
  await db.exec(`
    create policy staging_geo_messages_global_send on public.chat_messages for insert to authenticated
      with check(user_id=auth.uid() and place_id='00000000-0000-4000-8000-000000000001'
       and exists(select 1 from public.chat_places p where p.id=place_id and p.level='global'));
    create table public.zc_public_spots(id uuid primary key,state text not null,reviewed_at timestamptz);
  `);
  await applySqlFile(db, ospDelta("v076_on_spot_zone_membership"));
  return db;
}
