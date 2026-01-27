import { spawnSync } from "node:child_process";

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

const ALLOWED_COMMANDS = new Set(["git", "npm", "node", "python", "py"]);

function normalizeCommand(command: string): string {
  return command.split(/[\\/]/).pop() ?? command;
}

export function runProcess(command: string, args: string[], cwd: string): ProcessResult {
  const normalized = normalizeCommand(command);
  if (!ALLOWED_COMMANDS.has(normalized)) {
    return {
      exitCode: -1,
      stdout: "",
      stderr: `Blocked command "${command}". Not in allowlist.`,
    };
  }

  // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
  // Justification: Command is validated against ALLOWED_COMMANDS allowlist above.
  try {
    const result = spawnSync(command, args, {
      cwd,
      encoding: "utf-8",
      shell: false,
    });

    if (result.error) {
      const err: any = result.error;
      const code = typeof err.code === "number" ? err.code : -1;
      const isEPERM = err.code === "EPERM";

      const message = isEPERM
        ? `Process blocked by OS (EPERM) while running "${command} ${args.join(" ")}" in "${cwd}".`
        : `Spawn error while running "${command} ${args.join(" ")}" in "${cwd}": ${err.message}`;

      return {
        exitCode: isEPERM ? -1 : code,
        stdout: result.stdout ?? "",
        stderr: message,
      };
    }

    const exitCode = typeof result.status === "number" ? result.status : -1;
    const stdout = result.stdout ?? "";
    let stderr = result.stderr ?? "";

    if (exitCode === -1 && !stderr) {
      stderr = `Process returned exitCode -1 without stderr for "${command} ${args.join(" ")}" in "${cwd}".`;
    }

    return { exitCode, stdout, stderr };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    const code = typeof err.code === "number" ? err.code : -1;
    const isEPERM = err.code === "EPERM";

    const message = isEPERM
      ? `Process blocked by OS (EPERM) while running "${command} ${args.join(" ")}" in "${cwd}".`
      : `Spawn failed for "${command} ${args.join(" ")}" in "${cwd}": ${err.message}`;

    return {
      exitCode: isEPERM ? -1 : code,
      stdout: "",
      stderr: message,
    };
  }
}
