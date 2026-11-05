/** Same-origin hosted QA only. Never reads browser credentials or creates fixtures. */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const staging = "https://yudtbifopfnjtjanaqrd.supabase.co";

export async function writePreviewViewport(root, env) {
  const output = resolve(root, "dist/__qa/viewport.html");
  const galleryOutput = resolve(root, "dist/__qa/premium.html");
  if (env.CONTEXT !== "deploy-preview" || env.REVIEW_ID !== "93") {
    await rm(output, { force: true });
    await rm(galleryOutput, { force: true });
    return { enabled: false };
  }
  if (env.VITE_SUPABASE_URL !== staging) throw new Error("QA_VIEWPORT_STAGING_REQUIRED");
  if (!/^[a-f0-9]{40}$/.test(env.COMMIT_REF || ""))
    throw new Error("QA_VIEWPORT_EXACT_SHA_REQUIRED");
  const source = await readFile(resolve(root, "qa/hosted-viewport.html"), "utf8");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, source.replaceAll("__DEPLOYED_SHA__", env.COMMIT_REF));
  const gallery = await readFile(resolve(root, "qa/premium-gallery.html"), "utf8");
  await writeFile(galleryOutput, gallery.replaceAll("__DEPLOYED_SHA__", env.COMMIT_REF));
  return { enabled: true, sha: env.COMMIT_REF };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await writePreviewViewport(process.cwd(), process.env)));
}
