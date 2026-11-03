import { sanitizeReportJpeg } from "../_shared/report-photo-jpeg.ts";

export const DERIVATIVE_BUCKET = "report-photo-derivatives";
const MAX_FILE = 5 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};
const reply = (status: number, value: object) =>
  new Response(JSON.stringify(value), { status, headers });

// Only operations needed by this endpoint. A caller-scoped client does all
// identity/ownership checks; the private writer is constructed only afterward.
export type PhotoRecord = {
  id: string;
  report_id: string;
  user_id: string;
  sanitized_path: string | null;
};
export type PhotoUploadDependencies = {
  authorize: (jwt: string, reportId: string) => Promise<string | null>;
  existing: (photoId: string) => Promise<PhotoRecord | null>;
  reserve: (
    record: Omit<PhotoRecord, "sanitized_path"> & { storage_path: string; sort_order: number },
  ) => Promise<void>;
  upload: (path: string, bytes: Uint8Array) => Promise<void>;
  register: (
    record: PhotoRecord & { storage_path: string; sort_order: number; sanitized_at: string },
  ) => Promise<void>;
  now?: () => Date;
};

async function boundedForm(req: Request): Promise<FormData> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Invalid form");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_FILE + 32 * 1024) {
      await reader.cancel();
      throw new RangeError("Too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  return new Response(bytes, {
    headers: { "content-type": req.headers.get("content-type") ?? "" },
  }).formData();
}

export function createReportPhotoUploadHandler(deps: PhotoUploadDependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
    const jwt = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!jwt) return reply(401, { error: "Войди в ZAPRUDA" });
    let form: FormData;
    try {
      form = await boundedForm(req);
    } catch (error) {
      return reply(error instanceof RangeError ? 413 : 400, {
        error: "Некорректная загрузка фотографии",
      });
    }
    const reportId = form.get("report_id");
    const photoId = form.get("photo_id");
    const order = form.get("sort_order");
    const file = form.get("file");
    if (
      typeof reportId !== "string" ||
      !UUID.test(reportId) ||
      typeof photoId !== "string" ||
      !UUID.test(photoId) ||
      typeof order !== "string" ||
      !/^[0-5]$/.test(order)
    ) {
      return reply(400, { error: "Некорректные данные фотографии" });
    }
    try {
      const owner = await deps.authorize(jwt, reportId);
      if (!owner) return reply(403, { error: "Нет доступа к отчёту" });
      const previous = await deps.existing(photoId);
      if (previous && (previous.user_id !== owner || previous.report_id !== reportId)) {
        return reply(409, { error: "Идентификатор фотографии уже используется" });
      }
      if (previous?.sanitized_path) return reply(200, { photo_id: photoId });
      if (!(file instanceof Blob) || file.type !== "image/jpeg") {
        return reply(415, { error: "Подготовь фотографию в формате JPG" });
      }
      if (!file.size || file.size > MAX_FILE)
        return reply(413, { error: "Фотография должна быть до 5 МБ" });
      let sanitized: Uint8Array;
      try {
        sanitized = sanitizeReportJpeg(new Uint8Array(await file.arrayBuffer()));
      } catch {
        return reply(422, { error: "Не удалось обработать JPG. Выбери другое фото." });
      }
      const path = `${owner}/${reportId}/${photoId}.jpg`;
      // Reserve a bounded row under the report lock BEFORE any object write.
      // A failed upload remains private and can be retried with this same ID.
      await deps.reserve({
        id: photoId,
        report_id: reportId,
        user_id: owner,
        storage_path: path,
        sort_order: Number(order),
      });
      await deps.upload(path, sanitized);
      await deps.register({
        id: photoId,
        report_id: reportId,
        user_id: owner,
        storage_path: path,
        sanitized_path: path,
        sort_order: Number(order),
        sanitized_at: (deps.now?.() ?? new Date()).toISOString(),
      });
      return reply(200, { photo_id: photoId });
    } catch {
      // Do not echo storage paths, backend diagnostics, filenames or metadata.
      // A transient failure may leave an unreferenced PRIVATE derivative; retry
      // uses the same photo ID. Never delete after an uncertain DB commit.
      return reply(503, { error: "Не удалось сохранить фотографию. Повтори загрузку." });
    }
  };
}
