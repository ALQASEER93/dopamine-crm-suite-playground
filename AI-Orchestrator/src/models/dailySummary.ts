import { GitStatus } from "./gitStatus";

export type DailyTestStatus = "passed" | "failed" | "blocked";

export interface DailySummary {
  project: string;
  runAt: string;
  testStatus: DailyTestStatus;
  backendReportPath: string;
  codexPromptPath: string;
  notes: string;
}

export interface ProjectDailyStatus {
  name: string;
  testStatus: DailyTestStatus;
  buildStatus: DailyTestStatus;
  testExitCode: number;
  buildExitCode: number;
  notes: string;
  testStdout?: string;
  testStderr?: string;
  buildStdout?: string;
  buildStderr?: string;
  gitStatus?: GitStatus;
}

export interface MultiProjectDailySummary {
  runAt: string;
  projects: ProjectDailyStatus[];
  backendReportPath: string;
  codexPromptPath?: string;
  codexPromptPaths?: string[];
  notes: string;
}
