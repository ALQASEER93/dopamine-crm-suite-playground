const fs = require("fs");
const path = require("path");

if (process.argv.includes("--help")) {
  console.log("Usage: node no-localhost-production-guard.cjs <repo-root> <run-folder>");
  process.exit(0);
}

const repo = path.resolve(process.argv[2] || ".");
const run = path.resolve(process.argv[3] || path.join(repo, "docs", "_runs", "run_localhost_guard"));

const sourceRoots = [
  "CRM/frontend",
  "ALQASEER-PWA",
  "shared",
  "docs",
  "scripts/dpm",
];
const distRoots = ["CRM/frontend/dist", "ALQASEER-PWA/dist"];
const skipDirs = new Set([
  "node_modules",
  ".git",
  ".venv",
  "__pycache__",
  "playwright-report",
  "test-results",
  "_runs",
  "_runs_archive_reports",
]);
const sourceSkipDirs = new Set(["dist", "build"]);
const scanFileRe = /\.(js|jsx|ts|tsx|mjs|cjs|json|html|css|env|md|txt|yml|yaml|ps1)$/i;
const patterns = [
  { name: "localhost", re: /localhost/ig },
  { name: "127.0.0.1", re: /127\.0\.0\.1/g },
  { name: "direct-vercel-host", re: /https?:\/\/[^\s"'<>]+\.vercel\.app/ig },
];

const hits = [];

function normalize(value) {
  return value.replace(/\\/g, "/");
}

function exists(rel) {
  return fs.existsSync(path.join(repo, rel));
}

function walk(dir, options = {}) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(ent.name)) continue;
    if (options.skipBuildDirs && sourceSkipDirs.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full, options);
      continue;
    }
    if (scanFileRe.test(ent.name)) scan(full, options.scope || "source");
  }
}

function scan(file, scope) {
  const rel = normalize(path.relative(repo, file));
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const p of patterns) {
      if (p.re.test(line)) {
        hits.push({
          file: rel,
          line: idx + 1,
          pattern: p.name,
          category: classify(rel, scope, p.name, line),
          excerpt: "[REDACTED_LINE]",
        });
      }
      p.re.lastIndex = 0;
    }
  });
}

function classify(rel, scope, pattern, line) {
  if (scope === "dist") return "production_browser_bundle_risk";
  if (rel.startsWith("docs/_runs/") || rel.startsWith("docs/_runs_")) return "generated_evidence_or_archive";
  if (rel.startsWith("docs/") || rel.endsWith(".md") || rel.endsWith(".env.example")) return "dev_docs_or_examples";
  if (
    rel.includes("/tests/") ||
    rel.includes("/e2e/") ||
    rel.includes(".test.") ||
    rel.includes(".spec.") ||
    rel.includes("/playwright.") ||
    rel.includes("/scripts/smoke") ||
    rel === "scripts/RUN_SMOKE_LOCAL.ps1"
  ) {
    return "test_or_local_harness";
  }
  if (
    rel.startsWith("ALQASEER-PWA/functions/") ||
    rel.startsWith("ALQASEER-PWA/api/") ||
    rel.startsWith("ALQASEER-PWA/lib/server-") ||
    rel.endsWith("vite.config.ts") ||
    rel.endsWith("vite.config.js") ||
    rel.endsWith("vercel.json") ||
    rel.endsWith("next.config.mjs")
  ) {
    return "server_proxy_or_build_guard";
  }
  if (
    rel.startsWith("CRM/frontend/src/") ||
    rel.startsWith("ALQASEER-PWA/src/") ||
    rel.startsWith("ALQASEER-PWA/app/") ||
    rel.startsWith("ALQASEER-PWA/components/") ||
    rel.startsWith("ALQASEER-PWA/pages/")
  ) {
    if (
      pattern !== "direct-vercel-host" &&
      /(?:src\/api\/client\.ts|src\/pwa\/api\/client\.ts|src\/pwa\/buildInfo\.ts)$/.test(rel) &&
      /LOCAL_API_DEFAULT|import\.meta\.env\.DEV|Production .*blocked|same-origin|\/api\/v1|localHost|loopback|bindAll|localTld|vercelTld|isBlockedProductionApiUrl/.test(line)
    ) {
      return "browser_source_guarded_local_default";
    }
    if (
      pattern !== "direct-vercel-host" &&
      /src\/pwa\/routes\/account\/AccountPage\.tsx$/.test(rel) &&
      /localHost|loopback|vercelTld|isBlockedApiDisplayValue|محظور للإنتاج/.test(line)
    ) {
      return "browser_source_guarded_local_default";
    }
    return "browser_source_review";
  }
  return "other_review";
}

for (const root of sourceRoots) {
  walk(path.join(repo, root), { scope: "source", skipBuildDirs: true });
}
for (const root of distRoots) {
  walk(path.join(repo, root), { scope: "dist", skipBuildDirs: false });
}

const categories = {};
for (const hit of hits) {
  categories[hit.category] ||= [];
  categories[hit.category].push(hit);
}

const blockingCategories = ["production_browser_bundle_risk", "browser_source_review"];
const blockingHits = hits.filter((hit) => blockingCategories.includes(hit.category));
const result = blockingHits.length ? "BLOCKED" : "PASS";
const scanned = {
  sourceRoots: sourceRoots.filter(exists),
  distRoots: distRoots.filter(exists),
};
const summary = Object.fromEntries(
  Object.entries(categories).map(([category, entries]) => [category, entries.length]),
);
for (const category of blockingCategories) {
  summary[category] ||= 0;
}
const out = {
  result,
  policy: {
    blockingCategories,
    note:
      "Dev docs/examples, local test harnesses, server-side proxy targets, and generated evidence are retained but separated from production browser bundle risks.",
  },
  scanned,
  summary,
  blockingHits,
  hits,
};

fs.mkdirSync(path.join(run, "json"), { recursive: true });
fs.mkdirSync(path.join(run, "artifacts"), { recursive: true });
fs.writeFileSync(path.join(run, "json", "no_localhost_production_guard.json"), JSON.stringify(out, null, 2) + "\n");

const categoryLines = Object.entries(summary)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([category, count]) => `- ${category}: ${count}`)
  .join("\n") || "- none: 0";

const riskLines = blockingHits.length
  ? blockingHits.map((hit) => `- ${hit.file}:${hit.line} (${hit.pattern})`).join("\n")
  : "- None.";

const md = `# No Localhost Release Guard

Result: ${result}

Production/browser risk policy:
- Blocking categories: ${blockingCategories.join(", ")}
- Non-blocking categories remain visible in JSON and counts below.

Scanned source roots:
${scanned.sourceRoots.map((root) => `- ${root}`).join("\n") || "- none"}

Scanned production dist roots:
${scanned.distRoots.map((root) => `- ${root}`).join("\n") || "- none"}

Category counts:
${categoryLines}

Blocking production/browser hits:
${riskLines}

All matching source lines are redacted in generated evidence. Use file/line locations for local review without exposing secrets or environment values.
`;

fs.writeFileSync(path.join(run, "artifacts", "no_localhost_release_guard.md"), md);
console.log(`${result} blocking=${blockingHits.length} total=${hits.length}`);
if (blockingHits.length) process.exit(1);
