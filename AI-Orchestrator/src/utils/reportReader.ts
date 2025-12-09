import fs from "node:fs";
import path from "node:path";
import { BackendTestReport } from "../models/backendReport";

const REPORTS_DIR = "D:/CRM ALQASEER/CRM/reports";

export function findLatestBackendReport(): string | null {
  if (!fs.existsSync(REPORTS_DIR)) {
    return null;
  }
  const files = fs
    .readdirSync(REPORTS_DIR)
    .filter((name) => name.startsWith("backend_tests_") && name.endsWith(".json"))
    .map((name) => path.join(REPORTS_DIR, name));

  if (!files.length) {
    return null;
  }

  const latest = files
    .map((filePath) => ({
      filePath,
      mtime: fs.statSync(filePath).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)[0];

  return latest?.filePath ?? null;
}

export function loadBackendReport(filePath: string): BackendTestReport | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as BackendTestReport;
  } catch (err) {
    console.warn("Failed to parse backend report:", err);
    return null;
  }
}
