import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, setAuthToken, setUnauthorizedHandler } from './client';

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('apiFetch unauthorized handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAuthToken(null);
    setUnauthorizedHandler(null);
  });

  it('does not trigger session reset for bad login responses without an active token', async () => {
    const unauthorizedHandler = vi.fn();
    setUnauthorizedHandler(unauthorizedHandler);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse(401, { detail: 'Invalid credentials' }));

    await expect(
      apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: { email: 'user@example.test', password: 'wrong' },
      }),
    ).rejects.toMatchObject({ status: 401 });

    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });

  it('triggers session reset for protected 401 responses when a token is present', async () => {
    const unauthorizedHandler = vi.fn();
    setAuthToken('dummy-stale-token');
    setUnauthorizedHandler(unauthorizedHandler);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse(401, { detail: 'Invalid authentication token' }));

    await expect(apiFetch('/api/v1/pwa/customers')).rejects.toMatchObject({ status: 401 });

    expect(unauthorizedHandler).toHaveBeenCalledWith({ path: '/api/v1/pwa/customers', status: 401 });
  });
});
