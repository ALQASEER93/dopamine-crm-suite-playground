const fs = require("fs");
const path = require("path");

if (process.argv.includes("--help")) {
  console.log("Usage: node service-worker-cache-bust-check.cjs <repo-root> <run-folder>");
  process.exit(0);
}

const repo = path.resolve(process.argv[2] || ".");
const run = path.resolve(process.argv[3] || path.join(repo, "docs", "_runs", "run_20260602_053602"));
const roots = ["ALQASEER-PWA/public", "ALQASEER-PWA/src"];
const extraFiles = ["ALQASEER-PWA/package.json", "ALQASEER-PWA/vite.config.ts", "ALQASEER-PWA/vite.config.js"];
const found = [];
const signals = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", "build", ".git", ".venv", "playwright-report", "test-results"].includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (/service-worker|sw\.|manifest|version|cache/i.test(ent.name)) inspect(full);
  }
}

function inspect(file) {
  const rel = path.relative(repo, file).replace(/\\/g, "/");
  found.push(rel);
  if (/\.(js|ts|json|html|txt|md)$/i.test(file)) {
    const text = fs.readFileSync(file, "utf8");
    for (const [name, re] of Object.entries({
      cacheName: /cache[-_ ]?name/i,
      versionSignal: /(version|build|revision|timestamp)/i,
      skipWaiting: /skipWaiting/i,
      clientsClaim: /clients\.claim/i
    })) {
      if (re.test(text)) signals.push({ file: rel, signal: name });
    }
  }
}

for (const r of roots) walk(path.join(repo, r));
for (const rel of extraFiles) {
  const full = path.join(repo, rel);
  if (fs.existsSync(full)) inspect(full);
}
const result = found.length ? "WARNING" : "BLOCKED";
const out = { result, filesFound: [...new Set(found)], signals };
fs.mkdirSync(path.join(run, "json"), { recursive: true });
fs.mkdirSync(path.join(run, "artifacts", "phase0_installation", "generated_checklists"), { recursive: true });
fs.writeFileSync(path.join(run, "json", "service_worker_cache_bust_check.json"), JSON.stringify(out, null, 2) + "\n");
fs.writeFileSync(path.join(run, "artifacts", "phase0_installation", "generated_checklists", "service-worker-cache-bust-check.md"),
  `# Service Worker Cache Bust Check\n\nResult: ${result}\n\nFiles found:\n${out.filesFound.map(f => `- ${f}`).join("\n") || "- none"}\n\nSignals:\n${signals.map(s => `- ${s.file}: ${s.signal}`).join("\n") || "- none"}\n\nThis is read-only planning evidence, not product-code verification.\n`);
console.log(result);
if (result === "BLOCKED") process.exit(1);
