import { spawnSync } from "node:child_process";

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function runProcess(command: string, args: string[], cwd: string): ProcessResult {
  try {
    const result = spawnSync(command, args, {
      cwd,
      encoding: "utf-8",
      shell: process.platform === "win32", // let Windows resolve npm
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
