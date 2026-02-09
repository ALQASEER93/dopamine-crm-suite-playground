#!/usr/bin/env node
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

const API = process.env.GITHUB_API_URL || "https://api.github.com";
const token = process.env.GITHUB_TOKEN;
const repoSlug = process.env.GITHUB_REPOSITORY;
const targetSha = process.env.TARGET_SHA || process.env.GITHUB_SHA;

const OUTDIR = process.env.RULESET_GUARD_OUTDIR || "artifacts/ruleset-guard";
const FALLBACK_FILES = [
  "scripts/ruleset-required-checks.json",
  "docs/governance/rulesets/protect-main.json",
];

function norm(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function writeFileSafe(p, content) {
  await fs.mkdir(OUTDIR, { recursive: true });
  await fs.writeFile(`${OUTDIR}/${p}`, content, "utf8");
}

async function gh(path) {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok) {
    const err = new Error(`GitHub API ${res.status} for ${path}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return json;
}

async function loadRequiredFromRulesets(owner, repo) {
  // includes_parents=true to include org-level rulesets that apply to this repo
  const list = await gh(`/repos/${owner}/${repo}/rulesets?includes_parents=true&per_page=100`);
  const rulesets = Array.isArray(list) ? list : [];

  const matched = [];
  const required = new Set();

  // Fetch details only for active/enforced rulesets
  for (const rs of rulesets) {
    const enforcement = rs?.enforcement;
    if (!["active", "enabled"].includes(String(enforcement))) continue;

    const detail = await gh(`/repos/${owner}/${repo}/rulesets/${rs.id}?includes_parents=true`);
    const includes = detail?.conditions?.ref_name?.include || [];
    const appliesToMain = includes.includes("refs/heads/main");
    const target = String(detail?.target || "");
    if (!appliesToMain || target !== "branch") continue;

    matched.push({ id: rs.id, name: rs.name, source_type: rs.source_type, source: rs.source });

    const rules = detail?.rules || [];
    for (const rule of rules) {
      if (rule?.type !== "required_status_checks") continue;
      const checks = rule?.parameters?.required_status_checks || [];
      for (const c of checks) {
        if (c?.context) required.add(c.context);
      }
    }
  }

  return { required: [...required], matched };
}

async function loadRequiredFromFallback() {
  for (const p of FALLBACK_FILES) {
    if (!existsSync(p)) continue;
    const raw = await fs.readFile(p, "utf8");
    const json = JSON.parse(raw);

    // format A: { "required": [ "CI 1", {"context":"X"}, {"match":"regex"} ] }
    if (Array.isArray(json?.required)) {
      return { source: p, requiredSpec: json.required };
    }

    // format B (ruleset export-like): { rules: [{type:"required_status_checks", parameters:{required_status_checks:[{context:"X"}]}}]}
    if (Array.isArray(json?.rules)) {
      const req = [];
      for (const r of json.rules) {
        if (r?.type !== "required_status_checks") continue;
        const arr = r?.parameters?.required_status_checks || [];
        for (const c of arr) if (c?.context) req.push(String(c.context));
      }
      if (req.length) return { source: p, requiredSpec: req };
    }
  }
  return null;
}

function specToMatchers(requiredSpec) {
  // Accept strings (exact context) or objects {context} or {match:"regex"}
  const matchers = [];
  for (const item of requiredSpec) {
    if (typeof item === "string") {
      matchers.push({ type: "exact", label: item, exact: item });
    } else if (item && typeof item === "object") {
      if (item.context) matchers.push({ type: "exact", label: item.context, exact: item.context });
      else if (item.match) matchers.push({ type: "regex", label: item.match, regex: new RegExp(item.match, "i") });
    }
  }
  return matchers;
}

async function getChecksForSha(owner, repo, sha) {
  const checkRunsResp = await gh(`/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=100`);
  const checkRuns = Array.isArray(checkRunsResp?.check_runs) ? checkRunsResp.check_runs : [];

  const statusResp = await gh(`/repos/${owner}/${repo}/commits/${sha}/status?per_page=100`);
  const statuses = Array.isArray(statusResp?.statuses) ? statusResp.statuses : [];

  const found = [];

  for (const cr of checkRuns) {
    found.push({
      kind: "check_run",
      name: cr?.name,
      status: cr?.status,
      conclusion: cr?.conclusion,
      url: cr?.html_url || cr?.details_url,
    });
  }
  for (const st of statuses) {
    found.push({
      kind: "status",
      name: st?.context,
      status: "completed",
      conclusion: st?.state, // success|failure|pending|error
      url: st?.target_url,
    });
  }

  return found.filter(x => x?.name);
}

function isSuccess(kind, conclusion) {
  if (kind === "check_run") return conclusion === "success";
  // commit status:
  return conclusion === "success";
}

function matchRequired(matcher, foundMapNormToBest) {
  if (matcher.type === "exact") {
    const k = norm(matcher.exact);
    return foundMapNormToBest.get(k) || null;
  }
  if (matcher.type === "regex") {
    for (const [_, v] of foundMapNormToBest.entries()) {
      if (matcher.regex.test(v.name)) return v;
    }
    return null;
  }
  return null;
}

async function main() {
  const startedAt = new Date().toISOString();
  const report = {
    startedAt,
    repo: repoSlug,
    targetSha,
    rulesets: { source: null, matched: [], required: [] },
    fallback: { used: false, source: null },
    checks: { total: 0, found: [], requiredMatchers: [] },
    evaluation: { missing: [], notSuccessful: [], ok: [] },
    errors: [],
    exitCode: 0,
  };

  if (!token) {
    report.errors.push("Missing env GITHUB_TOKEN");
    report.exitCode = 1;
    await writeFileSafe("report.json", JSON.stringify(report, null, 2));
    await writeFileSafe("summary.md", `**ERROR**: Missing GITHUB_TOKEN\n`);
    process.exit(1);
  }
  if (!repoSlug || !repoSlug.includes("/")) {
    report.errors.push("Missing/invalid env GITHUB_REPOSITORY");
    report.exitCode = 1;
    await writeFileSafe("report.json", JSON.stringify(report, null, 2));
    await writeFileSafe("summary.md", `**ERROR**: Missing/invalid GITHUB_REPOSITORY\n`);
    process.exit(1);
  }
  if (!targetSha) {
    report.errors.push("Missing TARGET_SHA/GITHUB_SHA");
    report.exitCode = 1;
    await writeFileSafe("report.json", JSON.stringify(report, null, 2));
    await writeFileSafe("summary.md", `**ERROR**: Missing TARGET_SHA/GITHUB_SHA\n`);
    process.exit(1);
  }

  const [owner, repo] = repoSlug.split("/");

  // 1) required checks from Rulesets API (preferred)
  let requiredSpec;
  try {
    const { required, matched } = await loadRequiredFromRulesets(owner, repo);
    report.rulesets.source = "github_api";
    report.rulesets.matched = matched;
    report.rulesets.required = required;

    requiredSpec = required;
  } catch (e) {
    // 403 => fallback (do not block merge on 403 alone)
    report.errors.push(String(e.message || e));
    if (e?.status === 403) {
      const fb = await loadRequiredFromFallback();
      if (!fb) {
        report.exitCode = 1;
        await writeFileSafe("report.json", JSON.stringify(report, null, 2));
        await writeFileSafe(
          "summary.md",
          `**WARNING**: Rulesets API returned 403.\n\n` +
          `**ERROR**: No fallback file found. Create one of:\n- ${FALLBACK_FILES.join("\n- ")}\n`
        );
        process.exit(1);
      }
      report.fallback.used = true;
      report.fallback.source = fb.source;
      requiredSpec = fb.requiredSpec;
    } else {
      report.exitCode = 1;
      await writeFileSafe("report.json", JSON.stringify(report, null, 2));
      await writeFileSafe("summary.md", `**ERROR**: ${e.message || e}\n`);
      process.exit(1);
    }
  }

  const requiredMatchers = specToMatchers(requiredSpec);
  report.checks.requiredMatchers = requiredMatchers.map(m => ({ type: m.type, label: m.label, exact: m.exact }));

  // 2) checks for TARGET_SHA
  const found = await getChecksForSha(owner, repo, targetSha);
  report.checks.total = found.length;
  report.checks.found = found;

  const foundBest = new Map();
  // keep "best" record per normalized name (prefer success over failure)
  for (const f of found) {
    const k = norm(f.name);
    const prev = foundBest.get(k);
    if (!prev) foundBest.set(k, f);
    else {
      const prevOk = isSuccess(prev.kind, prev.conclusion);
      const curOk = isSuccess(f.kind, f.conclusion);
      if (curOk && !prevOk) foundBest.set(k, f);
    }
  }

  for (const rm of requiredMatchers) {
    const matched = matchRequired(rm, foundBest);
    if (!matched) {
      report.evaluation.missing.push(rm.label);
      continue;
    }
    if (!isSuccess(matched.kind, matched.conclusion)) {
      report.evaluation.notSuccessful.push({ required: rm.label, found: matched.name, conclusion: matched.conclusion });
      continue;
    }
    report.evaluation.ok.push({ required: rm.label, found: matched.name });
  }

  // exit code rules:
  // 2 => required checks missing/not-success
  // 1 => unexpected error (handled earlier)
  // 0 => ok
  if (report.evaluation.missing.length || report.evaluation.notSuccessful.length) {
    report.exitCode = 2;
  }

  const summaryLines = [];
  summaryLines.push(`- **TARGET_SHA**: \`${targetSha}\``);
  summaryLines.push(`- **Ruleset source**: ${report.rulesets.source || "fallback"}${report.fallback.used ? ` (fallback: \`${report.fallback.source}\`)` : ""}`);
  if (report.rulesets.matched?.length) {
    summaryLines.push(`- **Matched rulesets (apply to main)**:`);
    for (const m of report.rulesets.matched) summaryLines.push(`  - ${m.name} (#${m.id})`);
  }
  summaryLines.push(`- **Found checks on TARGET_SHA**: ${report.checks.total}`);
  summaryLines.push(`- **Required**: ${requiredMatchers.length}`);
  if (report.evaluation.missing.length) {
    summaryLines.push(`\n### Missing required checks`);
    for (const x of report.evaluation.missing) summaryLines.push(`- ${x}`);
  }
  if (report.evaluation.notSuccessful.length) {
    summaryLines.push(`\n### Required checks not successful`);
    for (const x of report.evaluation.notSuccessful) summaryLines.push(`- ${x.required} -> found: ${x.found} (${x.conclusion})`);
  }
  if (!report.evaluation.missing.length && !report.evaluation.notSuccessful.length) {
    summaryLines.push(`\n✅ All required checks are present and successful on TARGET_SHA.`);
  }

  await writeFileSafe("report.json", JSON.stringify(report, null, 2));
  await writeFileSafe("summary.md", summaryLines.join("\n") + "\n");

  // Always print something useful to logs
  console.log(summaryLines.join("\n"));

  process.exit(report.exitCode);
}

main().catch(async (e) => {
  const msg = `Unhandled error: ${e?.stack || e?.message || String(e)}`;
  try {
    await writeFileSafe("report.json", JSON.stringify({ error: msg }, null, 2));
    await writeFileSafe("summary.md", `**ERROR**: ${msg}\n`);
  } catch {}
  console.error(msg);
  process.exit(1);
});
