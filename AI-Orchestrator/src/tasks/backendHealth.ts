import fs from "node:fs";
import path from "node:path";
import { backendProject } from "../config/projects";
import { BackendTestStatus } from "../models/backendReport";
import { runProcess } from "../utils/runProcess";

interface BackendTestReport {
  project: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number;
  status: BackendTestStatus;
  summary: string;
  stdout: string;
  stderr: string;
}

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

export async function runBackendHealth(): Promise<{
  exitCode: number;
  status: BackendTestStatus;
  reportPath: string;
  stdout: string;
  stderr: string;
}> {
  const startedAt = new Date().toISOString();
  const [cmd, ...args] = backendProject.testCommand;
  const result = runProcess(cmd, args, backendProject.cwd);
  const finishedAt = new Date().toISOString();

  const isBlocked = (result.stderr || "").includes("Process blocked by OS (EPERM)");
  const status: BackendTestStatus = isBlocked
    ? "blocked"
    : result.exitCode === 0
      ? "passed"
      : "failed";

  const report: BackendTestReport = {
    project: backendProject.name,
    startedAt,
    finishedAt,
    exitCode: result.exitCode,
    status,
    summary:
      status === "passed"
        ? "Backend tests passed successfully."
        : status === "blocked"
          ? "Backend tests blocked (EPERM)."
          : "Backend tests failed. See stdout/stderr.",
    stdout: result.stdout,
    stderr: result.stderr,
  };

  const reportsDir = "D:/CRM ALQASEER/CRM/reports";
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const reportPath = path.join(reportsDir, `backend_tests_${timestamp()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  if (status === "passed") {
    console.log("[OK] Backend tests passed");
  } else if (status === "blocked") {
    console.log(`[BLOCKED] Backend tests blocked by OS (EPERM).`);
  } else {
    console.log(`[FAIL] Backend tests failed (exitCode=${result.exitCode})`);
  }

  return { exitCode: result.exitCode, status, reportPath, stdout: result.stdout, stderr: result.stderr };
}
