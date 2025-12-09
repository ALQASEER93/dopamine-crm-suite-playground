import { ProjectConfig } from "../config/projects";
import { runProcess } from "../utils/runProcess";

export interface ProjectRunResult {
  project: string;
  step: "test" | "build";
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runProjectTest(project: ProjectConfig): Promise<ProjectRunResult | null> {
  if (!project.testCommand || project.testCommand.length === 0) {
    return null;
  }

  const [cmd, ...args] = project.testCommand;
  const result = runProcess(cmd, args, project.cwd);
  return {
    project: project.name,
    step: "test",
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export async function runProjectBuild(project: ProjectConfig): Promise<ProjectRunResult | null> {
  if (!project.buildCommand || project.buildCommand.length === 0) {
    return null;
  }

  const [cmd, ...args] = project.buildCommand;
  const result = runProcess(cmd, args, project.cwd);
  return {
    project: project.name,
    step: "build",
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
