/** Exact owned Netlify host boundary. JWT and RPC authorization remain mandatory. */
export function trustedSpotOrigin(origin: string | null): boolean {
  if (!origin) return true; // authenticated non-browser clients
  try {
    const url = new URL(origin);
    if (url.origin !== origin) return false;
    if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) return true;
    return (
      url.protocol === "https:" &&
      !url.port &&
      (/^deploy-preview-[0-9]+--zapruda1\.netlify\.app$/.test(url.hostname) ||
        /^[a-f0-9]{24}--zapruda1\.netlify\.app$/.test(url.hostname))
    );
  } catch {
    return false;
  }
}
