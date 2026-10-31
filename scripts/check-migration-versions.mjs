import { readdirSync } from "node:fs";
import { join } from "node:path";

const directory = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(directory).filter((name) => name.endsWith(".sql")).sort();
const versions = new Map();
for (const name of files) {
  const match = /^(\d{14})_[\w-]+\.sql$/.exec(name);
  if (!match) { console.error("Invalid migration filename:", name); process.exitCode = 1; continue; }
  const same = versions.get(match[1]) ?? [];
  same.push(name);
  versions.set(match[1], same);
}
const duplicates = [...versions].filter(([, names]) => names.length > 1);
console.log("Migration files:", files.length);
if (duplicates.length) {
  console.error("DUPLICATE MIGRATION VERSIONS — review before any fresh DB deployment:");
  for (const [version, names] of duplicates) console.error("  " + version + ": " + names.join(", "));
  console.error("Do not rename or replay previously applied migrations without reconciling the live database history.");
  process.exitCode = 1;
} else {
  console.log("All migration versions are unique.");
}
