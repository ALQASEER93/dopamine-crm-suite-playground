import { spawn } from 'node:child_process';
import { createServer } from 'vite';

const baseURL = process.env.CRM_FRONTEND_URL || 'http://127.0.0.1:5174';
const parsedUrl = new URL(baseURL);
const host = parsedUrl.hostname || '127.0.0.1';
const port = Number(parsedUrl.port || 5174);

async function hasExistingFrontend() {
  try {
    const response = await fetch(baseURL);
    return response.ok;
  } catch (_error) {
    return false;
  }
}

function runPlaywright() {
  return new Promise(resolve => {
    const child = spawn(
      process.execPath,
      ['./node_modules/@playwright/test/cli.js', 'test', '--config=playwright.config.ts'],
      {
        cwd: new URL('..', import.meta.url),
        env: {
          ...process.env,
          PLAYWRIGHT_SKIP_WEBSERVER: '1',
        },
        shell: false,
        stdio: 'inherit',
      },
    );

    child.on('exit', code => resolve(code ?? 1));
    child.on('error', error => {
      console.error(error);
      resolve(1);
    });
  });
}

let server = null;
try {
  if (!(await hasExistingFrontend())) {
    server = await createServer({
      server: {
        host,
        port,
        strictPort: true,
        stdin: false,
      },
      clearScreen: false,
    });
    await server.listen();
  }

  const exitCode = await runPlaywright();
  await server?.close();
  process.exit(exitCode);
} catch (error) {
  await server?.close().catch(() => {});
  console.error(error);
  process.exit(1);
}
