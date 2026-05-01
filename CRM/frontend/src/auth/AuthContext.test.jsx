import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
  setAuthToken: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}));

vi.mock('../api/queryClient', () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

const AuthProbe = () => {
  const { user, token } = useAuth();
  return (
    <div>
      <span data-testid="user">{user?.name || 'none'}</span>
      <span data-testid="token">{token || 'none'}</span>
    </div>
  );
};

describe('AuthProvider persistence', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
