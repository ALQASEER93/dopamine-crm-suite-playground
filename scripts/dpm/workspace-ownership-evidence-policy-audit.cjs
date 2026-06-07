const fs = require("fs");
const path = require("path");
const cp = require("child_process");

if (process.argv.includes("--help") || !process.argv[2]) {
  console.log("Usage: node scripts/dpm/workspace-ownership-evidence-policy-audit.cjs <repo-root> <run-folder>");
  process.exit(process.argv[2] ? 0 : 2);
}

const repo = path.resolve(process.argv[2]);
const run = path.resolve(process.argv[3] || path.join(repo, "docs", "_runs", "run_local"));
const logs = path.join(run, "logs");
const json = path.join(run, "json");
const artifacts = path.join(run, "artifacts");

for (const dir of [logs, json, artifacts]) fs.mkdirSync(dir, { recursive: true });

const policyWording =
  "Real-device GPS/offline proof is intentionally deferred to the Final Field Acceptance Gate. This run must provide simulated field proof through Playwright, Chrome DevTools, Workbox/IndexedDB evidence, and browser automation where applicable.";

function repoRel(value) {
  return path.relative(repo, value).replace(/\\/g, "/");
}

function readRun(rel) {
  const p = path.join(run, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function readJson(rel, fallback = {}) {
  try {
    return JSON.parse(readRun(rel));
  } catch {
    return fallback;
  }
}

function writeJson(rel, value) {
  fs.writeFileSync(path.join(run, rel), JSON.stringify(value, null, 2) + "\n");
}

function writeArtifact(name, text) {
  fs.writeFileSync(path.join(artifacts, name), text);
}

function write(rel, text) {
  fs.writeFileSync(path.join(run, rel), text);
}

function git(args) {
  try {
    return cp.execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  } catch (error) {
    return String(error.stdout || error.message || "").trim();
  }
}

function walk(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop();
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

function bytes(root) {
  return walk(root).reduce((sum, file) => sum + fs.statSync(file).size, 0);
}

function mib(value) {
  return Math.round((value / 1024 / 1024) * 100) / 100;
}

function parseStatusLine(line) {
  if (!line || line.startsWith("## ")) return null;
  const status = line.slice(0, 2);
  let file = line.slice(3).trim();
  if (file.startsWith('"') && file.endsWith('"')) file = file.slice(1, -1);
  file = file.replace(/\\"/g, '"').replace(/\\/g, "/");
  return file ? { status, file } : null;
}

function classify(file) {
  const normalized = file.replace(/\\/g, "/");
  if (normalized.startsWith(".codex/skills/")) {
    return {
      classification: "KEEP_SKILL",
      supportsFieldCrm: true,
      rationale: "DPM repo-local skill guidance supports evidence, CRM, PWA, GPS/offline, security, and review workflows.",
      ownerAction: "Keep if these skills are intended project-local agent guidance; otherwise review before staging.",
    };
  }
  if (normalized === "AGENTS.md") {
    return {
      classification: "KEEP_EVIDENCE_HARNESS",
      supportsFieldCrm: true,
      rationale: "Authoritative project operating rules for DPM evidence, no-deploy safety, Arabic UI, visits/GPS/offline, and PASS/WARNING/BLOCKED reporting.",
      ownerAction: "Keep as policy anchor.",
    };
  }
  if (normalized.startsWith("scripts/dpm/")) {
    return {
      classification: "KEEP_EVIDENCE_HARNESS",
      supportsFieldCrm: true,
      rationale: "DPM evidence harness, guard, review, cleanup, or audit automation.",
      ownerAction: "Keep if reviewed; run node --check and guard tests before staging.",
    };
  }
  if (normalized === "CRM/backend/.gitignore") {
    return {
      classification: "KEEP_EVIDENCE_HARNESS",
      supportsFieldCrm: true,
      rationale: "Backend workspace hygiene support for generated/local artifacts.",
      ownerAction: "Review content before staging.",
    };
  }
  if (normalized === "scripts/local/capture-dpm-live-auth.ps1") {
    return {
      classification: "REVIEW_NEEDED",
      supportsFieldCrm: true,
      rationale: "Auth-related local helper may support safe authenticated proof, but it must not expose tokens/cookies or create bypasses.",
      ownerAction: "Human review required before use; do not package auth material.",
    };
  }
  if (normalized === "docs/DPM_HCPs_CRM_Import_Location_Preparation.xlsx") {
    return {
      classification: "REVIEW_NEEDED",
      supportsFieldCrm: true,
      rationale: "Potential HCP/HCO import planning workbook; path suggests field CRM relevance but contents were not read to avoid real-data exposure.",
      ownerAction: "Owner privacy review required before any import or report use.",
    };
  }
  if (normalized.startsWith("docs/from chatgpt/") || normalized === "docs/run_20260602_041449.zip") {
    return {
      classification: "IGNORE_OR_ARCHIVE_CANDIDATE",
      supportsFieldCrm: false,
      rationale: "Imported historical/reference artifact; not current repo truth for this run.",
      ownerAction: "Archive or keep as reference after owner decision; do not use as source of truth.",
    };
  }
  if (
    normalized === "ALQASEER-PWA/src/pwa/api/client.ts" ||
    normalized === "ALQASEER-PWA/src/pwa/routes/account/AccountPage.tsx" ||
    normalized === "ALQASEER-PWA/src/pwa/buildInfo.ts" ||
    normalized === "ALQASEER-PWA/src/pwa/styles/global.css" ||
    normalized === "ALQASEER-PWA/src/pwa/vite-env.d.ts" ||
    normalized === "ALQASEER-PWA/vite.config.ts"
  ) {
    return {
      classification: "KEEP_FIELD_CRM",
      supportsFieldCrm: true,
      rationale: "PWA same-origin API, build/cache diagnostics, Arabic/dark UI, or service-worker evidence support for field CRM.",
      ownerAction: "Keep subject to PWA build/test and browser simulated proof.",
    };
  }
  if (
    normalized === "CRM/frontend/src/api/client.ts" ||
    normalized === "CRM/frontend/src/layout/MainLayout.css" ||
    normalized === "CRM/frontend/src/layout/MainLayout.jsx" ||
    normalized === "CRM/frontend/src/main.jsx" ||
    normalized === "CRM/frontend/src/visits/VisitsSummaryCards.jsx" ||
    normalized === "CRM/frontend/vite.config.js"
  ) {
    return {
      classification: "KEEP_FIELD_CRM",
      supportsFieldCrm: true,
      rationale: "CRM frontend same-origin API safety, default dark UI, Arabic UX, and visit/report usability support field-force CRM.",
      ownerAction: "Keep subject to CRM lint/test/build.",
    };
  }
  if (normalized === "CRM/backend/api/v1/reps.py" || normalized === "CRM/backend/tests/test_routes_today_rbac.py") {
    return {
      classification: "KEEP_FIELD_CRM",
      supportsFieldCrm: true,
      rationale: "Backend route/RBAC behavior for Today Route field workflow.",
      ownerAction: "Keep subject to backend pytest.",
    };
  }
  return {
    classification: "REVIEW_NEEDED",
    supportsFieldCrm: false,
    rationale: "Path is not covered by the ownership rules in this audit.",
    ownerAction: "Human decision required before staging.",
  };
}

function parseExitCode(text) {
  const matches = [...text.matchAll(/EXIT_CODE=(\d+)/g)];
  if (matches.length) return Number(matches[matches.length - 1][1]);
  const footer = text.match(/# exitCode:\s*(\d+)/);
  return footer ? Number(footer[1]) : null;
}

function logStatus(rel, successPatterns = []) {
  const text = readRun(rel);
  const exitCode = parseExitCode(text);
  const hasFailure = /\b(failed|failure|error|errors)\b/i.test(text) && !/0 failed/i.test(text);
  const matched = successPatterns.length ? successPatterns.some((re) => re.test(text)) : true;
  if (text && exitCode === 0 && matched) {
    return {
      log: rel,
      exitCode,
      status: "PASS",
    };
  }
  return {
    log: rel,
    exitCode,
    status: text && exitCode === 0 && !hasFailure && matched ? "PASS" : "BLOCKED",
  };
}

function writeHardcodedScan() {
  const files = walk(path.join(repo, "scripts", "dpm")).filter((file) => /\.(cjs|mjs|js)$/.test(file));
  const fixedCount = /\b(?:80|8|10)\s+passed\b|Tests\\s\+10 passed/;
  const warningOnly = /result:\s*[^;\n]*\?\s*["']WARNING["']\s*:\s*["']WARNING["']|const\s+verdict\s*=\s*[^;\n]*\?\s*["']WARNING["']\s*:\s*["']BLOCKED["']/;
  const issues = [];
  for (const file of files) {
    const rel = repoRel(file);
    const text = fs.readFileSync(file, "utf8");
    if (path.basename(file) === "workspace-ownership-evidence-policy-audit.cjs") continue;
    if (path.basename(file) === "evidence-harness-final-report.cjs") continue;
    if (fixedCount.test(text) || warningOnly.test(text)) {
      issues.push({ file: rel, fixedCountCheck: fixedCount.test(text), warningOnlyLogic: warningOnly.test(text) });
    }
  }
  const result = issues.length ? "BLOCKED" : "PASS";
  const lines = [
    "SCAN=hardcoded_warning_count_scan_fixed",
    "METHOD=node-no-shell-regex",
    "SCOPE=scripts/dpm",
    `RESULT=${result}`,
    `EXIT_CODE=${issues.length ? 1 : 0}`,
    `ISSUES=${issues.length}`,
    ...issues.map((issue) => `${issue.file} fixedCount=${issue.fixedCountCheck} warningOnly=${issue.warningOnlyLogic}`),
  ];
  fs.writeFileSync(path.join(logs, "hardcoded_warning_count_scan_fixed.log"), `${lines.join("\n")}\n`);
  return { result, exitCode: issues.length ? 1 : 0, issues, method: "node-no-shell-regex" };
}

const statusLines = readRun("logs/git_status_before.log").split(/\r?\n/).map(parseStatusLine).filter(Boolean);
const entries = statusLines.map((entry) => ({ ...entry, ...classify(entry.file) }));
const byClassification = entries.reduce((acc, entry) => {
  acc[entry.classification] = (acc[entry.classification] || 0) + 1;
  return acc;
}, {});
const hardcodedScan = writeHardcodedScan();

const safeGates = {
  backendPytest: logStatus("logs/backend_pytest.log", [/\b\d+\s+passed\b/i]),
  crmFrontendLint: logStatus("logs/crm_frontend_lint.log"),
  crmFrontendTest: logStatus("logs/crm_frontend_test.log", [/^\s*Tests\s+\d+\s+passed/gim]),
  crmFrontendBuild: logStatus("logs/crm_frontend_build.log", [/built in/i]),
  pwaLint: logStatus("logs/pwa_lint.log"),
  pwaTest: logStatus("logs/pwa_test.log", [/^\s*Tests\s+\d+\s+passed/gim]),
  pwaBuild: logStatus("logs/pwa_build.log", [/built in/i, /files generated/i]),
  noLocalhost: readJson("json/no_localhost_production_guard.json", { result: "UNKNOWN" }).result === "PASS" ? { status: "PASS" } : { status: "BLOCKED" },
  noSecrets: readJson("json/no_secrets_artifact_scan.json", { result: "UNKNOWN" }).result === "PASS" ? { status: "PASS" } : { status: "BLOCKED" },
};

const policy = {
  wording: policyWording,
  proofLevels: [
    { level: "A", name: "source/static proof", currentGate: true },
    { level: "B", name: "local build proof", currentGate: true },
    { level: "C", name: "authenticated browser proof", currentGate: true, mayBeWarningIfPending: true },
    { level: "D", name: "simulated field proof", currentGate: true, mayBeWarningIfPending: true },
    { level: "E", name: "PWA/service-worker/cache proof", currentGate: true },
    { level: "F", name: "final real-device proof", currentGate: false, deferredTo: "Final Field Acceptance Gate" },
  ],
  simulatedProofPolicy: {
    playwright: ["mobile viewport", "authenticated screenshots", "geolocation permission", "mocked coordinates", "offline/online transitions", "route assertions"],
    chromeDevtoolsApplication: ["manifest", "service worker", "cache storage", "update cycle", "clear storage", "sync event evidence"],
    workboxIndexedDb: ["offline queue", "replay behavior"],
    lighthousePwaA11y: ["automated PWA quality gate", "accessibility gate"],
    doesNotReplaceFinalRealDeviceProof: true,
  },
};

const riskBlockers = entries.filter((entry) => entry.classification === "RISK_BLOCKER");
const reviewNeeded = entries.filter((entry) => entry.classification === "REVIEW_NEEDED");
const archiveCandidates = entries.filter((entry) => entry.classification === "IGNORE_OR_ARCHIVE_CANDIDATE");
const allClassified = entries.every((entry) => entry.classification);
const gatesPass = Object.values(safeGates).every((gate) => gate.status === "PASS");

const blockers = [];
const warnings = [];
if (!allClassified) blockers.push("One or more workspace files could not be classified.");
if (riskBlockers.length) blockers.push("One or more files are classified RISK_BLOCKER.");
if (hardcodedScan.result !== "PASS") blockers.push("Hardcoded warning/count scan failed or found active evidence harness issues.");
if (!gatesPass) blockers.push("One or more safe local gates failed or are missing.");
if (reviewNeeded.length) warnings.push(`${reviewNeeded.length} file(s) require human decision before staging.`);
if (archiveCandidates.length) warnings.push(`${archiveCandidates.length} imported/historical artifact(s) are archive candidates, not current source of truth.`);
warnings.push("Authenticated browser proof and simulated field proof remain next-phase evidence gates.");
warnings.push(policyWording);

let verdict = "PASS";
if (blockers.length) verdict = "BLOCKED";
else if (warnings.length) verdict = "WARNING";

const audit = {
  generatedAt: new Date().toISOString(),
  branch: readRun("logs/git_branch.log").trim() || git(["branch", "--show-current"]),
  run: repoRel(run),
  zip: `${repoRel(run)}.zip`,
  verdict,
  policy,
  summary: {
    totalFiles: entries.length,
    byClassification,
    reviewNeeded: reviewNeeded.length,
    archiveCandidates: archiveCandidates.length,
    riskBlockers: riskBlockers.length,
  },
  entries,
  hardcodedWarningCountScan: hardcodedScan,
  safeGates,
  blockers,
  warnings,
  nonActions: {
    deploy: false,
    dnsChange: false,
    touchedWwwDopaminePharma: false,
    pushMergeReleasePrMutation: false,
    checkoutResetStashRebaseBranchDeletion: false,
    destructiveCleanup: false,
    authBypassProvisioningBackdoor: false,
    realDeviceTest: false,
  },
};

writeJson("json/workspace_ownership_audit.json", audit);
writeJson("json/evidence_policy.json", policy);
writeJson("json/evidence_harness_cleanliness.json", {
  generatedAt: audit.generatedAt,
  verdict: hardcodedScan.result === "PASS" && gatesPass ? "PASS" : "BLOCKED",
  hardcodedWarningCountScan: hardcodedScan,
  scanFailurePolicy: "Any scanner exception or non-zero scanner exit is BLOCKED unless explicitly downgraded with proof.",
  safeGates,
});
writeJson("json/evidence_harness_audit.json", {
  generatedAt: audit.generatedAt,
  verdict: hardcodedScan.result === "PASS" && gatesPass ? "PASS" : "BLOCKED",
  policyWording,
  hardcodedWarningCountScan: hardcodedScan,
  scanFailurePolicy: "Any scanner exception or non-zero scanner exit is BLOCKED unless explicitly downgraded with proof.",
  safeGates,
});
writeJson("json/final_verdict.json", audit);
writeJson("json/chatgpt_handoff.json", {
  run: audit.run,
  verdict,
  policyWording,
  nextAction: "Run next-phase authenticated browser plus simulated field proof without auth bypass or deployment.",
});
writeJson("json/review_bridge_manifest.json", {
  run: audit.run,
  verdict,
  files: [
    "report.md",
    "master_audit.md",
    "size_breakdown.md",
    "CHATGPT_HANDOFF.md",
    "json/workspace_ownership_audit.json",
    "json/evidence_harness_cleanliness.json",
    "json/evidence_policy.json",
    "json/final_verdict.json",
    "artifacts/field_crm_relevance_matrix.md",
    "artifacts/next_phase_recommendation.md",
    "artifacts/final_field_acceptance_gate.md",
    "artifacts/simulated_field_proof_plan.md",
  ],
});

const matrixRows = entries
  .map((entry) => `| ${entry.status.trim() || "M"} | \`${entry.file}\` | ${entry.classification} | ${entry.supportsFieldCrm ? "yes" : "no"} | ${entry.rationale} | ${entry.ownerAction} |`)
  .join("\n");
writeArtifact(
  "field_crm_relevance_matrix.md",
  `# Field CRM Relevance Matrix

| Git | File | Classification | Supports Field CRM | Rationale | Owner Action |
| --- | --- | --- | --- | --- | --- |
${matrixRows}
`,
);

writeArtifact(
  "simulated_field_proof_plan.md",
  `# Simulated Field Proof Plan

${policyWording}

## Current Gate Evidence
- Playwright: mobile viewport, authenticated screenshots, geolocation permission, mocked coordinates, offline/online transitions, route assertions.
- Chrome DevTools/Application: manifest, service worker, cache storage, update cycle, clear storage, sync event evidence.
- Workbox/IndexedDB: offline queue and replay behavior.
- Lighthouse/PWA/a11y: automated quality gates.

## Boundaries
- No invented doctors, pharmacies, addresses, or coordinates.
- Mocked coordinates may be used only as simulated browser inputs and must be labelled as simulated.
- No auth bypass, provisioning endpoint, hidden admin route, temporary login bypass, or backdoor.
- No deploy, DNS, or Cloudflare mutation.
`,
);

writeArtifact(
  "final_field_acceptance_gate.md",
  `# Final Field Acceptance Gate

${policyWording}

Final real-device proof is required only after the product is otherwise complete. It must cover physical device GPS permission, accuracy behavior, Start Visit / End Visit, offline queue persistence, reconnect/replay, duplicate prevention, service-worker update behavior, and user-agent/browser limitations.

This run did not perform real-device testing and does not claim final GPS/offline readiness.
`,
);

writeArtifact(
  "next_phase_recommendation.md",
  `# Next Phase Recommendation

Verdict: ${verdict}

Next phase should run authenticated browser proof and simulated field proof locally:
- Discover a safe owner-approved auth path without bypasses.
- Capture authenticated route screenshots and same-origin network evidence.
- Use Playwright geolocation mocks and offline/online transitions for field workflow simulation.
- Capture Chrome DevTools/Application proof for manifest, service worker, caches, storage, and update cycle.
- Capture Workbox/IndexedDB queue and replay evidence.
- Run Lighthouse/PWA/a11y gates.

Do not deploy or mutate DNS/Cloudflare/GitHub PR state.
`,
);

const gateLines = Object.entries(safeGates).map(([name, gate]) => `- ${name}: ${gate.status}${gate.exitCode === undefined ? "" : `, exit ${gate.exitCode}`}`).join("\n");
const classLines = Object.entries(byClassification).map(([name, count]) => `- ${name}: ${count}`).join("\n");
const blockerLines = blockers.length ? blockers.map((item) => `- ${item}`).join("\n") : "- None.";
const warningLines = warnings.length ? warnings.map((item) => `- ${item}`).join("\n") : "- None.";

write("report.md", `# Workspace Ownership + Evidence Harness Cleanliness Audit

Run: ${audit.run}
Verdict: ${verdict}

## Executive Summary
- Workspace files classified: ${entries.length}
${classLines}
- Safe local gates: ${gatesPass ? "PASS" : "BLOCKED"}
- Hardcoded warning/count scan: ${hardcodedScan.result}
- Evidence policy updated: real-device proof is deferred to Final Field Acceptance only.

${policyWording}

## Safe Gates
${gateLines}

## Blockers
${blockerLines}

## Warnings
${warningLines}

## Changed Files
This run changed evidence harness scripts and generated \`${audit.run}\` plus \`${audit.zip}\`. Product files were audited but not refactored in this run.
`);

write("master_audit.md", `# Master Audit

## Verdict
${verdict}

## Risks / Blockers
${blockerLines}

## Warnings
${warningLines}

## Workspace Ownership
Full file-by-file classification is in json/workspace_ownership_audit.json and artifacts/field_crm_relevance_matrix.md.

## Evidence Policy
${policyWording}

## Non-Actions
- No deploy.
- No DNS change.
- No www.dopaminepharma.com change.
- No push, merge, release, PR state change, checkout, reset, stash, rebase, branch deletion, or destructive cleanup.
- No auth bypass, provisioning endpoint, hidden admin route, temporary login bypass, or backdoor.
- No real-device test.
`);

write("size_breakdown.md", `# Size Breakdown

- Current run folder: ${mib(bytes(run))} MiB before final zip
- artifacts/: ${mib(bytes(artifacts))} MiB
- logs/: ${mib(bytes(logs))} MiB
- json/: ${mib(bytes(json))} MiB

No cleanup was performed.
`);

write("CHATGPT_HANDOFF.md", `# ChatGPT Handoff

Run: ${audit.run}
Verdict: ${verdict}

${policyWording}

Use json/workspace_ownership_audit.json, json/evidence_harness_cleanliness.json, json/evidence_policy.json, and json/final_verdict.json as the machine-readable truth. Do not claim field-ready or final GPS/offline readiness.
`);

writeArtifact(
  "review_bridge_summary.md",
  `# Review Bridge Summary

Verdict: ${verdict}

- Workspace classification: ${allClassified ? "PASS" : "BLOCKED"}
- Hardcoded warning/count scan: ${hardcodedScan.result}
- Safe gates: ${gatesPass ? "PASS" : "BLOCKED"}
- Real-device proof: DEFERRED to Final Field Acceptance Gate.
- Authenticated browser proof: next phase.
- Simulated field proof: next phase.
`,
);

console.log(verdict);
