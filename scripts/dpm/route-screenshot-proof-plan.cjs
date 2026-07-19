const fs = require("fs");
const path = require("path");

if (process.argv.includes("--help")) {
  console.log("Usage: node route-screenshot-proof-plan.cjs <run-folder>");
  process.exit(0);
}

const run = path.resolve(process.argv[2] || path.join("docs", "_runs", "run_20260602_053602"));
const routes = ["/account", "/customers", "/customers/:customerType/:customerId", "/visits", "/today-route", "/live-map", "/visit-session/:visitId", "/reports"];
const checks = routes.map(route => ({
  route,
  requiredEvidence: ["desktop screenshot", "mobile/tablet screenshot", "Arabic/RTL proof", "dark mode proof", "auth/RBAC proof"],
  status: "PENDING_OWNER_OR_PHASE_B"
}));
const out = { result: "WARNING", reason: "Screenshots were not captured in Phase 0; this is the route proof plan.", checks };
fs.mkdirSync(path.join(run, "json"), { recursive: true });
fs.mkdirSync(path.join(run, "artifacts", "phase0_installation", "generated_checklists"), { recursive: true });
fs.writeFileSync(path.join(run, "json", "route_screenshot_proof_plan.json"), JSON.stringify(out, null, 2) + "\n");
fs.writeFileSync(path.join(run, "artifacts", "phase0_installation", "generated_checklists", "route-screenshot-proof-plan.md"),
  `# Route Screenshot Proof Plan\n\nResult: WARNING\n\n${checks.map(c => `## ${c.route}\n${c.requiredEvidence.map(e => `- [ ] ${e}`).join("\n")}\nStatus: ${c.status}`).join("\n\n")}\n`);
console.log("WARNING");
