const fs = require("fs");
const path = require("path");

if (process.argv.includes("--help")) {
  console.log("Usage: node hcp-import-cleanroom-profiler.cjs <run-folder>");
  process.exit(0);
}

const run = path.resolve(process.argv[2] || path.join("docs", "_runs", "run_20260602_053602"));
const candidates = [
  path.join(run, "artifacts", "external_inputs", "from_chatgpt", "run_20260602_062500", "artifacts", "hcp_workbook_profile.json"),
  path.join(run, "artifacts", "external_inputs", "from_chatgpt", "run_20260602_062500", "artifacts", "hcp_workbook_profile.md")
];
const found = candidates.filter(fs.existsSync);
const requiredColumns = ["Name", "Representative Name", "Area Tag", "Client Tag", "Speciality", "Phone", "Email", "City", "Region", "Country", "Formatted Address"];
const out = {
  result: found.length ? "WARNING" : "BLOCKED",
  reason: found.length ? "Aggregate profile found; raw production import remains forbidden." : "No aggregate profile found.",
  profileInputs: found.map(f => path.relative(run, f).replace(/\\/g, "/")),
  requiredColumns,
  rules: ["do not import in Phase 0", "do not invent coordinates", "redact raw HCP/HCO data", "use Area Tag as initial territory backbone", "require owner privacy approval before real import"]
};
fs.mkdirSync(path.join(run, "json"), { recursive: true });
fs.mkdirSync(path.join(run, "artifacts", "phase0_installation", "generated_checklists"), { recursive: true });
fs.writeFileSync(path.join(run, "json", "hcp_import_cleanroom_profile.json"), JSON.stringify(out, null, 2) + "\n");
fs.writeFileSync(path.join(run, "artifacts", "phase0_installation", "generated_checklists", "hcp-import-cleanroom-profiler.md"),
  `# HCP Import Cleanroom Profiler\n\nResult: ${out.result}\n\nInputs:\n${out.profileInputs.map(f => `- ${f}`).join("\n") || "- none"}\n\nRequired columns:\n${requiredColumns.map(c => `- ${c}`).join("\n")}\n\nRules:\n${out.rules.map(r => `- ${r}`).join("\n")}\n`);
console.log(out.result);
if (out.result === "BLOCKED") process.exit(1);
