import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { createReportPhotoAccessHandler } from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const bucket = "report-photo-derivatives";

// Public GET is intentional; the gateway must use verify_jwt=false. This handler
// enforces publication/ownership itself. DELETE always requires a confirmed JWT.
Deno.serve(async (request: Request) => {
  let callerId: string | null = null;
  let initialized = false;
  let caller: ReturnType<typeof createClient> | undefined;
  let writer: ReturnType<typeof createClient> | undefined;
  const server = () => {
    if (!writer) throw new Error("Backend unavailable");
    return writer;
  };
  const handler = createReportPhotoAccessHandler({
    resolve: async (photoId, jwt) => {
      if (!url || !anonKey || !serviceKey) throw new Error("Backend unavailable");
      if (!initialized) {
        caller = createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          ...(jwt ? { global: { headers: { Authorization: `Bearer ${jwt}` } } } : {}),
        });
        if (jwt) {
          const { data, error } = await caller.auth.getUser(jwt);
          if (error || !data.user || data.user.is_anonymous || !data.user.email_confirmed_at)
            return null;
          callerId = data.user.id;
        }
        writer = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        initialized = true;
      }
      if (!caller) return null;
      const { data: photo, error } = await caller
        .from("report_photos")
        .select("id,report_id,user_id,storage_path,sanitized_path,sanitized_at")
        .eq("id", photoId)
        .maybeSingle();
      if (error || !photo) return null;
      const path = photo.sanitized_path ?? photo.storage_path;
      const { data: report, error: reportError } = await caller
        .from("fishing_reports")
        .select("id,user_id,is_public")
        .eq("id", photo.report_id)
        .maybeSingle();
      if (
        (report && report.user_id !== photo.user_id) ||
        path !== `${photo.user_id}/${photo.report_id}/${photo.id}.jpg`
      )
        return null;
      const ordinary = !reportError && report && (report.is_public || report.user_id === callerId);
      if (!ordinary) {
        // A named participant can view a sanitized shared photo without access to the private report.
        // The caller JWT and consent RPC remain authoritative; never issue a Storage URL.
        if (!callerId || !photo.sanitized_path || !photo.sanitized_at) return null;
        const access = await caller.rpc("zc_osp_shared_photo_access", { p_photo: photo.id });
        if (access.error || access.data !== true) return null;
      }
      return {
        path,
        owner: Boolean(ordinary && report.user_id === callerId),
        ready: Boolean(photo.sanitized_path && photo.sanitized_at),
      };
    },
    download: async (path) => {
      const { data, error } = await server().storage.from(bucket).download(path);
      if (error || !data) throw new Error("Photograph unavailable");
      return new Uint8Array(await data.arrayBuffer());
    },
    remove: async (photoId, path) => {
      if (!callerId || path.split("/")[0] !== callerId) throw new Error("Owner required");
      const { error } = await server().storage.from(bucket).remove([path]);
      if (error) throw new Error("Photograph unavailable");
      const { error: metadataError } = await server()
        .from("report_photos")
        .delete()
        .eq("id", photoId)
        .eq("user_id", callerId);
      if (metadataError) throw new Error("Photograph unavailable");
    },
  });
  return handler(request);
});
