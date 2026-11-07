/** Read-only Git inventory. Does not merge, close PRs, delete branches or apply SQL. */
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [code, spec, sourceFile, outputDirectory] = process.argv.slice(2);
if (!/^[a-f0-9]{40}$/.test(code || "") || !/^[a-f0-9]{40}$/.test(spec || ""))
  throw new Error("Pass exact code and canonical documentation SHAs");
const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }).trim();
const source = JSON.parse(readFileSync(sourceFile, "utf8"));
const prs = source.pull_requests;
const ancestor = (a, b) => {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", a, b], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const branches = git(
  "for-each-ref",
  "--format=%(refname:short)\t%(objectname)\t%(symref)",
  "refs/remotes/origin/",
)
  .split("\n")
  .filter(Boolean)
  .filter((line) => !line.split("\t")[2])
  .map((line) => {
    const [ref, sha] = line.split("\t"),
      name = ref.replace(/^origin\//, "");
    const [behind, ahead] = git("rev-list", "--left-right", "--count", code + "..." + sha)
      .split(/\s+/)
      .map(Number);
    const patches = git("cherry", code, sha).split("\n").filter(Boolean);
    return {
      name,
      sha,
      behind,
      ahead,
      ancestor_of_code: ancestor(sha, code),
      ancestor_of_spec: ancestor(sha, spec),
      unique_patches: patches.filter((x) => x.startsWith("+")).length,
      equivalent_patches: patches.filter((x) => x.startsWith("-")).length,
      open_prs: prs.filter((p) => p.head === name).map((p) => p.number),
      disposition:
        "PRESERVE; ancestry/patch equivalence does not prove schema deployment or feature acceptance",
    };
  });
const missing = source.branches.filter(
  (b) => !branches.some((x) => x.name === b.name && x.sha === b.sha),
);
if (missing.length)
  throw new Error(
    "Fetched refs differ from source snapshot: " + missing.map((x) => x.name).join(", "),
  );
const sharedHeads = [...new Set(prs.map((p) => p.sha))]
  .map((sha) => prs.filter((p) => p.sha === sha))
  .filter((rows) => rows.length > 1);
const inventory = {
  recorded_at_utc: new Date().toISOString(),
  code_sha: code,
  specification_sha: spec,
  main_sha: branches.find((b) => b.name === "main")?.sha,
  scope:
    "read-only remote-ref and open-PR inventory; not authorization to reorganize Git or repeat SQL",
  branches,
  pull_requests: prs,
  shared_pr_heads: sharedHeads,
  branch_count: branches.length,
  open_pr_count: prs.length,
};
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  resolve(outputDirectory, "branch-pr-inventory.json"),
  JSON.stringify(inventory, null, 2) + "\n",
);
const rows = branches
  .map(
    (b) =>
      `| ${b.name} | \`${b.sha}\` | ${b.ancestor_of_code ? "yes" : "no"} | ${b.unique_patches} | ${b.equivalent_patches} | ${b.open_prs.map((n) => "#" + n).join(", ") || "—"} |`,
  )
  .join("\n");
writeFileSync(
  resolve(outputDirectory, "BRANCH_PR_INVENTORY.md"),
  `# Read-only branch/PR inventory\n\nCode \`${code}\`; canonical specification \`${spec}\`. ${branches.length} fetched remote branches, ${prs.length} open PRs. No branches or PRs changed by this inventory.\n\nAn ancestor or equivalent patch is not proof of a deployed migration, working endpoint, accepted UI, or a completed module. Preserve every branch until its dependencies and unique work are reviewed.\n\n| Branch | SHA | Ancestor of code | Unique patches | Equivalent patches | Open PRs |\n|---|---|---|---:|---:|---|\n${rows}\n\n## Shared heads, different PR targets\n\n${sharedHeads.map((ps) => ps.map((p) => "#" + p.number + " → " + p.base).join("; ")).join("\n\n")}\n\nThese are review candidates, not permission to close, retarget, delete, or merge. STAGING-only SQL and Production changes must never be integrated just because their patch is absent from the branch.\n`,
);
console.log(
  JSON.stringify({
    branches: branches.length,
    openPRs: prs.length,
    sharedHeads: sharedHeads.length,
    outputDirectory,
  }),
);
