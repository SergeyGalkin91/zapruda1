import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { createReportPhotoAccessHandler } from "../report-photo-access/handler.ts";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const bucket = "chat-photos";
Deno.serve(async (req: Request) => {
  const server = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return createReportPhotoAccessHandler({
    resolve: async (photoId, jwt) => {
      if (!jwt || !url || !anonKey || !serviceKey) return null;
      const caller = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: auth, error: authError } = await caller.auth.getUser(jwt);
      if (authError || !auth.user || auth.user.is_anonymous || !auth.user.email_confirmed_at)
        return null;
      const { data, error } = await caller
        .from("chat_message_photos")
        .select("id,message_id,user_id,storage_path,sanitized_path")
        .eq("id", photoId)
        .maybeSingle();
      if (error || !data) return null;
      const path = `${data.user_id}/${data.message_id}/${photoId}.jpg`;
      if (data.storage_path !== path || (data.sanitized_path && data.sanitized_path !== path))
        return null;
      return { path, owner: data.user_id === auth.user.id, ready: data.sanitized_path === path };
    },
    download: async (path) => {
      const { data, error } = await server.storage.from(bucket).download(path);
      if (error || !data) throw new Error("Photo unavailable");
      return new Uint8Array(await data.arrayBuffer());
    },
    remove: async (photoId, path) => {
      const { error: objectError } = await server.storage.from(bucket).remove([path]);
      if (objectError) throw objectError;
      const { error } = await server
        .from("chat_message_photos")
        .delete()
        .eq("id", photoId)
        .eq("storage_path", path);
      if (error) throw error;
    },
  })(req);
});
