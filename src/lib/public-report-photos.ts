import { supabase } from "@/integrations/supabase/client";

/** Recheck publication at issuance time, including when refreshing expired URLs. */
export async function loadPublicReportPhotos(
  reportIds: string[],
): Promise<Record<string, string[]>> {
  if (!reportIds.length) return {};
  const { data: rows, error } = await supabase
    .from("report_photos")
    .select("report_id,sanitized_path,sort_order,fishing_reports!inner(is_public)")
    .eq("fishing_reports.is_public", true)
    .not("sanitized_path", "is", null)
    .in("report_id", reportIds)
    .order("sort_order", { ascending: true });
  if (error) throw new Error("Photographs unavailable");
  const safe = (rows ?? []).flatMap((row) =>
    row.sanitized_path ? [{ reportId: row.report_id, path: row.sanitized_path }] : [],
  );
  if (!safe.length) return {};
  const { data: urls, error: signingError } = await supabase.storage
    .from("report-photo-derivatives")
    .createSignedUrls(
      safe.map((row) => row.path),
      60,
    );
  if (signingError || !urls) throw new Error("Photographs unavailable");
  const result: Record<string, string[]> = {};
  safe.forEach((row, index) => {
    const url = urls[index]?.signedUrl;
    if (url) (result[row.reportId] ??= []).push(url);
  });
  return result;
}
