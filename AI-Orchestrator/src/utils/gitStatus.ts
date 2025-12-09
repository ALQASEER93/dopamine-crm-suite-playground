import fs from "node:fs";
import path from "node:path";
import { runProcess } from "./runProcess";
import { GitStatus } from "../models/gitStatus";

export function getGitStatus(cwd: string): GitStatus {
  const gitDir = path.join(cwd, ".git");
  if (!fs.existsSync(gitDir)) {
    return { exists: false, summary: "git repo not found", modified: [], untracked: [] };
  }

  const result = runProcess("git", ["status", "--short"], cwd);
  if (result.exitCode !== 0) {
    return {
      exists: true,
      summary: `git status failed (exitCode=${result.exitCode})`,
      modified: [],
      untracked: [],
      raw: result.stderr || result.stdout,
    };
  }

  const lines = (result.stdout || "").split(/\r?\n/).filter(Boolean);
  const modified: string[] = [];
  const untracked: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("??")) {
      untracked.push(trimmed.slice(2).trim());
    } else {
      modified.push(trimmed);
    }
  }

  return {
    exists: true,
    summary: lines.length ? "dirty" : "clean",
    modified,
    untracked,
    raw: result.stdout,
  };
}
