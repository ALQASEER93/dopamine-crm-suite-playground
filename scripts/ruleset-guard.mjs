import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const RULESET_ID = 11206241;
const API_VERSION = "2022-11-28";

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "_" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

const forcedTimestamp = process.env.RULESET_GUARD_TIMESTAMP;
const validTimestamp = forcedTimestamp && /^\d{8}_\d{6}$/.test(forcedTimestamp)
  ? forcedTimestamp
  : null;
const runTimestamp = validTimestamp || formatTimestamp(new Date());
const runDir = path.join("docs", "_runs", `run_${runTimestamp}`);
const artifactsDir = path.join(runDir, "artifacts");
const logsDir = path.join(runDir, "logs");
const jsonDir = path.join(runDir, "json");

const reportPath = path.join(runDir, "report.md");
const masterAuditPath = path.join(runDir, "master_audit.md");
const sizeBreakdownPath = path.join(runDir, "size_breakdown.md");
const errorLogPath = path.join(logsDir, "error.log");

const errors = [];

async function readEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    return null;
  }
  try {
    const raw = await fs.readFile(eventPath, "utf8");
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    await recordError("event_payload", `Failed to read ${eventPath}: ${err?.message || String(err)}`);
    return null;
  }
}

async function ensureDirs() {
  await fs.mkdir(runDir, { recursive: true });
  await fs.mkdir(artifactsDir, { recursive: true });
  await fs.mkdir(logsDir, { recursive: true });
  await fs.mkdir(jsonDir, { recursive: true });
}

async function writeText(filePath, content) {
  await fs.writeFile(filePath, content, "utf8");
}

async function appendText(filePath, content) {
  await fs.appendFile(filePath, content, "utf8");
}

function safeExec(command) {
  try {
    const output = execSync(command, { stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, stdout: output.toString("utf8").trim() };
  } catch (err) {
    return { ok: false, error: err };
  }
}

function safeExecRaw(command) {
  try {
    const output = execSync(command, { stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, stdout: output.toString("utf8") };
  } catch (err) {
    return { ok: false, error: err };
  }
}

function recordError(label, details) {
  const entry = { label, details };
  errors.push(entry);
  const line = `[${new Date().toISOString()}] ${label}: ${details}\n`;
  return appendText(errorLogPath, line);
}

async function writeJson(fileName, payload) {
  const filePath = path.join(jsonDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function getRepoSlug() {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY;
  }
  const remote = safeExec("git config --get remote.origin.url");
  if (!remote.ok || !remote.stdout) {
    return null;
  }
  const match = remote.stdout.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/i);
  return match ? match[1] : null;
}

async function apiGet(label, url, fileName, headers) {
  try {
    const response = await fetch(url, { headers });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (parseErr) {
      json = null;
    }

    if (!response.ok) {
      await recordError(label, `HTTP ${response.status} ${response.statusText} for ${url}. Body: ${text || "<empty>"}`);
      await writeJson(fileName, { error: `HTTP ${response.status} ${response.statusText}`, url, body: text || null });
      return { ok: false, status: response.status, data: json };
    }

    await writeJson(fileName, json);
    return { ok: true, status: response.status, data: json };
  } catch (err) {
    await recordError(label, `Fetch failed for ${url}: ${err?.message || String(err)}`);
    await writeJson(fileName, { error: "fetch_failed", url, message: err?.message || String(err) });
    return { ok: false, status: null, data: null };
  }
}

function extractRequiredChecks(ruleset) {
  if (!ruleset || !Array.isArray(ruleset.rules)) {
    return [];
  }
  const rule = ruleset.rules.find((item) => item.type === "required_status_checks");
  if (!rule || !rule.parameters || !Array.isArray(rule.parameters.required_status_checks)) {
    return [];
  }
  return rule.parameters.required_status_checks
    .map((entry) => entry.context)
    .filter((context) => typeof context === "string" && context.trim().length > 0);
}

function hasRule(ruleset, ruleType) {
  if (!ruleset || !Array.isArray(ruleset.rules)) {
    return false;
  }
  return ruleset.rules.some((rule) => rule.type === ruleType);
}

function normalizeChecks(items) {
  return Array.from(
    new Set(
      items
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
    )
  ).sort();
}

function matchRulesetToBranch(ruleset, defaultBranch) {
  if (!ruleset || !defaultBranch) {
    return null;
  }
  const conditions = ruleset.conditions;
  if (!conditions || !conditions.ref_name) {
    return null;
  }
  const include = conditions.ref_name.include || [];
  if (!Array.isArray(include)) {
    return null;
  }
  if (include.length === 0) {
    return true;
  }
  const branchRef = `refs/heads/${defaultBranch}`;
  return include.includes(defaultBranch) || include.includes(branchRef);
}

async function buildSizeBreakdown() {
  const entries = [];
  async function walk(dir) {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        await walk(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        entries.push({ path: path.relative(runDir, fullPath), size: stats.size });
      }
    }
  }
  await walk(runDir);
  entries.sort((a, b) => b.size - a.size);
  const lines = ["# Size Breakdown", "", "| File | Bytes |", "| --- | ---: |"]; 
  for (const entry of entries) {
    lines.push(`| ${entry.path.replace(/\\/g, "/")} | ${entry.size} |`);
  }
  await writeText(sizeBreakdownPath, `${lines.join("\n")}\n`);
}

async function main() {
  await ensureDirs();
  await writeText(errorLogPath, "");

  const eventPayload = await readEventPayload();
  const eventName = process.env.GITHUB_EVENT_NAME || null;

  const apiBase = process.env.GITHUB_API_URL || "https://api.github.com";
  const token = process.env.GITHUB_TOKEN;
  const repoSlug =
    process.env.GITHUB_REPOSITORY ||
    eventPayload?.repository?.full_name ||
    eventPayload?.pull_request?.base?.repo?.full_name ||
    getRepoSlug();

  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": "ruleset-guard",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    await recordError("auth", "GITHUB_TOKEN is not set; API calls may be limited.");
  }

  if (!repoSlug) {
    await recordError("repo", "Repository slug is unavailable (GITHUB_REPOSITORY missing and git remote unavailable)." );
  }

  let repoInfo = null;
  let defaultBranch = null;
  if (repoSlug) {
    const repoInfoResp = await apiGet(
      "repo_info",
      `${apiBase}/repos/${repoSlug}`,
      "repo_info.json",
      headers
    );
    if (repoInfoResp.ok) {
      repoInfo = repoInfoResp.data;
      defaultBranch = repoInfo?.default_branch || null;
    } else {
      defaultBranch = null;
    }
  }

  let headSha = null;
  let headShaSource = null;
  if (eventName === "pull_request" && eventPayload?.pull_request?.head?.sha) {
    headSha = eventPayload.pull_request.head.sha;
    headShaSource = "pull_request.head.sha";
  } else if (process.env.GITHUB_SHA) {
    headSha = process.env.GITHUB_SHA;
    headShaSource = "GITHUB_SHA";
  } else if (repoSlug && defaultBranch) {
    const commitResp = await apiGet(
      "default_branch_head",
      `${apiBase}/repos/${repoSlug}/commits/${encodeURIComponent(defaultBranch)}`,
      "default_branch_head.json",
      headers
    );
    if (commitResp.ok) {
      headSha = commitResp.data?.sha || null;
      headShaSource = "default_branch_head";
    }
  } else if (!defaultBranch) {
    await recordError("default_branch_head", "Default branch is missing; cannot resolve HEAD SHA.");
  }

  let checkRuns = [];
  if (repoSlug && headSha) {
    const checkRunsResp = await apiGet(
      "check_runs",
      `${apiBase}/repos/${repoSlug}/commits/${headSha}/check-runs`,
      "check_runs.json",
      headers
    );
    if (checkRunsResp.ok) {
      checkRuns = Array.isArray(checkRunsResp.data?.check_runs)
        ? checkRunsResp.data.check_runs
        : [];
    }
  } else if (!headSha) {
    await recordError("check_runs", "HEAD SHA is missing; cannot fetch check runs.");
  }

  let statusContexts = [];
  if (repoSlug && headSha) {
    const statusResp = await apiGet(
      "commit_status",
      `${apiBase}/repos/${repoSlug}/commits/${headSha}/status`,
      "commit_status.json",
      headers
    );
    if (statusResp.ok) {
      statusContexts = Array.isArray(statusResp.data?.statuses)
        ? statusResp.data.statuses
        : [];
    }
  } else if (!headSha) {
    await recordError("commit_status", "HEAD SHA is missing; cannot fetch commit status.");
  }

  let ruleset = null;
  if (repoSlug) {
    const rulesetResp = await apiGet(
      "ruleset_by_id",
      `${apiBase}/repos/${repoSlug}/rulesets/${RULESET_ID}`,
      "ruleset_11206241.json",
      headers
    );
    if (rulesetResp.ok) {
      ruleset = rulesetResp.data;
    }
  }

  let rulesetList = null;
  if (repoSlug) {
    const rulesetListResp = await apiGet(
      "ruleset_list",
      `${apiBase}/repos/${repoSlug}/rulesets?target=branch&include_parents=true`,
      "rulesets_active_branch.json",
      headers
    );
    if (rulesetListResp.ok) {
      rulesetList = rulesetListResp.data;
    }
  }

  const enforcement = ruleset?.enforcement || null;
  const requiredChecks = normalizeChecks(extractRequiredChecks(ruleset));
  const actualChecks = normalizeChecks([
    ...checkRuns.map((run) => run.name),
    ...statusContexts.map((status) => status.context),
  ]);

  const matchesRequiredCheck = (required, actual) =>
    actual === required || actual.startsWith(`${required} (`);

  const missingChecks = requiredChecks.filter(
    (check) => !actualChecks.some((actual) => matchesRequiredCheck(check, actual))
  );
  const isActive = enforcement === "active";
  const hasBlocker = isActive && missingChecks.length > 0;

  const hasLinearHistory = hasRule(ruleset, "required_linear_history");
  const allowSquash = repoInfo?.allow_squash_merge === true;
  const allowRebase = repoInfo?.allow_rebase_merge === true;
  const linearHistoryWarn = hasLinearHistory && !allowSquash && !allowRebase;

  const signedCommitsRequired = hasRule(ruleset, "required_signatures");

  let activeRulesForBranch = "غير مذكور";
  if (Array.isArray(rulesetList)) {
    const matches = rulesetList
      .filter((item) => item?.target === "branch")
      .map((item) => ({
        id: item.id,
        name: item.name,
        enforcement: item.enforcement,
        matchesDefaultBranch: matchRulesetToBranch(item, defaultBranch),
      }));
    activeRulesForBranch = matches.length > 0 ? matches : [];
  }

  const missingNotes = [];
  if (!repoSlug) {
    missingNotes.push("Repository slug missing (GITHUB_REPOSITORY or git remote).");
  }
  if (!defaultBranch) {
    missingNotes.push("Default branch unavailable from repo info.");
  }
  if (!headSha) {
    missingNotes.push("HEAD SHA unavailable from default branch.");
  }
  if (!ruleset) {
    missingNotes.push(`Ruleset ${RULESET_ID} unavailable (API call failed).`);
  }

  const reportLines = [];
  reportLines.push("# Ruleset Guard Report");
  reportLines.push("");
  reportLines.push(`- Run Timestamp: ${runTimestamp}`);
  reportLines.push(`- Repo: ${repoSlug || "غير مذكور"}`);
  reportLines.push(`- Default Branch: ${defaultBranch || "غير مذكور"}`);
  reportLines.push(`- Default Branch HEAD SHA: ${headSha || "غير مذكور"}`);
  reportLines.push(`- Head SHA Source: ${headShaSource || "غير مذكور"}`);
  reportLines.push("");

  reportLines.push("## Ruleset Enforcement");
  reportLines.push(enforcement ? `- Enforcement: ${enforcement}` : "- Enforcement: غير مذكور (ruleset API failed)");
  reportLines.push("");

  reportLines.push("## Required Status Checks (From Ruleset)");
  if (requiredChecks.length > 0) {
    for (const check of requiredChecks) {
      reportLines.push(`- ${check}`);
    }
  } else if (ruleset) {
    reportLines.push("- None listed in ruleset.");
  } else {
    reportLines.push("- غير مذكور (ruleset API failed)");
  }
  reportLines.push("");

  reportLines.push("## Actual Checks On Default Branch HEAD");
  if (actualChecks.length > 0) {
    for (const check of actualChecks) {
      reportLines.push(`- ${check}`);
    }
  } else if (!headSha) {
    reportLines.push("- غير مذكور (HEAD SHA unavailable)");
  } else {
    reportLines.push("- None found.");
  }
  reportLines.push("");

  reportLines.push("## Comparison");
  if (requiredChecks.length === 0 && ruleset) {
    reportLines.push("- No required checks defined in ruleset.");
  } else if (!ruleset) {
    reportLines.push("- غير مذكور (ruleset API failed)");
  } else {
    if (missingChecks.length > 0) {
      reportLines.push(`- Missing required checks: ${missingChecks.join(", ")}`);
    } else {
      reportLines.push("- All required checks present.");
    }
  }
  reportLines.push("");

  reportLines.push("## Blockers");
  if (!ruleset) {
    reportLines.push("- غير مذكور (ruleset API failed)");
  } else if (hasBlocker) {
    reportLines.push("- BLOCKER: Active ruleset requires checks that are missing on HEAD.");
  } else {
    reportLines.push("- No blockers detected from required status checks.");
  }
  reportLines.push("");

  reportLines.push("## Warnings");
  if (linearHistoryWarn) {
    reportLines.push("- Required linear history is active, but repo does not allow squash or rebase merges.");
  } else {
    reportLines.push("- None.");
  }
  if (signedCommitsRequired) {
    reportLines.push("- Signed commits required by ruleset.");
  }
  reportLines.push("");

  reportLines.push("## Active Rules For Default Branch (Best Effort)");
  if (activeRulesForBranch === "غير مذكور") {
    reportLines.push("- غير مذكور (ruleset list API failed)");
  } else if (Array.isArray(activeRulesForBranch) && activeRulesForBranch.length > 0) {
    for (const rule of activeRulesForBranch) {
      const matchText = rule.matchesDefaultBranch === null ? "غير مذكور" : rule.matchesDefaultBranch ? "yes" : "no";
      reportLines.push(`- ${rule.name} (ID ${rule.id}) enforcement=${rule.enforcement} matches_default_branch=${matchText}`);
    }
  } else {
    reportLines.push("- None listed.");
  }
  reportLines.push("");

  if (missingNotes.length > 0 || errors.length > 0) {
    reportLines.push("## Missing Or Failed Evidence");
    if (missingNotes.length > 0) {
      for (const note of missingNotes) {
        reportLines.push(`- ${note}`);
      }
    }
    if (errors.length > 0) {
      for (const entry of errors) {
        reportLines.push(`- ${entry.label}: ${entry.details}`);
      }
    }
    if (missingNotes.length === 0 && errors.length === 0) {
      reportLines.push("- None.");
    }
    reportLines.push("");
  }

  const changedFiles = safeExecRaw("git status --porcelain");
  let changedFilesList = "غير مذكور";
  if (changedFiles.ok) {
    const list = changedFiles.stdout
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => line.slice(3).trim())
      .filter(Boolean);
    changedFilesList = list.length > 0 ? list.join(", ") : "(none)";
  }

  reportLines.push("## Execution Summary");
  reportLines.push(`- Files Changed: ${changedFilesList}`);
  reportLines.push(`- Blockers Detected: ${hasBlocker ? "yes" : "no"}`);
  if (missingNotes.length > 0) {
    reportLines.push(`- Could Not Verify: ${missingNotes.join(" ")}`);
  } else {
    reportLines.push("- Could Not Verify: (none)");
  }
  reportLines.push("");

  await writeText(reportPath, `${reportLines.join("\n")}\n`);

  const auditLines = [];
  auditLines.push("# Master Audit");
  auditLines.push("");
  auditLines.push(`- Run Timestamp: ${runTimestamp}`);
  auditLines.push(`- Repo: ${repoSlug || "غير مذكور"}`);
  auditLines.push(`- Default Branch: ${defaultBranch || "غير مذكور"}`);
  auditLines.push(`- Ruleset ID: ${RULESET_ID}`);
  auditLines.push(`- Enforcement: ${enforcement || "غير مذكور"}`);
  auditLines.push("");
  auditLines.push("## API Calls");
  const apiCallList = [
    "repo_info.json",
    "default_branch_head.json",
    "check_runs.json",
    "commit_status.json",
    "ruleset_11206241.json",
    "rulesets_active_branch.json",
  ];
  for (const item of apiCallList) {
    auditLines.push(`- ${item}`);
  }
  auditLines.push("");
  if (errors.length > 0) {
    auditLines.push("## Errors");
    for (const entry of errors) {
      auditLines.push(`- ${entry.label}: ${entry.details}`);
    }
    auditLines.push("");
  }
  await writeText(masterAuditPath, `${auditLines.join("\n")}\n`);

  await buildSizeBreakdown();

  if (hasBlocker) {
    process.exitCode = 2;
  }
}

main().catch(async (err) => {
  await ensureDirs();
  await recordError("fatal", err?.message || String(err));
  await writeText(reportPath, "# Ruleset Guard Report\n\n- fatal error: غير مذكور (see logs/error.log)\n");
  await writeText(masterAuditPath, "# Master Audit\n\n- fatal error\n");
  await buildSizeBreakdown();
  process.exitCode = 2;
});
