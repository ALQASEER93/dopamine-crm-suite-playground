const fs = require("fs");
const path = require("path");

if (process.argv.includes("--help")) {
  console.log("Usage: node figma-reference-check.cjs <run-folder>");
  process.exit(0);
}

const run = path.resolve(process.argv[2] || path.join("docs", "_runs", "run_20260602_053602"));
const candidateUrl = "https://www.figma.com/board/ealD8crmWgRpGyIQXX9Nmf";
const jam = path.join(run, "artifacts", "external_inputs", "from_chatgpt", "DPM CRM Field-Force Operating Map.jam");
const out = {
  result: "WARNING",
  candidateUrl,
  jamFileCopied: fs.existsSync(jam),
  figmaAccessVerified: false,
  status: "OWNER_ACTION_REQUIRED",
  requiredExports: ["mobile route screenshots", "tablet visit lifecycle screenshots", "admin dashboard screenshots", "customer 360 screenshots", "reports/exports screenshots"]
};
fs.mkdirSync(path.join(run, "json"), { recursive: true });
fs.mkdirSync(path.join(run, "artifacts", "phase0_installation", "generated_checklists"), { recursive: true });
fs.writeFileSync(path.join(run, "json", "figma_reference_check.json"), JSON.stringify(out, null, 2) + "\n");
fs.writeFileSync(path.join(run, "artifacts", "phase0_installation", "generated_checklists", "figma-reference-check.md"),
  `# Figma/FigJam Reference Check\n\nResult: WARNING\n\nCandidate URL: ${candidateUrl}\n\nJam file copied: ${out.jamFileCopied}\n\nFigma access verified: false\n\nStatus: OWNER_ACTION_REQUIRED\n\nRequired exports:\n${out.requiredExports.map(x => `- ${x}`).join("\n")}\n`);
console.log("WARNING");
