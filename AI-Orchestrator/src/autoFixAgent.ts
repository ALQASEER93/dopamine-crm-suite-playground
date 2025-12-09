import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { config } from './config';

export type FailureTask = 'test' | 'lint' | 'build';

export interface FailureDetail {
  task: FailureTask;
  stdoutSnippet?: string;
  stderrSnippet?: string;
  errorSnippet?: string;
  note?: string;
}

export interface FailureSummary {
  projectName: string;
  projectPath: string;
  failures: FailureDetail[];
}

const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const reportDir = path.join(process.cwd(), 'REPORTS');

function ensureReportDir() {
  return fs.promises.mkdir(reportDir, { recursive: true });
}

function formatFailuresMarkdown(failuresByProject: FailureSummary[], analysis: string) {
  const lines: string[] = [];
  lines.push(`# Patch Proposals – ${dateStr}`);
  lines.push('');

  for (const project of failuresByProject) {
    lines.push(`## ${project.projectName.toUpperCase()} (${project.projectPath})`);
    if (!project.failures.length) {
      lines.push('- No failures recorded for this project.');
      lines.push('');
      continue;
    }

    for (const failure of project.failures) {
      lines.push(`- ${failure.task}: failed`);
      if (failure.stderrSnippet) lines.push(`  - stderr: \`\`\`\n${failure.stderrSnippet}\n\`\`\``);
      if (failure.stdoutSnippet) lines.push(`  - stdout: \`\`\`\n${failure.stdoutSnippet}\n\`\`\``);
      if (failure.errorSnippet) lines.push(`  - error snippet: \`\`\`\n${failure.errorSnippet}\n\`\`\``);
      if (failure.note) lines.push(`  - note: ${failure.note}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Auto-Fix Proposals');
  lines.push('');
  lines.push(analysis.trim());
  lines.push('');

  return lines.join('\n');
}

function buildPrompt(failuresByProject: FailureSummary[]) {
  const lines: string[] = [];
  lines.push(
    'You are an AI Code Review & Auto-Fix Assistant for Dopamine Pharma projects (CRM2 backend and PWA).',
  );
  lines.push('Your job: analyze the failing commands and propose concise code patches (do NOT apply changes).');
  lines.push('Return clear sections per project with root cause and suggested patch-ready code blocks.');
  lines.push('');
  for (const project of failuresByProject) {
    lines.push(`Project: ${project.projectName} (${project.projectPath})`);
    for (const failure of project.failures) {
      lines.push(`- Task: ${failure.task}`);
      if (failure.stderrSnippet) {
        lines.push(`  stderr:\n${failure.stderrSnippet}`);
      }
      if (failure.stdoutSnippet) {
        lines.push(`  stdout:\n${failure.stdoutSnippet}`);
      }
      if (failure.errorSnippet) {
        lines.push(`  error snippet:\n${failure.errorSnippet}`);
      }
      if (failure.note) {
        lines.push(`  note: ${failure.note}`);
      }
    }
    lines.push('');
  }
  lines.push(
    'Output as markdown with sections per project, include root cause analysis and explicit patch suggestions with code blocks.',
  );
  return lines.join('\n');
}

function extractTextFromResponse(resp: any) {
  if (resp?.output_text) return resp.output_text as string;
  const outputs = resp?.output ?? [];
  if (Array.isArray(outputs) && outputs.length) {
    const pieces: string[] = [];
    for (const item of outputs) {
      if (item?.content && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (typeof c.text === 'string') pieces.push(c.text);
          else if (typeof c === 'string') pieces.push(c);
        }
      } else if (typeof item?.text === 'string') {
        pieces.push(item.text);
      }
    }
    if (pieces.length) return pieces.join('\n');
  }
  return JSON.stringify(outputs ?? resp, null, 2);
}

export async function runAutoFixAnalysis(failuresByProject: FailureSummary[]): Promise<void> {
  const hasFailures = failuresByProject.some((p) => p.failures.length);
  if (!hasFailures) {
    console.log('AutoFix: no failures to analyze.');
    return;
  }

  if (!config.openaiApiKey) {
    console.warn('AutoFix: OPENAI_API_KEY missing; skipping analysis.');
    return;
  }

  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const prompt = buildPrompt(failuresByProject);

  let analysisText = 'Auto-fix analysis unavailable.';
  try {
    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt,
    });
    analysisText = extractTextFromResponse(response);
  } catch (err) {
    console.warn('AutoFix: failed to get analysis from OpenAI:', (err as Error).message);
    analysisText = `Analysis request failed: ${(err as Error).message}`;
  }

  await ensureReportDir();
  const reportPath = path.join(reportDir, `patch-proposals-${dateStr}.md`);
  const content = formatFailuresMarkdown(failuresByProject, analysisText);
  await fs.promises.writeFile(reportPath, content, 'utf8');
  console.log(`Patch proposals written to ${reportPath}`);
}
