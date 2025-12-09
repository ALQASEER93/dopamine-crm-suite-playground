export type BackendTestStatus = "passed" | "failed" | "blocked";

export interface BackendTestReport {
  project: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number;
  status: BackendTestStatus;
  summary: string;
  stdout: string;
  stderr: string;
}
