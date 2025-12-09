import fs from "node:fs";
import path from "node:path";
import { backendProject, frontendProject, pwaProject, ProjectConfig } from "../config/projects";
import { MultiProjectDailySummary, ProjectDailyStatus } from "../models/dailySummary";

const REPORTS_DIR = "D:/CRM ALQASEER/CRM/reports";
const PROMPTS_DIR = "D:/CRM ALQASEER/CRM/prompts";

function findLatestMultiSummary(): string | null {
  if (!fs.existsSync(REPORTS_DIR)) return null;
  const files = fs
    .readdirSync(REPORTS_DIR)
    .filter((name) => name.startsWith("daily_multiproject_") && name.endsWith(".json"))
    .map((name) => path.join(REPORTS_DIR, name));
  if (!files.length) return null;
  const latest = files
    .map((filePath) => ({ filePath, mtime: fs.statSync(filePath).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0];
  return latest?.filePath ?? null;
}

function loadMultiSummary(filePath: string): MultiProjectDailySummary | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as MultiProjectDailySummary;
  } catch (err) {
    console.warn("Failed to parse multi-project summary:", err);
    return null;
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildProjectPrompt(
  project: ProjectConfig,
  status: ProjectDailyStatus,
  timestamp: string
): { content: string; filename: string } {
  const testCmd = project.testCommand.join(" ");
  const buildCmd = project.buildCommand.join(" ");
  const testLogs = [status.testStdout, status.testStderr].filter(Boolean).join("\n").slice(0, 3000);
  const buildLogs = [status.buildStdout, status.buildStderr].filter(Boolean).join("\n").slice(0, 3000);

  const prompt = `
You are an expert engineer for the project "${project.name}".

PROJECT PATH:
- ${project.cwd}

COMMANDS:
- Test: ${testCmd || "(none)"}
- Build: ${buildCmd || "(none)"}

LAST RUN STATUS:
- Test exit code: ${status.testExitCode}
- Build exit code: ${status.buildExitCode}

TEST LOGS (trimmed):
${testLogs || "(no logs captured)"}

BUILD LOGS (trimmed):
${buildLogs || "(no logs captured)"}

REQUEST:
- Fix the failing tests/build for this project.
- Propose precise file-level edits (paths relative to ${project.cwd}) and git-style patches.
- Keep unrelated behavior unchanged.
`.trim();

  const filename = `${slugify(project.name)}_fix_${timestamp}.txt`;
  return { content: prompt, filename };
}

export interface MultiProjectPromptResult {
  ok: boolean;
  prompts: string[];
  message: string;
}

export async function buildPromptsFromLatestMultiSummary(): Promise<MultiProjectPromptResult> {
  const latest = findLatestMultiSummary();
  if (!latest) {
    return { ok: false, prompts: [], message: "No multi-project summaries found." };
  }

  const summary = loadMultiSummary(latest);
  if (!summary) {
    return { ok: false, prompts: [], message: "Failed to parse latest multi-project summary." };
  }

  if (!fs.existsSync(PROMPTS_DIR)) {
    fs.mkdirSync(PROMPTS_DIR, { recursive: true });
  }

  const projectMap: Record<string, ProjectConfig> = {
    [backendProject.name]: backendProject,
    [frontendProject.name]: frontendProject,
    [pwaProject.name]: pwaProject,
  };

  const failing = summary.projects.filter(
    (p) =>
      p.testStatus === "failed" ||
      p.buildStatus === "failed" ||
      p.testStatus === "blocked" ||
      p.buildStatus === "blocked"
  );

  if (!failing.length) {
    return { ok: false, prompts: [], message: "All projects passed; no prompts generated." };
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  const generated: string[] = [];

  for (const status of failing) {
    const project = projectMap[status.name];
    if (!project) continue;

    const { content, filename } = buildProjectPrompt(project, status, timestamp);
    const filePath = path.join(PROMPTS_DIR, filename);
    fs.writeFileSync(filePath, content, "utf-8");
    generated.push(filePath);
  }

  return { ok: true, prompts: generated, message: `Generated ${generated.length} prompts.` };
}
