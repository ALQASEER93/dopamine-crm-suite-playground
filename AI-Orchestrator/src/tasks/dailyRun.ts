import fs from "node:fs";
import path from "node:path";
import { DailySummary } from "../models/dailySummary";
import { runBackendHealth } from "./backendHealth";
import { buildCodexPromptFromLatestReport } from "./backendPrompt";

const REPORTS_DIR = "D:/CRM ALQASEER/CRM/reports";
const DAILY_PREFIX = "daily_summary_";

export async function runDailyOrchestration(): Promise<DailySummary> {
  const startedAt = new Date();
  const backend = await runBackendHealth();

  const summary: DailySummary = {
    project: "ALQASEER CRM Backend",
    runAt: startedAt.toISOString(),
    testStatus: backend.status,
    backendReportPath: backend.reportPath,
    codexPromptPath: "",
    notes: "",
  };

  if (backend.status !== "passed") {
    const promptResult = await buildCodexPromptFromLatestReport();
    if (promptResult.ok && promptResult.outputPath) {
      summary.codexPromptPath = promptResult.outputPath;
      summary.notes = promptResult.message;
    } else {
      summary.notes =
        backend.status === "blocked"
          ? `Tests blocked (EPERM). Prompt generation result: ${promptResult.message}`
          : `Tests failed but prompt generation did not succeed: ${promptResult.message}`;
    }
  } else {
    summary.notes = "Backend tests passed. No Codex prompt generated.";
  }

  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const timestamp = startedAt.toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  const dailyPath = path.join(REPORTS_DIR, `${DAILY_PREFIX}${timestamp}.json`);

  fs.writeFileSync(dailyPath, JSON.stringify(summary, null, 2), "utf-8");

  return summary;
}
