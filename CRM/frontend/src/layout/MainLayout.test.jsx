import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MainLayout from './MainLayout';
import { AuthContext } from '../auth/AuthContext';

describe('MainLayout language and RBAC shell', () => {
  it('starts Arabic RTL and switches the visible shell to English LTR', () => {
    window.localStorage.removeItem('dpm.language');
    render(
      <AuthContext.Provider
        value={{
          user: { id: 1, name: 'QA Admin', role: { slug: 'admin' } },
          token: 'test',
          logout: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={['/account']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/account" element={<div>route content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('link', { name: 'حسابي' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    fireEvent.click(screen.getByTestId('language-toggle'));
    expect(screen.getByRole('link', { name: 'My account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'en');
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
  });
});
