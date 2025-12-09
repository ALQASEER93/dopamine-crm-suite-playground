import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec as cpExec } from 'child_process';
import nodemailer from 'nodemailer';
import { config } from './config';
import { runAutoFixAnalysis, FailureSummary, FailureTask } from './autoFixAgent';

const exec = promisify(cpExec);
const COMMAND_TIMEOUT_MS = 120_000;

type TaskName = FailureTask;
type TaskStatus = 'success' | 'failed' | 'skipped';

interface TaskResult {
  name: TaskName;
  status: TaskStatus;
  warnings?: string;
  stdout?: string;
  stderr?: string;
  errorSnippet?: string;
  detail?: string;
  exitCode?: number;
}

interface ProjectSummary {
  name: string;
  path: string;
  tasks: TaskResult[];
  notes: string[];
}

const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const baseDir = process.cwd();
const logDir = path.join(baseDir, 'logs', dateStr);
const reportDir = path.join(baseDir, 'REPORTS');

async function ensureDir(dirPath: string) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

function shorten(text: string, lines = 20) {
  return text.split(/\r?\n/).slice(0, lines).join('\n');
}

async function appendLog(logPath: string, content: string) {
  await fs.promises.appendFile(logPath, content);
}

async function readPackageJson(pkgPath: string) {
  const raw = await fs.promises.readFile(pkgPath, 'utf8');
  return JSON.parse(raw) as { scripts?: Record<string, string> };
}

async function runCommand(command: string, cwd: string) {
  try {
    const { stdout, stderr } = await exec(command, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
      timeout: COMMAND_TIMEOUT_MS,
    });
    return { success: true, stdout, stderr, exitCode: 0 };
  } catch (err) {
    const error = err as any;
    const exitCode = typeof error.code === 'number' ? error.code : undefined;
    const spawnError =
      typeof error.code === 'string'
        ? ['ENOENT', 'EPERM', 'EACCES'].includes(error.code)
        : typeof error.errno === 'string'
          ? ['ENOENT', 'EPERM', 'EACCES'].includes(error.errno)
          : (error.message as string | undefined)?.toLowerCase?.().includes('spawn') ?? false;
    return {
      success: false,
      stdout: error.stdout as string | undefined,
      stderr: error.stderr as string | undefined,
      message: error.message as string | undefined,
      exitCode,
      spawnError,
    };
  }
}

async function processProject(projectName: string, projectPath: string): Promise<ProjectSummary> {
  const summary: ProjectSummary = {
    name: projectName,
    path: projectPath,
    tasks: [],
    notes: [],
  };

  const logPath = path.join(logDir, `${projectName}.log`);
  await appendLog(logPath, `=== ${projectName.toUpperCase()} | ${dateStr} ===\n`);
  await appendLog(logPath, `Path: ${projectPath || 'not set'}\n`);

  if (!projectPath) {
    summary.notes.push('Path not configured.');
    summary.tasks.push(
      { name: 'test', status: 'skipped', detail: 'Missing path.' },
      { name: 'lint', status: 'skipped', detail: 'Missing path.' },
      { name: 'build', status: 'skipped', detail: 'Missing path.' },
    );
    return summary;
  }

  if (!fs.existsSync(projectPath)) {
    summary.notes.push('Path does not exist.');
    summary.tasks.push(
      { name: 'test', status: 'skipped', detail: 'Path not found.' },
      { name: 'lint', status: 'skipped', detail: 'Path not found.' },
      { name: 'build', status: 'skipped', detail: 'Path not found.' },
    );
    await appendLog(logPath, `Path not found: ${projectPath}\n\n`);
    return summary;
  }

  const pkgJsonPath = path.join(projectPath, 'package.json');
  let scripts: Record<string, string> = {};

  try {
    const pkg = await readPackageJson(pkgJsonPath);
    scripts = pkg.scripts ?? {};
  } catch (err) {
    summary.notes.push('Failed to read package.json.');
    summary.tasks.push(
      { name: 'test', status: 'skipped', detail: 'package.json unreadable.' },
      { name: 'lint', status: 'skipped', detail: 'package.json unreadable.' },
      { name: 'build', status: 'skipped', detail: 'package.json unreadable.' },
    );
    await appendLog(logPath, `Error reading package.json: ${(err as Error).message}\n\n`);
    return summary;
  }

  const orderedTasks: TaskName[] = ['test', 'lint', 'build'];

  for (const task of orderedTasks) {
    const hasScript = Boolean(scripts[task]);
    if (!hasScript) {
      summary.tasks.push({ name: task, status: 'skipped', detail: 'Script not defined.' });
      await appendLog(logPath, `-- ${task.toUpperCase()}: skipped (script not defined)\n\n`);
      continue;
    }

    const command =
      task === 'test' && projectName === 'crm2'
        ? 'node ./node_modules/jest/bin/jest.js --runInBand'
        : task === 'test'
          ? 'npm test'
          : `npm run ${task}`;
    await appendLog(logPath, `-- ${task.toUpperCase()}: running "${command}"\n`);
    const result = await runCommand(command, projectPath);

    const stdout = result.stdout ?? '';
    const stderr = result.stderr ?? '';

    const warningPatterns: { regex: RegExp; summary: string }[] = [
      {
        regex: /Dynamic server usage: Route \//i,
        summary: 'Dynamic server usage: Route / could not be rendered statically (headers used)',
      },
      { regex: /DYNAMIC_SERVER_USAGE/i, summary: 'Dynamic server usage warning detected' },
      {
        regex: /non-standard\s+"NODE_ENV"\s+value/i,
        summary: 'Non-standard NODE_ENV value warning',
      },
      { regex: /next\.js/i, summary: 'Next.js build warning detected' },
    ];

    const warningMessages = warningPatterns
      .filter(({ regex }) => regex.test(stderr))
      .map(({ summary }) => summary);

    const exitCode = typeof result.exitCode === 'number' ? result.exitCode : result.success ? 0 : undefined;
    const statusFailed = Boolean(result.spawnError) || exitCode === undefined || exitCode !== 0;
    const status: TaskStatus = statusFailed ? 'failed' : 'success';

    const stderrSnippet = stderr ? shorten(stderr, 20) : undefined;
    if (status === 'success' && stderrSnippet) {
      warningMessages.push(stderrSnippet);
    }

    const warnings = warningMessages.length ? warningMessages.join('\n') : undefined;

    const snippet = statusFailed
      ? shorten([stderr, stdout, result.message ?? ''].filter(Boolean).join('\n'), 20)
      : undefined;

    await appendLog(logPath, `stdout:\n${stdout}\n`);
    await appendLog(logPath, `stderr:\n${stderr}\n`);
    await appendLog(logPath, `status: ${status}\n\n`);

    summary.tasks.push({
      name: task,
      status,
      stdout,
      stderr,
      warnings,
      errorSnippet: snippet,
      exitCode: result.exitCode,
    });
  }

  return summary;
}

function renderReport(summaries: ProjectSummary[]) {
  const lines: string[] = [];
  lines.push(`# Daily Monitor - ${dateStr}`);
  lines.push('');

  for (const summary of summaries) {
    lines.push(`## ${summary.name.toUpperCase()} (${summary.path || 'path not set'})`);
    if (summary.notes.length) {
      lines.push(`- Notes: ${summary.notes.join(' | ')}`);
    }
    for (const task of summary.tasks) {
      const statusLabel =
        task.status === 'success' ? '✅ success' : task.status === 'failed' ? '❌ failed' : '⏭️ skipped';
      lines.push(`- ${task.name}: ${statusLabel}`);
      if (task.warnings) {
        lines.push('  - Warnings:');
        lines.push('  ```');
        lines.push(task.warnings);
        lines.push('  ```');
      }
      if (task.errorSnippet) {
        lines.push('  - Error snippet:');
        lines.push('  ```');
        lines.push(task.errorSnippet);
        lines.push('  ```');
      } else if (task.detail) {
        lines.push(`  - ${task.detail}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function buildFailureSummaries(summaries: ProjectSummary[]): FailureSummary[] {
  const results: FailureSummary[] = [];
  for (const summary of summaries) {
    const failures = summary.tasks
      .filter((t) => t.status === 'failed')
      .map((t) => ({
        task: t.name as FailureTask,
        stdoutSnippet: t.stdout ? shorten(t.stdout, 20) : undefined,
        stderrSnippet: t.stderr ? shorten(t.stderr, 20) : undefined,
        errorSnippet: t.errorSnippet,
      }));

    if (failures.length) {
      results.push({
        projectName: summary.name,
        projectPath: summary.path,
        failures,
      });
    }
  }
  return results;
}

async function sendEmailIfConfigured(subject: string, body: string) {
  const { host, port, user, pass, from, to } = config.smtp;
  if (!user || !pass || !to) {
    console.log('SMTP not fully configured; skipping email.');
    return { sent: false, reason: 'SMTP not configured' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const mailFrom = from || user;

  try {
    await transporter.sendMail({
      from: mailFrom,
      to,
      subject,
      text: body,
    });
    console.log('Email sent successfully.');
    return { sent: true };
  } catch (err) {
    console.warn('Failed to send email:', (err as Error).message);
    return { sent: false, reason: (err as Error).message };
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  await ensureDir(logDir);
  await ensureDir(reportDir);

  const projects = [
    { name: 'crm2', path: config.paths.crm },
    { name: 'pwa', path: config.paths.pwa },
  ];

  const summaries: ProjectSummary[] = [];
  for (const project of projects) {
    const summary = await processProject(project.name, project.path);
    summaries.push(summary);
  }

  const reportContent = renderReport(summaries);
  const reportPath = path.join(reportDir, `daily-${dateStr}.md`);
  await fs.promises.writeFile(reportPath, reportContent, 'utf8');
  console.log(`Report written to ${reportPath}`);

  if (isDryRun) {
    console.log('\n===== Daily Monitor (dry run) =====\n');
    console.log(reportContent);
    console.log('\nDry run enabled: email not sent.\n');
  } else {
    const emailResult = await sendEmailIfConfigured(`Daily Monitor - ${dateStr}`, reportContent);
    if (emailResult.sent) {
      console.log('Daily report emailed.');
    } else if (emailResult.reason) {
      console.log(`Email not sent: ${emailResult.reason}`);
    }
  }

  const failureSummaries = buildFailureSummaries(summaries);
  try {
    await runAutoFixAnalysis(failureSummaries);
  } catch (err) {
    console.warn('AutoFix analysis failed:', (err as Error).message);
  }
}

main().catch((err) => {
  console.error('Daily monitor failed:', err);
  process.exit(1);
});
