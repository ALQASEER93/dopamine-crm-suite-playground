const fs = require("fs");
const path = require("path");

if (process.argv.includes("--help")) {
  console.log("Usage: node red-team-abuse-checklist-generator.cjs <run-folder>");
  process.exit(0);
}

const run = path.resolve(process.argv[2] || path.join("docs", "_runs", "run_20260602_053602"));
const src = path.join(run, "json", "red_team_abuse_scenarios.json");
let scenarios = [];
if (fs.existsSync(src)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(src, "utf8"));
    scenarios = Array.isArray(parsed) ? parsed : Object.values(parsed).flat().filter(x => typeof x === "object" || typeof x === "string");
  } catch {
    scenarios = [];
  }
}
if (!scenarios.length) {
  scenarios = ["GPS spoofing", "duplicate offline replay", "RBAC bypass", "export leakage", "visit timestamp tampering", "direct API access outside same-origin proxy"];
}
const rows = scenarios.map((s, i) => ({ id: `RT-${String(i + 1).padStart(2, "0")}`, scenario: typeof s === "string" ? s : (s.title || s.name || JSON.stringify(s).slice(0, 120)), status: "PENDING_PHASE_B_VALIDATION" }));
const out = { result: "WARNING", source: fs.existsSync(src) ? "json/red_team_abuse_scenarios.json" : "fallback", rows };
fs.mkdirSync(path.join(run, "json"), { recursive: true });
fs.mkdirSync(path.join(run, "artifacts", "phase0_installation", "generated_checklists"), { recursive: true });
fs.writeFileSync(path.join(run, "json", "red_team_abuse_checklist.json"), JSON.stringify(out, null, 2) + "\n");
fs.writeFileSync(path.join(run, "artifacts", "phase0_installation", "generated_checklists", "red-team-abuse-checklist.md"),
  `# Red Team Abuse Checklist\n\nResult: WARNING\n\n${rows.map(r => `- [ ] ${r.id}: ${r.scenario} (${r.status})`).join("\n")}\n`);
console.log("WARNING");
