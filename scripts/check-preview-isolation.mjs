import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { sourceTokens } from "./source-tokens.mjs";

const client = readFileSync("src/integrations/supabase/client.ts", "utf8");
const clientTokens = sourceTokens(client);
const shell = readFileSync("src/components/Shell.tsx", "utf8");
const prod = "sonvniuwtvzzyuglscah";
const stage = "yudtbifopfnjtjanaqrd";

const matcher = /^deploy-preview-[0-9]+--zapruda1[.]netlify[.]app$/;
assert.equal(matcher.test("deploy-preview-54--zapruda1.netlify.app"), true);
assert.equal(matcher.test("zapruda1.netlify.app"), false);
assert.equal(matcher.test("evil-deploy-preview-54--zapruda1.netlify.app"), false);

assert.ok(
  clientTokens.includes('serverEnv?.["CONTEXT"]==="deploy-preview"'),
  "Missing server deploy-preview context",
);
assert.ok(
  client.includes(
    "/^deploy-preview-[0-9]+--zapruda1[.]netlify[.]app$/.test(window.location.hostname)",
  ),
  "Missing preview browser host guard",
);
assert.ok(
  clientTokens.includes('SUPABASE_URL="https://' + stage + '.supabase.co"'),
  "Preview not pinned to STAGING",
);
assert.ok(client.includes("SUPABASE_PUBLISHABLE_KEY = "), "Preview key assignment missing");
assert.ok(shell.includes("STAGING"), "Preview UI badge missing");

const match = client.match(/if \(isNetlifyPreview\) \{([\s\S]*?)\n  \}/);
assert.ok(match, "Missing preview override block");
assert.ok(!match[1].includes(prod), "PROD project referenced inside preview override");

console.log("PASS: Netlify preview STAGING source regression checks (not browser network E2E)");
