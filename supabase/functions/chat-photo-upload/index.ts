import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import { createReportPhotoUploadHandler } from "../report-photo-upload/handler.ts";

// Reuse the audited bounded multipart/JPEG filter and retry reservation protocol.
// report_id in that transport is the owning chat message, never a fishing report.
const url = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const bucket = "chat-photos";
Deno.serve(async (req: Request) => {
  let writer: SupabaseClient | undefined;
  const server = () => {
    if (!writer) throw new Error("Writer unavailable");
    return writer;
  };
  return createReportPhotoUploadHandler({
    authorize: async (jwt, messageId) => {
      if (!url || !anonKey || !serviceKey) throw new Error("Backend unavailable");
      const caller = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await caller.auth.getUser(jwt);
      if (error || !data.user || data.user.is_anonymous || !data.user.email_confirmed_at)
        return null;
      const { data: message, error: lookupError } = await caller
        .from("chat_messages")
        .select("id,user_id")
        .eq("id", messageId)
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (lookupError || !message || message.user_id !== data.user.id) return null;
      writer = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return data.user.id;
    },
    existing: async (id) => {
      const { data, error } = await server()
        .from("chat_message_photos")
        .select("id,message_id,user_id,sanitized_path")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...data, report_id: data.message_id } : null;
    },
    reserve: async (record) => {
      if (record.sort_order !== 0) throw new Error("One photo per message");
      const backend = server();
      const { error } = await backend.from("chat_message_photos").insert({
        id: record.id,
        message_id: record.report_id,
        user_id: record.user_id,
        storage_path: record.storage_path,
      });
      if (!error) return;
      if (error.code === "23505") {
        const { data: old, error: lookup } = await backend
          .from("chat_message_photos")
          .select("id,message_id,user_id")
          .eq("id", record.id)
          .maybeSingle();
        if (!lookup && old?.message_id === record.report_id && old?.user_id === record.user_id)
          return;
      }
      throw error;
    },
    upload: async (path, bytes) => {
      const { error } = await server().storage.from(bucket).upload(path, bytes, {
        contentType: "image/jpeg",
        cacheControl: "0",
        upsert: true,
      });
      if (error) throw error;
    },
    register: async (record) => {
      const { error } = await server()
        .from("chat_message_photos")
        .update({ sanitized_path: record.sanitized_path, sanitized_at: record.sanitized_at })
        .eq("id", record.id)
        .eq("message_id", record.report_id)
        .eq("user_id", record.user_id)
        .select("id")
        .single();
      if (error) throw error;
    },
  })(req);
});
