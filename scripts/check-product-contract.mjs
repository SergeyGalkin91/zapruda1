import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
const required = [
  "docs/ZAPRUDA_CURRENT_PRODUCT_SPEC.md",
  "docs/ZAPRUDA_FEATURE_MATRIX.md",
  "docs/ZAPRUDA_UI_ACCEPTANCE.md",
  "docs/ZAPRUDA_RELEASE_GATES.md",
  "docs/ZAPRUDA_DECISION_LOG.md",
  "docs/ZAPRUDA_FEATURES.json",
  "docs/ZAPRUDA_FEATURE_IDS.json",
  "AGENTS.md",
];
const allowed = new Set([
  "IMPLEMENTED",
  "STAGING VERIFIED",
  "E2E VERIFIED",
  "PLANNED",
  "BLOCKED",
  "DEFERRED",
]);
export function check(root = process.cwd(), base = process.env.CONTRACT_BASE_SHA) {
  const errors = [];
  const read = (p) => readFileSync(resolve(root, p), "utf8");
  for (const p of required)
    if (!existsSync(resolve(root, p))) errors.push("Missing required file: " + p);
  if (errors.length) return errors;
  let registry, ids;
  try {
    registry = JSON.parse(read("docs/ZAPRUDA_FEATURES.json"));
    ids = JSON.parse(read("docs/ZAPRUDA_FEATURE_IDS.json"));
  } catch (e) {
    return ["Invalid registry JSON: " + e.message];
  }
  const baseline = execFileSync(
    "git",
    ["show", "1fa7684a3d8993390b8655004b2e8c250ba0b0df:docs/ZAPRUDA_FEATURE_MATRIX.md"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\n")
    .map((l) => l.match(/^\| ([A-Z]+-\d+) /)?.[1])
    .filter(Boolean);
  if (ids.length !== 56 || new Set(ids).size !== 56 || baseline.some((id) => !ids.includes(id)))
    errors.push(
      "Original 56-ID baseline changed. Retain every original ID; record an explicit decision for identity changes.",
    );
  const seen = new Set();
  const log = read("docs/ZAPRUDA_DECISION_LOG.md");
  for (const f of registry.features || []) {
    if (seen.has(f.id)) errors.push("Duplicate feature ID: " + f.id);
    seen.add(f.id);
    for (const key of [
      "id",
      "feature",
      "module",
      "priority",
      "source",
      "backend",
      "status",
      "acceptance",
      "evidence",
      "blocker",
    ])
      if (typeof f[key] !== "string" || !f[key].trim()) errors.push(f.id + ": missing " + key);
    if (!allowed.has(f.status)) errors.push(f.id + ": invalid status " + f.status);
    if (f.status === "DEFERRED" && !log.includes("DEFERRED:" + f.id + ":"))
      errors.push(f.id + ": deferral requires explicit owner decision in log");
    for (const m of (f.source || "").matchAll(
      /(?:src|supabase|scripts)\/[\w./-]+\.(?:tsx?|mjs|sql)/g,
    ))
      if (!existsSync(resolve(root, m[0]))) errors.push(f.id + ": missing source " + m[0]);
  }
  if (seen.size !== 56 || ids.some((id) => !seen.has(id)))
    errors.push("Matrix must retain all 56 original feature IDs");
  const columns = [
    "id",
    "feature",
    "module",
    "priority",
    "source",
    "backend",
    "status",
    "acceptance",
    "evidence",
    "blocker",
  ];
  const rendered = (registry.features || []).map(
    (f) =>
      "| " +
      columns.map((k) => String(f[k]).replaceAll("|", " / ").replaceAll("\n", " ")).join(" | ") +
      " |",
  );
  const md = read("docs/ZAPRUDA_FEATURE_MATRIX.md");
  for (const row of rendered)
    if (!md.split("\n").includes(row))
      errors.push("Markdown/JSON matrix drift: " + row.split("|")[1].trim());
  for (const p of required.filter((p) => p.endsWith(".md"))) {
    for (const m of read(p).matchAll(/\]\(([^)]+)\)/g)) {
      const href = m[1].split("#")[0];
      if (!href || /^(https?:|mailto:)/.test(href)) continue;
      if (!existsSync(resolve(root, dirname(p), href)))
        errors.push(p + ": broken local link " + href);
    }
  }
  if (base) {
    try {
      const old = JSON.parse(
        execFileSync("git", ["show", base + ":docs/ZAPRUDA_FEATURES.json"], {
          cwd: root,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }),
      );
      for (const f of old.features)
        if (!seen.has(f.id) && !log.includes("FEATURE-ID-CHANGE:" + f.id + ":"))
          errors.push("Removed/renamed ID without decision: " + f.id);
    } catch (e) {
      // A pre-contract base has no registry; original immutable matrix still supplies the baseline.
      const paths = execFileSync(
        "git",
        ["ls-tree", "--name-only", base, "docs/ZAPRUDA_FEATURES.json"],
        { cwd: root, encoding: "utf8" },
      );
      if (paths.trim()) errors.push("Cannot compare base registry: " + e.message);
    }
  }
  return errors;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const errors = check();
  if (errors.length) {
    for (const e of errors) console.error("CONTRACT ERROR: " + e);
    process.exitCode = 1;
  } else
    console.log(
      "PASS: all 56 original IDs, statuses, fields, sources and document links preserved. This is NOT release approval.",
    );
}
