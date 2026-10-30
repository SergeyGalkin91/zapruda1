// Inject public Supabase browser settings into the prebuilt standalone image.
// The CI image deliberately uses placeholders so no environment-specific values
// need to be stored in GitHub artifacts.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const placeholders = [
  ["https://example.supabase.co", url],
  ["sb_publishable_docker_build_validation", key],
];
const textExtensions = new Set([".js", ".mjs", ".html", ".json", ".css"]);
let changed = 0;

async function patchTree(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await patchTree(path);
    } else if (entry.isFile() && textExtensions.has(extname(entry.name))) {
      const source = await readFile(path, "utf8");
      let output = source;
      for (const [from, to] of placeholders) {
        if (!output.includes(from)) continue;
        if (!to) throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY at container startup");
        output = output.replaceAll(from, to);
      }
      if (output !== source) {
        await writeFile(path, output, "utf8");
        changed++;
      }
    }
  }
}

await patchTree("/app/.output");
console.log("ZAPRUDA public runtime configuration ready; files updated:", changed);
await import("./.output/server/index.mjs");
