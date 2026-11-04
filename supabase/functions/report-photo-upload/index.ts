import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { createReportPhotoUploadHandler, DERIVATIVE_BUCKET } from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req: Request) => {
  // OPTIONS is handled without credentials; POST fails closed without backend config.
  let writer: ReturnType<typeof createClient> | undefined;
  const server = () => {
    if (!writer) throw new Error("Writer unavailable");
    return writer;
  };
  const handle = createReportPhotoUploadHandler({
    authorize: async (jwt, reportId) => {
      if (!url || !anonKey || !serviceKey) throw new Error("Backend unavailable");
      const caller = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await caller.auth.getUser(jwt);
      if (error || !data.user || data.user.is_anonymous || !data.user.email_confirmed_at)
        return null;
      const { data: report, error: reportError } = await caller
        .from("fishing_reports")
        .select("id,user_id")
        .eq("id", reportId)
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (reportError || !report || report.user_id !== data.user.id) return null;
      writer = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return data.user.id;
    },
    existing: async (id) => {
      const { data, error } = await server()
        .from("report_photos")
        .select("id,report_id,user_id,sanitized_path")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    upload: async (path, bytes) => {
      const { error } = await server()
        .storage.from(DERIVATIVE_BUCKET)
        .upload(path, bytes, { contentType: "image/jpeg", cacheControl: "60", upsert: true });
      if (error) throw error;
    },
    reserve: async (record) => {
      const backend = server();
      const { error } = await backend.from("report_photos").insert(record);
      if (!error) return;
      if (error.code === "23505" || error.code === "23514") {
        const { data: existing, error: lookupError } = await backend
          .from("report_photos")
          .select("id,report_id,user_id")
          .eq("id", record.id)
          .maybeSingle();
        if (
          !lookupError &&
          existing?.report_id === record.report_id &&
          existing.user_id === record.user_id
        )
          return;
      }
      throw error;
    },
    register: async (record) => {
      const backend = server();
      const { data: old, error: lookupError } = await backend
        .from("report_photos")
        .select("id,report_id,user_id,sanitized_path")
        .eq("id", record.id)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (old) {
        if (old.user_id !== record.user_id || old.report_id !== record.report_id)
          throw new Error("Photo conflict");
        if (old.sanitized_path) return;
        const { error } = await backend
          .from("report_photos")
          .update({
            storage_path: record.storage_path,
            sanitized_path: record.sanitized_path,
            sanitized_at: record.sanitized_at,
          })
          .eq("id", record.id)
          .eq("user_id", record.user_id)
          .eq("report_id", record.report_id)
          .select("id")
          .single();
        if (error) throw error;
      } else {
        const { error } = await backend.from("report_photos").insert(record);
        if (error) throw error;
      }
    },
  });
  return handle(req);
});
