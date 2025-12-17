#!/usr/bin/env node
/**
 * Lightweight smoke test to prove the dashboard endpoints succeed with auth.
 * Requires the FastAPI backend to be running locally.
 */

const apiBase = (process.env.CRM_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');
const email = process.env.SMOKE_LOGIN_EMAIL || 'admin@example.com';
const password = process.env.SMOKE_LOGIN_PASSWORD || 'password';

const buildUrl = path => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBase}${normalizedPath}`;
};

async function login() {
  const response = await fetch(buildUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Login failed (${response.status}): ${payload?.detail || response.statusText}`);
  }
  const token = payload.token || payload.access_token || payload.jwt;
  if (!token) {
    throw new Error('Login response missing token field');
  }
  return { token, user: payload.user || payload.data || payload.payload || payload };
}

async function fetchWithAuth(path, token) {
  const response = await fetch(buildUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status} ${response.statusText}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function main() {
  console.log(`Using API base: ${apiBase}`);
  const { token, user } = await login();
  console.log(`Authenticated as ${user?.email || 'unknown user'}`);

  await fetchWithAuth('/visits/summary', token);
  console.log('✅ /visits/summary responded without error');

  await fetchWithAuth('/visits/latest?pageSize=5', token);
  console.log('✅ /visits/latest?pageSize=5 responded without error');
}

main().catch(error => {
  console.error('SMOKE FAILED:', error.message);
  process.exit(1);
});
