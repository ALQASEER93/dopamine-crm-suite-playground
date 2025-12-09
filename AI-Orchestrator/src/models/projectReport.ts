import { GitStatus } from "./gitStatus";
import { DailyTestStatus } from "./dailySummary";

export interface ProjectReport {
  projectName: string;
  cwd: string;
  timestamp: string;
  testStatus: DailyTestStatus;
  buildStatus: DailyTestStatus;
  testExitCode: number;
  buildExitCode: number;
  testStdout: string;
  testStderr: string;
  buildStdout: string;
  buildStderr: string;
  gitStatus: GitStatus;
}
