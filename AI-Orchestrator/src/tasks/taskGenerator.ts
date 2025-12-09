import fs from "node:fs";
import path from "node:path";
import { ProjectReport } from "../models/projectReport";

const PROMPTS_DIR = "D:/CRM ALQASEER/CRM/prompts";

export function taskFilenameFor(projectName: string): string {
  if (projectName.toLowerCase().includes("backend")) return "codex_tasks_CRM_backend.md";
  if (projectName.toLowerCase().includes("frontend")) return "codex_tasks_CRM_frontend.md";
  if (projectName.toLowerCase().includes("pwa")) return "codex_tasks_PWA.md";
  if (projectName.toLowerCase().includes("aljazeera")) return "codex_tasks_AlJazeera.md";
  return `codex_tasks_${projectName.replace(/\s+/g, "_")}.md`;
}

function severityFor(status: string): "High" | "Medium" | "Low" {
  if (status === "passed") return "Low";
  if (status === "blocked") return "High";
  return "High";
}

function formatGitStatus(report: ProjectReport): string {
  const git = report.gitStatus;
  if (!git.exists) return "git repo not found";
  const parts: string[] = [];
  parts.push(`state: ${git.summary}`);
  if (git.modified.length) parts.push(`modified: ${git.modified.join(", ")}`);
  if (git.untracked.length) parts.push(`untracked: ${git.untracked.join(", ")}`);
  return parts.join(" | ") || "clean";
}

function buildMarkdown(report: ProjectReport): string {
  const problems: string[] = [];
  if (report.testStatus !== "passed") {
    problems.push(
      `1. Severity: ${severityFor(report.testStatus)}\n   - Tests ${report.testStatus}\n   - Exit code: ${report.testExitCode}\n   - stderr: ${report.testStderr || "(empty)"}\n   - Suggested areas: review test files and recent changes.`
    );
  }
  if (report.buildStatus !== "passed") {
    const idx = problems.length + 1;
    problems.push(
      `${idx}. Severity: ${severityFor(report.buildStatus)}\n   - Build ${report.buildStatus}\n   - Exit code: ${report.buildExitCode}\n   - stderr: ${report.buildStderr || "(empty)"}\n   - Suggested areas: build config, dependencies, environment.`
    );
  }
  if (!problems.length) {
    problems.push("1. Severity: Low\n   - No failures detected. Consider lint/cleanup or minor improvements.");
  }

  return [
    `# ${report.projectName} - ${report.cwd}`,
    "",
    "## Summary",
    `- Test status: ${report.testStatus} (exit ${report.testExitCode})`,
    `- Build status: ${report.buildStatus} (exit ${report.buildExitCode})`,
    `- Git: ${formatGitStatus(report)}`,
    `- Timestamp: ${report.timestamp}`,
    "",
    "## Problems",
    ...problems,
    "",
    "## Logs (truncated to latest run)",
    "### Test stdout",
    "```",
    report.testStdout || "(empty)",
    "```",
    "### Test stderr",
    "```",
    report.testStderr || "(empty)",
    "```",
    "### Build stdout",
    "```",
    report.buildStdout || "(empty)",
    "```",
    "### Build stderr",
    "```",
    report.buildStderr || "(empty)",
    "```",
    "",
    "## Instructions for Codex/Aider",
    `- Working directory: ${report.cwd}`,
    "- You may edit project files, add/update tests, and run npm test/build as needed.",
    "- Focus on the problems above; keep unrelated behavior unchanged.",
  ].join("\n");
}

export function generateTaskFiles(reports: ProjectReport[]): string[] {
  fs.mkdirSync(PROMPTS_DIR, { recursive: true });
  const written: string[] = [];
  for (const report of reports) {
    const filename = taskFilenameFor(report.projectName);
    const filePath = path.join(PROMPTS_DIR, filename);
    const content = buildMarkdown(report);
    fs.writeFileSync(filePath, content, "utf-8");
    written.push(filePath);
  }
  return written;
}

export function buildInstructionSnippets(reports: ProjectReport[]): string[] {
  return reports.map((report) => {
    const filePath = path.join(PROMPTS_DIR, taskFilenameFor(report.projectName));
    return [
      `Project: ${report.projectName}`,
      `Path: ${report.cwd}`,
      `Task file: ${filePath}`,
      "Copy-paste into Codex/Aider:",
      `\"\"\"`,
      `You may modify files under ${report.cwd}. Focus on issues in ${filePath}. Run npm test/build as needed.`,
      `\"\"\"`,
    ].join("\n");
  });
}
