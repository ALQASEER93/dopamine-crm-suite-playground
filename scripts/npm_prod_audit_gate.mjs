#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function runOrFail(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
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
  const result = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
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
  fs.copyFileSync(npmrcPath, path.join(tempDir, ".npmrc"));
}

console.log(`[npm-prod-audit] Temp workspace: ${tempDir}`);
runOrFail("npm", ["ci", "--omit=dev"], tempDir);

const audit = runAuditJson(tempDir);
const vulnerabilities = audit?.metadata?.vulnerabilities || {};
const info = Number(vulnerabilities.info || 0);
const low = Number(vulnerabilities.low || 0);
const moderate = Number(vulnerabilities.moderate || 0);
const high = Number(vulnerabilities.high || 0);
const critical = Number(vulnerabilities.critical || 0);

const lines = [
  `### NPM Prod Audit: ${path.relative(process.cwd(), projectDir) || "."}`,
  `- Scope: production dependencies only (\`npm ci --omit=dev\`, \`npm audit --omit=dev\`)`,
  `- Result counts: info=${info}, low=${low}, moderate=${moderate}, high=${high}, critical=${critical}`,
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
