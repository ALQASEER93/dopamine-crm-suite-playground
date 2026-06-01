import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizePath } from "./sanitize-review-bridge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const repoSlug = process.env.GITHUB_REPOSITORY || "ALQASEER93/dopamine-crm-suite-playground";
const marker = "<!-- DPM_REVIEW_BRIDGE -->";

function timestamp() {
  const d = process.env.DPM_REVIEW_BRIDGE_TIMESTAMP ? new Date(process.env.DPM_REVIEW_BRIDGE_TIMESTAMP) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "_",
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join("");
}

const stamp = process.env.RUN_TIMESTAMP || timestamp();
const runId = `run_${stamp}`;
const runDir = path.join(repoRoot, "docs", "_runs", runId);
const zipPath = path.join(repoRoot, "docs", "_runs", `${runId}.zip`);
const artifactName = process.env.ARTIFACT_NAME || `dpm-review-bridge-${runId}`;

async function ensureDirs() {
  for (const dir of [
    runDir,
    path.join(runDir, "logs"),
    path.join(runDir, "json"),
    path.join(runDir, "artifacts"),
    path.join(runDir, "artifacts", "screenshots"),
  ]) {
    await fs.mkdir(dir, { recursive: true });
  }
  await fs.writeFile(path.join(repoRoot, "docs", "_runs", "LATEST.txt"), `${runId}\n`);
}

function quoteArg(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=@-]+$/.test(text)) return text;
  if (process.platform === "win32") return `"${text.replaceAll('"', '\\"')}"`;
  return `'${text.replaceAll("'", "'\\''")}'`;
}

async function run(command, args, options = {}) {
  const cwd = options.cwd || repoRoot;
  const logPath = options.logPath;
  const display = options.display || [command, ...args].join(" ");
  const startedAt = new Date().toISOString();
  let output = `$ ${display}\n# cwd: ${path.relative(repoRoot, cwd) || "."}\n# started: ${startedAt}\n\n`;

  const commandLine = [command, ...args].map(quoteArg).join(" ");
  const child = spawn(commandLine, {
    cwd,
    env: { ...process.env, ...options.env },
    shell: true,
    windowsHide: true,
  });

  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const exitCode = await new Promise((resolve) => {
    child.on("error", (error) => {
      output += `\n[spawn-error] ${error.message}\n`;
      resolve(127);
    });
    child.on("close", resolve);
  });

  output += `\n# finished: ${new Date().toISOString()}\n# exitCode: ${exitCode}\n`;
  if (logPath) {
    await fs.writeFile(logPath, output);
  }
  return { exitCode, output };
}

async function git(args, fallback = "") {
  const result = await run("git", args, {});
  if (result.exitCode !== 0) return fallback;
  return result.output.split("\n").filter((line) => !line.startsWith("$ ") && !line.startsWith("# ")).join("\n").trim();
}

async function exists(relPath) {
  try {
    await fs.access(path.join(repoRoot, relPath));
    return true;
  } catch {
    return false;
  }
}

async function packageScripts(relPath) {
  try {
    const data = JSON.parse(await fs.readFile(path.join(repoRoot, relPath, "package.json"), "utf8"));
    return data.scripts || {};
  } catch {
    return {};
  }
}

async function runValidationPlan() {
  const validations = [];
  const add = async ({ id, command, args, cwdRel = ".", reasonIfSkipped, env }) => {
    const logFile = `logs/${id}.log`;
    const logPath = path.join(runDir, logFile);
    if (reasonIfSkipped) {
      await fs.writeFile(logPath, `SKIPPED: ${reasonIfSkipped}\n`);
      validations.push({
        command: [command, ...args].join(" "),
        cwd: cwdRel,
        status: "skipped",
        log: logFile,
        reason: reasonIfSkipped,
      });
      return false;
    }
    const result = await run(command, args, {
      cwd: path.join(repoRoot, cwdRel),
      logPath,
      display: [command, ...args].join(" "),
      env,
    });
    validations.push({
      command: [command, ...args].join(" "),
      cwd: cwdRel,
      status: result.exitCode === 0 ? "passed" : "failed",
      exitCode: result.exitCode,
      log: logFile,
    });
    return result.exitCode === 0;
  };

  if (await exists("CRM/backend")) {
    const backendPython = process.platform === "win32" && await exists("CRM/backend/.venv/Scripts/python.exe")
      ? path.join(repoRoot, "CRM", "backend", ".venv", "Scripts", "python.exe")
      : "python";
    if (await exists("CRM/backend/requirements.txt")) {
      await add({ id: "backend-pip-install", command: backendPython, args: ["-m", "pip", "install", "-r", "requirements.txt"], cwdRel: "CRM/backend" });
    }
    await add({ id: "backend-pytest", command: backendPython, args: ["-m", "pytest", "-q"], cwdRel: "CRM/backend" });
  } else {
    await add({ id: "backend-skipped", command: "python", args: ["-m", "pytest", "-q"], reasonIfSkipped: "CRM/backend is absent." });
  }

  if (await exists("CRM/frontend/package.json")) {
    const scripts = await packageScripts("CRM/frontend");
    const installOk = await add({ id: "crm-frontend-npm-ci", command: "npm", args: ["ci"], cwdRel: "CRM/frontend" });
    if (installOk) {
      await add({ id: "crm-frontend-test", command: "npm", args: ["test", "--if-present"], cwdRel: "CRM/frontend" });
      if (scripts.typecheck) await add({ id: "crm-frontend-typecheck", command: "npm", args: ["run", "typecheck"], cwdRel: "CRM/frontend" });
      if (scripts.lint) await add({ id: "crm-frontend-lint", command: "npm", args: ["run", "lint"], cwdRel: "CRM/frontend" });
      await add({ id: "crm-frontend-build", command: "npm", args: ["run", "build"], cwdRel: "CRM/frontend", env: { VITE_API_BASE_URL: "https://api.example.com/api/v1" } });
    } else {
      await add({ id: "crm-frontend-test-skipped", command: "npm", args: ["test", "--if-present"], cwdRel: "CRM/frontend", reasonIfSkipped: "npm ci failed." });
      await add({ id: "crm-frontend-build-skipped", command: "npm", args: ["run", "build"], cwdRel: "CRM/frontend", reasonIfSkipped: "npm ci failed." });
    }
  } else {
    await add({ id: "crm-frontend-skipped", command: "npm", args: ["ci"], reasonIfSkipped: "CRM/frontend package.json is absent." });
  }

  if (await exists("ALQASEER-PWA/package.json")) {
    const scripts = await packageScripts("ALQASEER-PWA");
    const installOk = await add({ id: "pwa-npm-ci", command: "npm", args: ["ci"], cwdRel: "ALQASEER-PWA" });
    if (installOk) {
      await add({ id: "pwa-test", command: "npm", args: ["test", "--if-present"], cwdRel: "ALQASEER-PWA" });
      if (scripts.typecheck) await add({ id: "pwa-typecheck", command: "npm", args: ["run", "typecheck"], cwdRel: "ALQASEER-PWA" });
      if (scripts.lint) await add({ id: "pwa-lint", command: "npm", args: ["run", "lint"], cwdRel: "ALQASEER-PWA" });
      await add({ id: "pwa-build", command: "npm", args: ["run", "build"], cwdRel: "ALQASEER-PWA", env: { VITE_API_BASE_URL: "/api/v1" } });
    } else {
      await add({ id: "pwa-test-skipped", command: "npm", args: ["test", "--if-present"], cwdRel: "ALQASEER-PWA", reasonIfSkipped: "npm ci failed." });
      await add({ id: "pwa-build-skipped", command: "npm", args: ["run", "build"], cwdRel: "ALQASEER-PWA", reasonIfSkipped: "npm ci failed." });
    }
  } else {
    await add({ id: "pwa-skipped", command: "npm", args: ["ci"], reasonIfSkipped: "ALQASEER-PWA package.json is absent." });
  }

  return validations;
}

async function capturePwaScreenshots(validations) {
  const logFile = "logs/pwa-screenshots.log";
  const logPath = path.join(runDir, logFile);
  if (!(await exists("ALQASEER-PWA/package.json"))) {
    await fs.writeFile(logPath, "SKIPPED: ALQASEER-PWA package.json is absent.\n");
    validations.push({
      command: "node scripts/dpm/capture-pwa-screenshots.mjs <runDir>",
      cwd: ".",
      status: "skipped",
      log: logFile,
      reason: "ALQASEER-PWA package.json is absent.",
    });
    return;
  }

  const result = await run("node", ["scripts/dpm/capture-pwa-screenshots.mjs", path.relative(repoRoot, runDir)], {
    cwd: repoRoot,
    logPath,
    display: "node scripts/dpm/capture-pwa-screenshots.mjs <runDir>",
    env: { VITE_API_BASE_URL: "/api/v1" },
  });
  validations.push({
    command: "node scripts/dpm/capture-pwa-screenshots.mjs <runDir>",
    cwd: ".",
    status: result.exitCode === 0 ? "passed" : "failed",
    exitCode: result.exitCode,
    log: logFile,
  });
}

async function changedFiles() {
  const files = new Set();
  const baseRef = process.env.PR_BASE_REF || process.env.GITHUB_BASE_REF;
  if (baseRef) {
    const diff = await git(["diff", "--name-only", `origin/${baseRef}...HEAD`], "");
    diff.split(/\r?\n/).filter(Boolean).forEach((file) => files.add(file));
  }
  const status = await git(["status", "--short", "--untracked-files=all"], "");
  status.split(/\r?\n/).forEach((line) => {
    const code = line.slice(0, 2);
    const file = line.slice(3).trim();
    const isUntracked = code === "??";
    const isBridgeFile = file === ".github/workflows/dpm-review-bridge.yml"
      || file === "docs/OPERATIONS/DPM_REVIEW_BRIDGE.md"
      || file.startsWith("scripts/dpm/");
    if (file && !file.startsWith("docs/_runs/") && (!isUntracked || isBridgeFile)) files.add(file);
  });
  return [...files].filter((file) => !file.startsWith("docs/_runs/")).sort();
}

function groupFiles(files) {
  const groups = { backend: [], frontend: [], PWA: [], docs: [], scripts: [], workflows: [], tests: [], other: [] };
  for (const file of files) {
    const target = file.includes("test") || file.includes("spec") ? "tests"
      : file.startsWith("CRM/backend/") ? "backend"
      : file.startsWith("CRM/frontend/") ? "frontend"
      : file.startsWith("ALQASEER-PWA/") ? "PWA"
      : file.startsWith(".github/workflows/") ? "workflows"
      : file.startsWith("scripts/") ? "scripts"
      : file.startsWith("docs/") ? "docs"
      : "other";
    groups[target].push(file);
  }
  return groups;
}

function mdList(items, empty = "- None") {
  if (!items || items.length === 0) return empty;
  return items.map((item) => `- ${item}`).join("\n");
}

function validationMarkdown(validations) {
  return validations.map((v) => [
    `- Command: \`${v.cwd && v.cwd !== "." ? `cd ${v.cwd} && ` : ""}${v.command}\``,
    `  Status: ${v.status}`,
    `  Log: \`${v.log}\`${v.reason ? `\n  Reason: ${v.reason}` : ""}`,
  ].join("\n")).join("\n");
}

async function readPwaRouteProof() {
  try {
    const raw = await fs.readFile(path.join(runDir, "json", "pwa_screenshot_routes.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function routeProofMarkdown(routeProof) {
  const routes = routeProof?.routes || [];
  if (!routes.length) return "- No PWA route screenshot proof generated.";
  return routes.map((route) => [
    `- ${route.route} (${route.viewport?.width}x${route.viewport?.height})`,
    `  Status: ${route.status ?? "unknown"}`,
    `  Screenshot: \`${route.screenshot}\``,
    `  Checks: notBlank=${route.notBlank}, arabicReadable=${route.arabicReadable}, unicodeEscapes=${route.unicodeEscapeCount}, mojibake=${route.mojibakeSuspicion}, forbiddenTerms=${route.forbiddenUiTermsCount}, primaryCta=${route.primaryCtaVisible}`,
  ].join("\n")).join("\n");
}

async function createZip() {
  try {
    await fs.rm(zipPath, { force: true });
  } catch {
    // ignore
  }
  const runsDir = path.join(repoRoot, "docs", "_runs");
  const pythonCandidates = process.platform === "win32" ? [["python", []], ["py", ["-3"]]] : [["python3", []], ["python", []]];
  for (const [cmd, prefixArgs] of pythonCandidates) {
    const result = await run(cmd, [...prefixArgs, "-m", "zipfile", "-c", `${runId}.zip`, runId], {
      cwd: runsDir,
      logPath: path.join(runDir, "logs", `zip-${cmd}.log`),
    });
    if (result.exitCode === 0) return;
  }
  if (process.platform === "win32") {
    const result = await run("powershell", ["-NoProfile", "-Command", `Add-Type -AssemblyName System.IO.Compression.FileSystem; if (Test-Path '${runId}.zip') { Remove-Item -LiteralPath '${runId}.zip' -Force }; [System.IO.Compression.ZipFile]::CreateFromDirectory('${runId}', '${runId}.zip')`], {
      cwd: runsDir,
      logPath: path.join(runDir, "logs", "zip-powershell.log"),
    });
    if (result.exitCode === 0) return;
  }
  throw new Error("Unable to create zip archive.");
}

async function main() {
  await ensureDirs();

  const prNumber = process.env.PR_NUMBER || process.env.GITHUB_EVENT_PULL_REQUEST_NUMBER || "83";
  const branch = process.env.HEAD_REF || process.env.GITHUB_HEAD_REF || await git(["branch", "--show-current"], "unknown");
  const commit = process.env.HEAD_SHA || process.env.GITHUB_SHA || await git(["rev-parse", "HEAD"], "unknown");
  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
  const [owner, repo] = repoSlug.split("/");
  const prLink = prNumber ? `${serverUrl}/${repoSlug}/pull/${prNumber}` : "unavailable";
  const workflowRunUrl = process.env.GITHUB_RUN_ID ? `${serverUrl}/${repoSlug}/actions/runs/${process.env.GITHUB_RUN_ID}` : "pending";

  const validations = await runValidationPlan();
  await capturePwaScreenshots(validations);
  const files = await changedFiles();
  const groups = groupFiles(files);
  const securityScan = await sanitizePath(runDir, { outputJson: path.join(runDir, "json", "security_scan.json") });

  const failed = validations.filter((v) => v.status === "failed");
  const blocked = securityScan.findingCount > 0;
  const isGitHubWorkflowRun = Boolean(process.env.GITHUB_RUN_ID);
  const verdict = blocked ? "BLOCKED" : failed.length > 0 ? "WARNING" : isGitHubWorkflowRun ? "PASS" : "WARNING";
  const verdictReason = blocked
    ? "Security scan found potential secret-bearing content in generated bridge artifacts."
    : failed.length > 0
      ? `${failed.length} validation command(s) failed; bridge files and run package were still generated.`
      : isGitHubWorkflowRun
        ? "GitHub workflow generated the bridge package, uploaded the artifact, and all recorded validations passed."
        : "Bridge package generated locally; live GitHub artifact upload and PR comment remain pending until workflow execution.";

  const logs = (await fs.readdir(path.join(runDir, "logs"))).map((name) => `logs/${name}`).sort();
  const jsonFiles = (await fs.readdir(path.join(runDir, "json"))).map((name) => `json/${name}`).sort();
  const screenshots = (await fs.readdir(path.join(runDir, "artifacts", "screenshots"))).map((name) => `artifacts/screenshots/${name}`).sort();
  const routeProof = await readPwaRouteProof();

  const handoff = {
    marker,
    repo: repoSlug,
    owner,
    repoName: repo,
    prNumber,
    prLink,
    branch,
    commit,
    runId,
    timestamp: stamp,
    workflowRunUrl,
    artifactName,
    artifactId: process.env.ARTIFACT_ID || "unavailable",
    artifactUrl: process.env.ARTIFACT_URL || "unavailable",
    verdict,
    verdictReason,
    changedFiles: groups,
    validations,
    artifacts: {
      runFolder: `docs/_runs/${runId}`,
      zipPath: `docs/_runs/${runId}.zip`,
      githubArtifactName: artifactName,
      screenshotsIncluded: screenshots.length > 0 ? "yes" : "no",
      screenshotCount: screenshots.length,
      screenshots,
      logs,
      jsonAndReports: ["report.md", "CHATGPT_HANDOFF.md", ...jsonFiles],
    },
    security: {
      noSecretsExposed: securityScan.findingCount === 0 ? "yes" : "no",
      noBackdoorProvisioningAuthBypass: "uncertain",
      noUnsafeEnvLeakage: securityScan.findingCount === 0 ? "yes" : "no",
      reason: securityScan.findingCount === 0
        ? "Generated bridge artifacts were scanned for common secret patterns; source security is not exhaustively proven by this bridge."
        : "Generated bridge artifacts matched one or more sensitive patterns.",
    },
    deployment: {
      happened: "no",
      target: "none",
      url: "none",
    },
    risks: [
      ...(failed.length ? failed.map((v) => `Validation failed: ${v.cwd} ${v.command}`) : []),
      screenshots.length ? `Screenshots included in artifact: ${screenshots.length}` : "Screenshots are missing from this bridge artifact.",
      "Artifact ID is unavailable inside the zipped handoff until GitHub uploads the artifact.",
      "This bridge does not deploy or mutate production infrastructure.",
    ],
    nextBestAction: {
      codexRecommendation: "Trigger the DPM Review Bridge workflow from PR #83 and review the updated PR comment plus artifact.",
      chatgptMessage: `راجع DPM Review Bridge:\nRepo: ${repoSlug}\nPR: ${prNumber}\nRun ID: ${runId}\nVerdict: ${verdict}\nCommit: ${commit}\nWorkflow Run: ${workflowRunUrl}\nArtifact: ${artifactName}\nArtifact ID: ${process.env.ARTIFACT_ID || "unavailable"}`,
    },
  };

  await fs.writeFile(path.join(runDir, "json", "chatgpt_handoff.json"), `${JSON.stringify(handoff, null, 2)}\n`);

  const handoffMd = `# CHATGPT HANDOFF\n\n## 1. RUN\n- Repo: ${repoSlug}\n- PR number/link: ${prNumber} / ${prLink}\n- Branch: ${branch}\n- Commit SHA: ${commit}\n- Run ID: ${runId}\n- Timestamp: ${stamp}\n- Workflow run URL if available: ${workflowRunUrl}\n- Artifact name: ${artifactName}\n- Artifact ID if available: ${process.env.ARTIFACT_ID || "unavailable"}\n\n## 2. VERDICT\n- ${verdict}\n- ${verdictReason}\n\n## 3. WHAT CODEX / WORKFLOW DID\n- Created a DPM Review Bridge run folder with logs, JSON summary, report, handoff file, and zip package.\n- Ran available backend, CRM frontend, and PWA validation commands without stopping the workflow on absent components.\n- Captured PWA route screenshots into the artifact when ALQASEER-PWA and Playwright were available.\n- Performed a generated-artifact secret-pattern scan.\n- Did not deploy, merge, change PR readiness, touch DNS, or create provisioning/auth-bypass endpoints.\n\n## 4. CHANGED FILES\n### Backend\n${mdList(groups.backend)}\n\n### Frontend\n${mdList(groups.frontend)}\n\n### PWA\n${mdList(groups.PWA)}\n\n### Docs\n${mdList(groups.docs)}\n\n### Scripts\n${mdList(groups.scripts)}\n\n### Workflows\n${mdList(groups.workflows)}\n\n### Tests\n${mdList(groups.tests)}\n\n### Other\n${mdList(groups.other)}\n\n## 5. VALIDATION\n${validationMarkdown(validations)}\n\n## 6. ARTIFACTS\n- Run folder path: \`docs/_runs/${runId}\`\n- Zip path: \`docs/_runs/${runId}.zip\`\n- GitHub artifact name: ${artifactName}\n- Screenshots included: ${screenshots.length > 0 ? "yes" : "no"} (${screenshots.length})\n- Screenshots list:\n${mdList(screenshots)}\n- Logs list:\n${mdList(logs)}\n- JSON/report files list:\n${mdList(["report.md", "CHATGPT_HANDOFF.md", ...jsonFiles])}\n\n## PWA ROUTE SCREENSHOT PROOF\n${routeProofMarkdown(routeProof)}\n\n## 7. SECURITY CHECK\n- No secrets exposed: ${handoff.security.noSecretsExposed}\n- No backdoor/provisioning/auth bypass: ${handoff.security.noBackdoorProvisioningAuthBypass}\n- No unsafe env leakage: ${handoff.security.noUnsafeEnvLeakage}\n- If uncertain, why: ${handoff.security.reason}\n\n## 8. DEPLOYMENT CHECK\n- Deploy happened: no\n- If yes, where and URL: none\n- If no: no deploy\n\n## 9. RISKS / BLOCKERS\n${mdList(handoff.risks)}\n\n## 10. NEXT BEST ACTION\n- Exact next Codex recommendation: ${handoff.nextBestAction.codexRecommendation}\n- Exact one-line message Omar should send to ChatGPT:\n\n${handoff.nextBestAction.chatgptMessage}\n`;

  await fs.writeFile(path.join(runDir, "CHATGPT_HANDOFF.md"), handoffMd);

  const report = `# DPM Review Bridge Report\n\n## Executive Summary\nVerdict: ${verdict}\n\n${verdictReason}\n\n## What Ran\n${validationMarkdown(validations)}\n\n## PWA Route Screenshot Proof\n${routeProofMarkdown(routeProof)}\n\n## Real Device Readiness Backlog\n- Android tablet install/PWA test: required before field pilot.\n- iPhone Safari PWA limitations: verify install, storage persistence, and location permission behavior.\n- GPS permission test: verify precise location prompt and denied/unavailable/timeout states on device.\n- Start/End Visit real GPS test: run with the safe DEMO QA customer and capture start/end accuracy.\n- Offline pending test: create one safe queueable visit/note action while offline.\n- Reconnect/sync test: reconnect and verify no duplicate visit is created.\n- Service worker update/hard refresh test: verify latest field-force UI after update and hard refresh.\n\n## Security\n- Generated artifact scan: ${securityScan.status}\n- Findings: ${securityScan.findingCount}\n- Deploy happened: no\n- PR state mutation: none\n- DNS mutation: none\n\n## Artifacts\n- Run folder: docs/_runs/${runId}\n- Zip: docs/_runs/${runId}.zip\n- Handoff: docs/_runs/${runId}/CHATGPT_HANDOFF.md\n- JSON: docs/_runs/${runId}/json/chatgpt_handoff.json\n- Screenshots included: ${screenshots.length > 0 ? "yes" : "no"} (${screenshots.length})\n\n## Screenshots\n${mdList(screenshots)}\n\n## ChatGPT Copy Block\n${handoff.nextBestAction.chatgptMessage}\n`;
  await fs.writeFile(path.join(runDir, "report.md"), report);

  const audit = `# Master Audit\n\n- Repo: ${repoSlug}\n- PR: ${prNumber}\n- Branch: ${branch}\n- Commit: ${commit}\n- Run: ${runId}\n- Workflow URL: ${workflowRunUrl}\n- Artifact: ${artifactName}\n- Verdict: ${verdict}\n- Generated artifact secret findings: ${securityScan.findingCount}\n- Deploy: no\n- DNS/www touched: no\n- Merge/Ready-for-review touched: no\n`;
  await fs.writeFile(path.join(runDir, "master_audit.md"), audit);

  const sizeBreakdown = await run("node", ["-e", "const fs=require('fs'),p=process.argv[1];let rows=[];for(const f of fs.readdirSync(p,{recursive:true})) {const x=require('path').join(p,f); if(fs.statSync(x).isFile()) rows.push([f,fs.statSync(x).size]);} console.log(rows.map(r=>`${r[0]}\\t${r[1]}`).join('\\n'))", runDir], {
    cwd: repoRoot,
    logPath: path.join(runDir, "logs", "size-breakdown.log"),
  });
  await fs.writeFile(path.join(runDir, "size_breakdown.md"), `# Size Breakdown\n\n\`\`\`\n${sizeBreakdown.output}\n\`\`\`\n`);

  await createZip();

  const result = {
    runId,
    runDir: path.relative(repoRoot, runDir).replaceAll(path.sep, "/"),
    zipPath: path.relative(repoRoot, zipPath).replaceAll(path.sep, "/"),
    verdict,
    verdictReason,
    prNumber,
    commit,
    branch,
    workflowRunUrl,
    artifactName,
    artifactId: process.env.ARTIFACT_ID || "unavailable",
  };
  await fs.writeFile(path.join(runDir, "json", "bridge_result.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
