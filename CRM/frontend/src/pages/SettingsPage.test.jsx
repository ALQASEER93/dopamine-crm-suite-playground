import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AuthContext } from '../auth/AuthContext';
import SettingsPage from './SettingsPage';

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '../api/client';

const renderWithRole = roleSlug =>
  render(
    <AuthContext.Provider
      value={{
        user: {
          name: 'Test User',
          email: 'redacted@example.com',
          role: { slug: roleSlug },
        },
        token: 'test-token',
        login: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <SettingsPage />
    </AuthContext.Provider>,
  );

describe('SettingsPage role labels', () => {
  it.each([
    ['admin', 'مدير النظام'],
    ['sales_manager', 'مدير مبيعات'],
    ['medical_rep', 'مندوب طبي'],
  ])('renders %s as %s', (roleSlug, expectedLabel) => {
    renderWithRole(roleSlug);

    expect(screen.getByText(`الدور: ${expectedLabel}`)).toBeInTheDocument();
  });

  it('renders an enabled current-user password change form', () => {
    renderWithRole('admin');

    expect(screen.getByText(/يتطلب كلمة المرور الحالية/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تحديث كلمة المرور/ })).toBeEnabled();
  });

  it('submits password change without logging or rendering password values', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { message: 'Password changed.' } });
    renderWithRole('admin');

    fireEvent.change(screen.getByLabelText('كلمة المرور الحالية'), { target: { value: 'Current123!' } });
    fireEvent.change(screen.getByLabelText('كلمة المرور الجديدة'), { target: { value: 'Next12345!' } });
    fireEvent.change(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), { target: { value: 'Next12345!' } });
    fireEvent.click(screen.getByRole('button', { name: /تحديث كلمة المرور/ }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/auth/me/password', expect.any(Object)));
    expect(screen.getByText(/تم تحديث كلمة المرور/)).toBeInTheDocument();
  });
});
