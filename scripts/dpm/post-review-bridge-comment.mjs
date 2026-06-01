import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const marker = "<!-- DPM_REVIEW_BRIDGE -->";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function githubRequest(method, url, body) {
  const token = requireEnv("GITHUB_TOKEN");
  const response = await fetch(url, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${url} failed: ${response.status} ${text}`);
  }
  return response.status === 204 ? null : response.json();
}

function commentBody(summary) {
  const artifactId = process.env.ARTIFACT_ID || summary.artifactId || "unavailable";
  const artifactName = process.env.ARTIFACT_NAME || summary.artifactName || "unavailable";
  const workflowRunUrl = process.env.WORKFLOW_RUN_URL || summary.workflowRunUrl || "unavailable";
  const screenshots = summary.artifacts?.screenshots || [];
  const screenshotLine = screenshots.length
    ? `yes (${screenshots.length}): ${screenshots.slice(0, 12).join(", ")}`
    : "no";
  const validationSummary = (summary.validations || [])
    .map((v) => `- ${v.status}: \`${v.cwd && v.cwd !== "." ? `cd ${v.cwd} && ` : ""}${v.command}\` (${v.log})`)
    .join("\n") || "- No validation records.";
  const risks = (summary.risks || ["Review generated report for residual risks."]).map((risk) => `- ${risk}`).join("\n");
  const copyBlock = `راجع DPM Review Bridge:\nRepo: ${summary.repo}\nPR: ${summary.prNumber}\nRun ID: ${summary.runId}\nVerdict: ${summary.verdict}\nCommit: ${summary.commit}\nWorkflow Run: ${workflowRunUrl}\nArtifact: ${artifactName}\nArtifact ID: ${artifactId}`;

  return `${marker}

## DPM Review Bridge

- Repo: ${summary.repo}
- PR: #${summary.prNumber}
- Branch: ${summary.branch}
- Commit: ${summary.commit}
- Run ID: ${summary.runId}
- Verdict: ${summary.verdict}
- Workflow Run URL: ${workflowRunUrl}
- Artifact name: ${artifactName}
- Artifact ID: ${artifactId}
- Screenshots included: ${screenshotLine}

### Short Summary
${summary.verdictReason}

### Validation Summary
${validationSummary}

### Risks / Blockers
${risks}

### Copy This To ChatGPT
\`\`\`
${copyBlock}
\`\`\`
`;
}

async function main() {
  const runId = requireEnv("RUN_ID");
  const [owner, repo] = requireEnv("GITHUB_REPOSITORY").split("/");
  const api = process.env.GITHUB_API_URL || "https://api.github.com";
  const summaryPath = path.join(repoRoot, "docs", "_runs", runId, "json", "chatgpt_handoff.json");
  const summary = JSON.parse(await fs.readFile(summaryPath, "utf8"));
  const prNumber = Number(process.env.PR_NUMBER || summary.prNumber);

  if (!prNumber) {
    console.log("PR number unavailable; skipping comment post.");
    return;
  }

  const body = commentBody({
    ...summary,
    artifactId: process.env.ARTIFACT_ID || summary.artifactId,
    artifactName: process.env.ARTIFACT_NAME || summary.artifactName,
    workflowRunUrl: process.env.WORKFLOW_RUN_URL || summary.workflowRunUrl,
  });

  const comments = await githubRequest("GET", `${api}/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`);
  const existing = comments.find((comment) => typeof comment.body === "string" && comment.body.includes(marker));

  if (existing) {
    await githubRequest("PATCH", `${api}/repos/${owner}/${repo}/issues/comments/${existing.id}`, { body });
    console.log(`Updated DPM Review Bridge comment ${existing.id}.`);
  } else {
    const created = await githubRequest("POST", `${api}/repos/${owner}/${repo}/issues/${prNumber}/comments`, { body });
    console.log(`Created DPM Review Bridge comment ${created.id}.`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
