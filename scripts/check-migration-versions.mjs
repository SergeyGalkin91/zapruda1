import { readdirSync } from "node:fs";
import { join } from "node:path";

// Legacy migration filename collisions require live-schema reconciliation first.
// Keep them explicit; fail CI if *new* collisions appear.
const known = new Map([
  ["20261029000000", ["20261029000000_marketplace.sql", "20261029000000_social_reactions_achievements.sql"]],
  ["20261030000000", ["20261030000000_private_fishing_marks.sql", "20261030000000_social_features_schema_aligned_draft.sql"]],
  ["20261108000000", ["20261108000000_admin_inbox_submissions.sql", "20261108000000_community_feedback.sql", "20261108000000_community_requests_telegram_queue.sql"]],
]);
const names = readdirSync(join(process.cwd(), "supabase", "migrations")).filter(n => n.endsWith(".sql")).sort();
const groups = new Map();
let failed = false;
for (const n of names) {
  const match = /^(\d{14})_[\w-]+\.sql$/.exec(n);
  if (!match) { console.error("Invalid migration filename:", n); failed = true; continue; }
  const current = groups.get(match[1]) ?? [];
  current.push(n);
  groups.set(match[1], current);
}
for (const [version, namesInVersion] of groups) {
  if (namesInVersion.length <= 1) continue;
  const baseline = known.get(version);
  if (baseline && JSON.stringify(namesInVersion) === JSON.stringify([...baseline].sort())) {
    console.warn("KNOWN LEGACY COLLISION (requires separate reconciliation):", version, namesInVersion.join(", "));
  } else {
    console.error("NEW/CHANGED MIGRATION COLLISION:", version, namesInVersion.join(", "));
    failed = true;
  }
}
console.log("Audited migration files:", names.length, "| known legacy collisions:", known.size);
if (failed) process.exitCode = 1;
