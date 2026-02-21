import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const LOCAL_API_DEFAULT = 'http://127.0.0.1:8000/api/v1';

const isLocalApiUrl = (value) => {
  const normalized = (value || '').trim();
  const lower = normalized.toLowerCase();

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local')
    );
  } catch (_error) {
    if (normalized.startsWith('/')) {
      return false;
    }
    return (
      lower.includes('localhost') ||
      lower.includes('127.0.0.1') ||
      lower.includes('0.0.0.0') ||
      lower.includes('::1')
    );
  }
};

const resolveApiBaseUrl = (env) => {
  const primary = env.VITE_API_BASE_URL?.trim();
  if (primary) return primary;

  const legacy = env.VITE_API_URL?.trim();
  if (legacy) return legacy;

  return LOCAL_API_DEFAULT;
};

const validateProdApiBaseUrl = (apiBaseUrl) => {
  const normalized = (apiBaseUrl || '').trim();

  if (!normalized || isLocalApiUrl(normalized) || normalized === LOCAL_API_DEFAULT) {
    throw new Error(
      [
        'Production build blocked: invalid API base URL.',
        'Set VITE_API_BASE_URL (or VITE_API_URL) to your deployed API host before running `npm run build`.',
        `Current value: "${normalized || '(empty)'}"`,
      ].join(' ')
    );
  }
};

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  if (command === 'build' && mode === 'production') {
    validateProdApiBaseUrl(resolveApiBaseUrl(env));
  }

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
    },
  };
});
