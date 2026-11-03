export type PhotoAccess = { path: string; owner: boolean };
type Dependencies = {
  resolve: (photoId: string, jwt: string | null) => Promise<PhotoAccess | null>;
  download: (path: string) => Promise<Uint8Array>;
  remove: (photoId: string, path: string) => Promise<void>;
};
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  Vary: "Authorization, Origin",
};
const reply = (status: number) => new Response(null, { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function canonicalPath(path: string, photoId: string) {
  const parts = path.split("/");
  return (
    parts.length === 3 &&
    uuid.test(parts[0] ?? "") &&
    uuid.test(parts[1] ?? "") &&
    parts[2] === `${photoId}.jpg`
  );
}

/** No signed URLs: every request rechecks report visibility using the caller's RLS. */
export function createReportPhotoAccessHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return reply(204);
    if (!["GET", "DELETE"].includes(request.method)) return reply(405);
    const photoId = new URL(request.url).searchParams.get("photo_id") ?? "";
    if (!uuid.test(photoId)) return reply(400);
    const authorization = request.headers.get("authorization");
    if (authorization && !/^Bearer\s+\S+$/i.test(authorization)) return reply(401);
    const jwt = authorization?.replace(/^Bearer\s+/i, "") ?? null;
    if (request.method === "DELETE" && !jwt) return reply(401);
    try {
      const photo = await deps.resolve(photoId, jwt);
      if (!photo || !canonicalPath(photo.path, photoId)) return reply(404);
      if (request.method === "DELETE") {
        if (!photo.owner) return reply(404);
        await deps.remove(photoId, photo.path);
        return reply(204);
      }
      const bytes = await deps.download(photo.path);
      if (
        bytes.length < 4 ||
        bytes.length > 12 * 1024 * 1024 ||
        bytes[0] !== 0xff ||
        bytes[1] !== 0xd8 ||
        bytes[bytes.length - 2] !== 0xff ||
        bytes[bytes.length - 1] !== 0xd9
      )
        return reply(503);
      // Also check a publication change while Storage was being read.
      const current = await deps.resolve(photoId, jwt);
      if (!current || current.path !== photo.path) return reply(404);
      return new Response(Uint8Array.from(bytes), {
        status: 200,
        headers: {
          ...headers,
          "Content-Type": "image/jpeg",
          "Content-Disposition": 'inline; filename="report-photo.jpg"',
        },
      });
    } catch {
      return reply(503);
    }
  };
}
