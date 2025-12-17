import React from 'react';
import { describe, it, beforeAll, expect } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from './DashboardPage';
import { AuthContext } from '../auth/AuthContext';
import { apiFetch, setAuthToken } from '../api/client';

const shouldRunSmoke = process.env.RUN_SMOKE_DASHBOARD === '1';
const describeSmoke = shouldRunSmoke ? describe : describe.skip;

const parseAuthResponse = (payload, response) => {
  const headerToken =
    response.headers.get('Authorization') || response.headers.get('authorization') || response.headers.get('X-Auth-Token');
  const tokenFromBody =
    (payload && typeof payload === 'object' && (payload.access_token || payload.token || payload.jwt)) || null;
  const normalizedHeaderToken =
    headerToken && headerToken.startsWith('Bearer ') ? headerToken.replace(/^Bearer\s+/i, '') : headerToken;
  const resolvedToken = tokenFromBody || normalizedHeaderToken;
  const resolvedUser =
    (payload && typeof payload === 'object' && (payload.user || payload.data || payload.payload)) || payload || null;
  return { token: resolvedToken, user: resolvedUser };
};

describeSmoke('Dashboard smoke (requires running backend and frontend)', () => {
  const email = process.env.CRM_SMOKE_EMAIL || 'rep@example.com';
  const password = process.env.CRM_SMOKE_PASSWORD || 'password';
  let token = null;
  let user = null;

  beforeAll(async () => {
    const { data, response } = await apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    const authResult = parseAuthResponse(data, response);
    if (!authResult.token) {
      throw new Error('Smoke login did not return a token');
    }
    token = authResult.token;
    user = authResult.user;
    setAuthToken(token);
  }, 20000);

  it(
    'renders summary metrics without 422/401 errors',
    async () => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: 0, staleTime: 0 } },
      });

      render(
        <AuthContext.Provider value={{ user, token, login: async () => user, logout: () => {} }}>
          <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={['/dashboard']}>
              <DashboardPage />
            </MemoryRouter>
          </QueryClientProvider>
        </AuthContext.Provider>,
      );

      const summarySection = await screen.findByLabelText('Visits summary metrics', undefined, { timeout: 20000 });

      await waitFor(() => {
        const summaryText = summarySection.textContent || '';
        expect(/\d/.test(summaryText)).toBe(true);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Unable to load summary metrics/i)).toBeNull();
        expect(screen.queryByText(/Unable to load latest visits/i)).toBeNull();
      });

      cleanup();
      client.clear();
    },
    30000,
  );
});
