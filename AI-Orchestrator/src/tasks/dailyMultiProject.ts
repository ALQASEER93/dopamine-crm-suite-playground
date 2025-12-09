import fs from "node:fs";
import path from "node:path";
import { backendProject, frontendProject, pwaProject, aljazeeraProject, ProjectConfig } from "../config/projects";
import { MultiProjectDailySummary, ProjectDailyStatus } from "../models/dailySummary";
import { ProjectReport } from "../models/projectReport";
import { getGitStatus } from "../utils/gitStatus";
import { runBackendHealth } from "./backendHealth";
import { buildCodexPromptFromLatestReport } from "./backendPrompt";
import { runProjectBuild, runProjectTest } from "./projectRunner";
import { buildPromptsFromLatestMultiSummary } from "./multiProjectPrompt";

const REPORTS_DIR = "D:/CRM ALQASEER/CRM/reports";
const DAILY_MULTI_PREFIX = "daily_multiproject_";

type StatusResult = { status: ProjectDailyStatus["testStatus"]; exitCode: number };

function deriveStatus(result: { exitCode: number; stderr?: string } | null): StatusResult {
  if (!result) {
    return { status: "passed", exitCode: 0 };
  }
  const blocked = (result.stderr || "").includes("Process blocked by OS (EPERM)");
  if (blocked) {
    return { status: "blocked", exitCode: result.exitCode ?? -1 };
  }
  return { status: result.exitCode === 0 ? "passed" : "failed", exitCode: result.exitCode };
}

function normalizeResult(
  result: { exitCode: number; stdout: string; stderr: string } | null,
  message: string
) {
  if (result) return result;
  return { exitCode: 0, stdout: message, stderr: "" };
}

function reportSlug(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("backend")) return "backend";
  if (lower.includes("frontend")) return "frontend";
  if (lower.includes("pwa")) return "pwa";
  if (lower.includes("aljazeera")) return "aljazeera";
  return slugify(name);
}

function writeProjectReport(report: ProjectReport, slug: string) {
  const timestamp = report.timestamp.replace(/[-:]/g, "").replace(/\..+/, "");
  const filePath = path.join(REPORTS_DIR, `${slug}_report_${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");
  return filePath;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export interface MultiProjectRunResult {
  summary: MultiProjectDailySummary;
  reports: ProjectReport[];
}

export async function runMultiProjectDaily(): Promise<MultiProjectRunResult> {
  const startedAt = new Date();
  const projectsStatus: ProjectDailyStatus[] = [];
  const projectReports: ProjectReport[] = [];
  const timestamp = startedAt.toISOString();

  const projectList: ProjectConfig[] = [backendProject, frontendProject, pwaProject, aljazeeraProject];

  // Backend health (tests)
  const backendResult = await runBackendHealth();
  const backendBuildRaw = await runProjectBuild(backendProject);
  const backendBuild = normalizeResult(backendBuildRaw, "Backend build not run.");
  const backendStatus = deriveStatus(backendResult);
  const backendBuildStatus = deriveStatus(backendBuild);
  const backendGit = getGitStatus(backendProject.cwd);
  projectsStatus.push({
    name: backendProject.name,
    testStatus: backendStatus.status,
    buildStatus: backendBuildStatus.status,
    testExitCode: backendStatus.exitCode,
    buildExitCode: backendBuildStatus.exitCode,
    notes:
      backendStatus.status === "passed" && backendBuildStatus.status === "passed"
        ? "Backend tests/build passed."
        : [backendStatus.status !== "passed" ? `tests ${backendStatus.status}` : null,
          backendBuildStatus.status !== "passed" ? `build ${backendBuildStatus.status}` : null]
            .filter(Boolean)
            .join(" | "),
    testStdout: backendResult.stdout ?? "",
    testStderr: backendResult.stderr ?? "",
    buildStdout: backendBuild.stdout ?? "",
    buildStderr: backendBuild.stderr ?? "",
    gitStatus: backendGit,
  });

  projectReports.push({
    projectName: backendProject.name,
    cwd: backendProject.cwd,
    timestamp,
    testStatus: backendStatus.status,
    buildStatus: backendBuildStatus.status,
    testExitCode: backendStatus.exitCode,
    buildExitCode: backendBuildStatus.exitCode,
    testStdout: backendResult.stdout ?? "",
    testStderr: backendResult.stderr ?? "",
    buildStdout: backendBuild.stdout ?? "",
    buildStderr: backendBuild.stderr ?? "",
    gitStatus: backendGit,
  });

  let codexPromptPath: string | undefined;
  let codexPromptPaths: string[] = [];
  let globalNotes = backendStatus.status === "passed" ? "Backend tests passed." : "";

  if (backendStatus.status !== "passed") {
    const promptRes = await buildCodexPromptFromLatestReport();
    if (promptRes.ok && promptRes.outputPath) {
      codexPromptPath = promptRes.outputPath;
      globalNotes = promptRes.message;
    } else {
      globalNotes =
        backendStatus.status === "blocked"
          ? `Backend blocked (EPERM). Codex prompt not generated: ${promptRes.message}`
          : `Backend failed. Codex prompt not generated: ${promptRes.message}`;
    }
  }

  const otherProjects: ProjectConfig[] = [frontendProject, pwaProject, aljazeeraProject];

  for (const project of otherProjects) {
    const testResultRaw = await runProjectTest(project);
    const buildResultRaw = await runProjectBuild(project);
    const testRes = normalizeResult(testResultRaw, "No test command defined.");
    const buildRes = normalizeResult(buildResultRaw, "No build command defined.");
    const testStatus = deriveStatus(testRes);
    const buildStatus = deriveStatus(buildRes);
    const gitStatus = getGitStatus(project.cwd);

    projectsStatus.push({
      name: project.name,
      testStatus: testStatus.status,
      buildStatus: buildStatus.status,
      testExitCode: testStatus.exitCode,
      buildExitCode: buildStatus.exitCode,
      notes: [
        testStatus.status === "blocked"
          ? "test blocked (EPERM)"
          : testResultRaw
            ? `test exitCode=${testResultRaw.exitCode}`
            : "no test command",
        buildStatus.status === "blocked"
          ? "build blocked (EPERM)"
          : buildResultRaw
            ? `build exitCode=${buildResultRaw.exitCode}`
            : "no build command",
      ].join(" | "),
      testStdout: testRes.stdout ?? "",
      testStderr: testRes.stderr ?? "",
      buildStdout: buildRes.stdout ?? "",
      buildStderr: buildRes.stderr ?? "",
      gitStatus,
    });

    projectReports.push({
      projectName: project.name,
      cwd: project.cwd,
      timestamp,
      testStatus: testStatus.status,
      buildStatus: buildStatus.status,
      testExitCode: testStatus.exitCode,
      buildExitCode: buildStatus.exitCode,
      testStdout: testRes.stdout ?? "",
      testStderr: testRes.stderr ?? "",
      buildStdout: buildRes.stdout ?? "",
      buildStderr: buildRes.stderr ?? "",
      gitStatus,
    });
  }

  const summary: MultiProjectDailySummary = {
    runAt: timestamp,
    projects: projectsStatus,
    backendReportPath: backendResult.reportPath,
    codexPromptPath,
    codexPromptPaths,
    notes: globalNotes,
  };

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const tsSlug = timestamp.replace(/[-:]/g, "").replace(/\..+/, "");
  const dailyPath = path.join(REPORTS_DIR, `${DAILY_MULTI_PREFIX}${tsSlug}.json`);
  fs.writeFileSync(dailyPath, JSON.stringify(summary, null, 2), "utf-8");

  // Write per-project reports
  for (const report of projectReports) {
    writeProjectReport(report, reportSlug(report.projectName));
  }

  const promptResult = await buildPromptsFromLatestMultiSummary();
  if (promptResult.ok) {
    summary.codexPromptPaths = promptResult.prompts;
    codexPromptPaths = promptResult.prompts;
    fs.writeFileSync(dailyPath, JSON.stringify(summary, null, 2), "utf-8");
  }

  console.log("[MULTI PROJECT DAILY SUMMARY]");
  console.log(JSON.stringify(summary, null, 2));

  return { summary, reports: projectReports };
}
