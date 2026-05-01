#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runOrFail(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    console.error(`[npm-prod-audit] Failed to execute ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[npm-prod-audit] Command failed: ${command} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

function runAuditJson(cwd) {
  const result = spawnSync(npmCommand, ["audit", "--omit=dev", "--json"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    console.error(`[npm-prod-audit] Failed to execute npm audit: ${result.error.message}`);
    process.exit(1);
  }
  const raw = (result.stdout || "").trim();
  if (!raw) {
    console.error("[npm-prod-audit] npm audit returned no JSON output.");
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch {
    console.error("[npm-prod-audit] Unable to parse npm audit JSON output.");
    process.exit(1);
  }
}

function appendStepSummary(lines) {
  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (!stepSummary) return;
  fs.appendFileSync(stepSummary, `${lines.join("\n")}\n`, "utf8");
}

function copySanitizedNpmrc(sourcePath, destinationPath) {
  const unsafeKeys = new Set(["include", "omit", "production"]);
  const sanitized = fs
    .readFileSync(sourcePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) return true;
      const key = trimmed.split("=", 1)[0]?.trim().toLowerCase();
      return !unsafeKeys.has(key);
    })
    .join("\n");
  if (sanitized.trim()) {
    fs.writeFileSync(destinationPath, `${sanitized}\n`, "utf8");
  }
}

function isInstalledNode(tempDir, nodePath) {
  if (!nodePath || typeof nodePath !== "string") return false;
  const resolved = path.resolve(tempDir, nodePath);
  const tempRoot = path.resolve(tempDir);
  if (resolved !== tempRoot && !resolved.startsWith(`${tempRoot}${path.sep}`)) {
    return false;
  }
  return fs.existsSync(resolved);
}

function filterInstalledVulnerabilities(vulnerabilitiesByName, tempDir) {
  return Object.fromEntries(
    Object.entries(vulnerabilitiesByName).filter(([, vulnerability]) => {
      const nodes = Array.isArray(vulnerability?.nodes) ? vulnerability.nodes : [];
      return nodes.some((nodePath) => isInstalledNode(tempDir, nodePath));
    })
  );
}

function countBySeverity(vulnerabilitiesByName) {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  for (const vulnerability of Object.values(vulnerabilitiesByName)) {
    const severity = vulnerability?.severity;
    if (Object.hasOwn(counts, severity)) {
      counts[severity] += 1;
    }
  }
  return counts;
}

const targetArg = process.argv[2] || ".";
const projectDir = path.resolve(process.cwd(), targetArg);
const pkgJsonPath = path.join(projectDir, "package.json");
const lockPath = path.join(projectDir, "package-lock.json");
const npmrcPath = path.join(projectDir, ".npmrc");

if (!fs.existsSync(pkgJsonPath) || !fs.existsSync(lockPath)) {
  console.error(`[npm-prod-audit] package.json or package-lock.json missing in ${projectDir}`);
  process.exit(1);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "npm-prod-audit-"));
fs.copyFileSync(pkgJsonPath, path.join(tempDir, "package.json"));
fs.copyFileSync(lockPath, path.join(tempDir, "package-lock.json"));
if (fs.existsSync(npmrcPath)) {
  copySanitizedNpmrc(npmrcPath, path.join(tempDir, ".npmrc"));
}

console.log(`[npm-prod-audit] Temp workspace: ${tempDir}`);
runOrFail(npmCommand, ["ci", "--omit=dev"], tempDir);

const audit = runAuditJson(tempDir);
const allVulnerabilities = audit?.vulnerabilities || {};
const installedVulnerabilities = filterInstalledVulnerabilities(allVulnerabilities, tempDir);
const vulnerabilities = countBySeverity(installedVulnerabilities);
const info = vulnerabilities.info;
const low = vulnerabilities.low;
const moderate = vulnerabilities.moderate;
const high = vulnerabilities.high;
const critical = vulnerabilities.critical;
const omitted = Object.keys(allVulnerabilities).length - Object.keys(installedVulnerabilities).length;

const lines = [
  `### NPM Prod Audit: ${path.relative(process.cwd(), projectDir) || "."}`,
  `- Scope: installed production dependencies only (\`npm ci --omit=dev\`, \`npm audit --omit=dev\`)`,
  `- Result counts: info=${info}, low=${low}, moderate=${moderate}, high=${high}, critical=${critical}`,
  `- Omitted dev/optional-only audit entries: ${omitted}`,
];

if (moderate > 0 && high === 0 && critical === 0) {
  lines.push("- Policy: moderate findings documented only (no gate failure).");
}
if (high > 0 || critical > 0) {
  lines.push("- Policy: HIGH/CRITICAL in production dependencies fails the gate.");
}
appendStepSummary(lines);
console.log(lines.join("\n"));

if (high > 0 || critical > 0) {
  process.exit(1);
}
process.exit(0);
