import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginScreen from './LoginScreen';
import { AuthContext } from './AuthContext';

const renderWithAuth = (value) =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('LoginScreen', () => {
  it('submits credentials and calls login', async () => {
    const loginMock = vi.fn().mockResolvedValue({ id: 1 });
    const logoutMock = vi.fn();

    renderWithAuth({ user: null, token: null, login: loginMock, logout: logoutMock });

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret' } });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret' });
    });
  });
});
