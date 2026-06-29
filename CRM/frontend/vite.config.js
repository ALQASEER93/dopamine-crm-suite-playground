import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const SAME_ORIGIN_API_BASE = '/api/v1';

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

  return SAME_ORIGIN_API_BASE;
};

const validateProdApiBaseUrl = (apiBaseUrl) => {
  const normalized = (apiBaseUrl || '').trim();

  if (!normalized || isLocalApiUrl(normalized) || /\.vercel\.app(?:\/|$)/i.test(normalized)) {
    throw new Error(
      [
        'Production build blocked: invalid API base URL.',
        'Use same-origin /api/v1 or set VITE_API_BASE_URL to an approved deployed API host.',
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
    server: {
      proxy: {
        '/api': {
          target: env.CRM_API_ORIGIN || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    },
  };
});
