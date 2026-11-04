import { supabase } from "@/integrations/supabase/client";

/** Each image GET rechecks visibility; no anonymous Storage signing permission. */
export async function loadPublicReportPhotos(
  reportIds: string[],
): Promise<Record<string, string[]>> {
  if (!reportIds.length) return {};
  const { data: rows, error } = await supabase
    .from("report_photos")
    .select("id,report_id,sanitized_path,sort_order,fishing_reports!inner(is_public)")
    .eq("fishing_reports.is_public", true)
    .not("sanitized_path", "is", null)
    .in("report_id", reportIds)
    .order("sort_order", { ascending: true });
  if (error) throw new Error("Photographs unavailable");
  const safe = (rows ?? []).flatMap((row) =>
    row.sanitized_path ? [{ reportId: row.report_id, photoId: row.id }] : [],
  );
  if (!safe.length) return {};
  // The SDK owns STAGING/preview URL selection. getPublicUrl only constructs a
  // URL locally; never return or request that Storage URL for a private bucket.
  const { data: configuration } = supabase.storage
    .from("report-photo-derivatives")
    .getPublicUrl("");
  const origin = new URL(configuration.publicUrl).origin;
  const result: Record<string, string[]> = {};
  safe.forEach((row) => {
    const url = new URL("/functions/v1/report-photo-access", origin);
    url.searchParams.set("photo_id", row.photoId);
    (result[row.reportId] ??= []).push(url.href);
  });
  return result;
}
