import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { setUnauthorizedHandler } from '../api/client';

const clientMocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  setAuthToken: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}));

const queryClientMock = vi.hoisted(() => ({
  clear: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('../api/client', () => ({
  apiFetch: clientMocks.apiFetch,
  setAuthToken: clientMocks.setAuthToken,
  setUnauthorizedHandler: clientMocks.setUnauthorizedHandler,
}));

vi.mock('../api/queryClient', () => ({
  queryClient: queryClientMock,
}));

const AuthProbe = () => {
  const { user, token, sessionMessage, login } = useAuth();
  return (
    <div>
      <span data-testid="user">{user?.name || 'none'}</span>
      <span data-testid="token">{token || 'none'}</span>
      <span data-testid="session-message">{sessionMessage || 'none'}</span>
      <button type="button" onClick={() => login({ email: 'admin@example.test', password: 'valid-password' })}>
        login
      </button>
    </div>
  );
};

describe('AuthProvider persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('rehydrates both user and token from storage', async () => {
    localStorage.setItem(
      'crm.activeSession',
      JSON.stringify({
        user: { id: 7, name: 'Stored User', email: 'stored@example.com' },
        token: 'stored-token',
      }),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Stored User'));
    expect(screen.getByTestId('token')).toHaveTextContent('stored-token');
  });

  it('clears stale auth state and stores an Arabic session-expired message on protected 401', async () => {
    localStorage.setItem(
      'crm.activeSession',
      JSON.stringify({
        user: { id: 7, name: 'Stored User', email: 'stored@example.com' },
        token: 'stored-token',
      }),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Stored User'));

    const registeredHandler = setUnauthorizedHandler.mock.calls.find(call => typeof call[0] === 'function')?.[0];
    expect(registeredHandler).toBeTypeOf('function');

    act(() => {
      registeredHandler({ path: '/pwa/customers', status: 401 });
    });

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'));
    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(screen.getByTestId('session-message')).toHaveTextContent('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى');
    expect(localStorage.getItem('crm.activeSession')).toBeNull();
    expect(sessionStorage.getItem('crm.sessionMessage')).toBe('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى');
    expect(queryClientMock.clear).toHaveBeenCalled();
  });

  it('stores fresh login state and clears a prior session-expired message', async () => {
    sessionStorage.setItem('crm.sessionMessage', 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى');
    clientMocks.apiFetch.mockResolvedValueOnce({
      data: {
        access_token: 'fresh-token',
        user: { id: 1, name: 'Fresh Admin', email: 'admin@example.test', role: { slug: 'admin' } },
      },
      response: new Response(null),
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByTestId('session-message')).toHaveTextContent('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى');

    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Fresh Admin'));
    expect(screen.getByTestId('token')).toHaveTextContent('fresh-token');
    expect(screen.getByTestId('session-message')).toHaveTextContent('none');
    expect(sessionStorage.getItem('crm.sessionMessage')).toBeNull();
    expect(localStorage.getItem('crm.activeSession')).toContain('fresh-token');
  });
});
