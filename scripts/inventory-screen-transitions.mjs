/** Read-only static navigation inventory. Dynamic/auth transitions still require actual E2E. */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const graph = JSON.parse(readFileSync("docs/ZAPRUDA_ROUTE_GRAPH.json", "utf8"));
const normalize = (v) => v.split(/[?#]/)[0].replace(/\/$/, "") || "/";
const known = new Set(graph.routes.map((r) => normalize(r.path)));
const edges = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const source = join(dir, entry.name);
    if (entry.isDirectory()) walk(source);
    else if (/\.tsx?$/.test(source) && !/\.test\.|routeTree\.gen/.test(source)) {
      const text = readFileSync(source, "utf8");
      const route =
        graph.routes.find((r) => r.source === source)?.path || "shared/conditional component";
      const targets = new Set();
      for (const m of text.matchAll(
        /(?:href|to)\s*[=:]\s*["'](\/[^"']*)["']|(?:location\.)?assign\(["'](\/[^"']*)["']\)/g,
      )) {
        const target = m[1] || m[2];
        if (/^\/brand\//.test(target) && existsSync(join("public", target.slice(1)))) continue;
        if (targets.has(target)) continue;
        targets.add(target);
        edges.push({
          from: route,
          to: target,
          source,
          line: text.slice(0, m.index).split("\n").length,
          registered: known.has(normalize(target)),
        });
      }
    }
  }
}
walk("src");
const data = {
  code: process.argv[2],
  scope:
    "static source links; shared components retain their actual visibility/role conditions; no JWT/hosted acceptance",
  registeredRouteDefinitions: graph.routes.length,
  edges,
};
writeFileSync(
  "qa/architecture-20261105/screen-transitions.json",
  JSON.stringify(data, null, 2) + "\n",
);
const rows = edges.map(
  (e) =>
    `| \`${e.from}\` | \`${e.to}\` | \`${e.source}:${e.line}\` | ${e.registered ? "registered" : "UNRESOLVED"} |`,
);
writeFileSync(
  "docs/ZAPRUDA_SCREEN_TRANSITIONS_20261105.md",
  [
    "# Переходы из фактического исходного кода",
    "",
    `Код: \`${data.code}\`. ${graph.routes.length} router definitions включают admin-layout и index; это не число различных визуальных экранов.`,
    "",
    "Общие компоненты имеют условную видимость: login, роль, STAGING, состояние сущности. Таблица не даёт новых прав. Query/hash сохраняются; наличие route не доказывает загрузку backend или anchor. Динамические переходы и все шаги форм проверяются отдельно настоящими JWT/browser E2E.",
    "",
    "| Источник перехода | Назначение | Код | Статус route |",
    "|---|---|---|---|",
    ...rows,
    "",
    "Критический пользовательский путь и границы: [единая карта](ZAPRUDA_SCREEN_MAP_20261105.md).",
  ].join("\n") + "\n",
);
console.log(
  JSON.stringify({
    edges: edges.length,
    unresolved: edges.filter((e) => !e.registered).map((e) => ({ source: e.source, to: e.to })),
  }),
);
if (edges.some((edge) => !edge.registered)) process.exitCode = 1;
