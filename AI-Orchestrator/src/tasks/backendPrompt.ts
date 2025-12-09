import fs from "node:fs";
import path from "node:path";
import { backendProject } from "../config/projects";
import { BackendTestReport } from "../models/backendReport";
import { findLatestBackendReport, loadBackendReport } from "../utils/reportReader";

export interface CodexPromptResult {
  ok: boolean;
  message: string;
  outputPath: string;
}

const PROMPTS_DIR = "D:/CRM ALQASEER/CRM/prompts";

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    "_" +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

function trimText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "\n...[truncated]...";
}

function buildPrompt(report: BackendTestReport): string {
  const maxSectionLength = 2000;
  const stdout = trimText(report.stdout || "", maxSectionLength);
  const stderr = trimText(report.stderr || "", maxSectionLength);
  const testCmd = backendProject.testCommand.join(" ");

  return `
You are an expert backend engineer and test fixer.

CONTEXT:
- Project: ${backendProject.name}
- Repo path on disk: ${backendProject.cwd}
- Test command: ${testCmd || "(none)"}

LAST TEST RUN:
- Status: FAILED
- Exit code: ${report.exitCode}
- Started at: ${report.startedAt}
- Finished at: ${report.finishedAt}

TEST STDOUT:
${stdout}

TEST STDERR:
${stderr}

GOAL:
- Identify the root cause of the failing tests.
- Propose precise code edits (file paths + line ranges) to make all tests pass.
- Do NOT refactor unrelated parts of the system.
- Keep the behavior of passing tests unchanged.

When you propose changes, always:
- Reference exact file paths relative to ${backendProject.cwd}
- Explain why each change is needed.
`.trim();
}

export async function buildCodexPromptFromLatestReport(): Promise<CodexPromptResult> {
  const latest = findLatestBackendReport();
  if (!latest) {
    return { ok: false, message: "No backend test reports found.", outputPath: "" };
  }

  const report = loadBackendReport(latest);
  if (!report) {
    return { ok: false, message: "Failed to parse latest backend report.", outputPath: "" };
  }

  if (report.status === "passed") {
    return {
      ok: false,
      message: "Latest backend tests are passing - no prompt needed.",
      outputPath: "",
    };
  }

  if (!fs.existsSync(PROMPTS_DIR)) {
    fs.mkdirSync(PROMPTS_DIR, { recursive: true });
  }

  const prompt = buildPrompt(report);
  const outputPath = path.join(PROMPTS_DIR, `backend_fix_prompt_${timestamp()}.txt`);
  fs.writeFileSync(outputPath, prompt, "utf-8");

  return { ok: true, message: "Prompt generated.", outputPath };
}
