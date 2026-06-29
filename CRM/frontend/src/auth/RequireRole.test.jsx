import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';

import RequireRole from './RequireRole.jsx';
import { AuthContext } from './AuthContext.jsx';

const renderWithAuth = (ui, { roleSlug } = {}) => {
  const value = {
    user: roleSlug ? { role: { slug: roleSlug } } : null,
    token: 'test',
    login: vi.fn(),
    logout: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe('RequireRole', () => {
  it('renders children for allowed roles', () => {
    renderWithAuth(
      <RequireRole roles={['admin', 'sales_manager']}>
        <div>Reports Area</div>
      </RequireRole>,
      { roleSlug: 'admin' },
    );

    expect(screen.getByText('Reports Area')).toBeInTheDocument();
  });

  it('shows not authorized for disallowed roles', () => {
    renderWithAuth(
      <RequireRole roles={['admin', 'sales_manager']}>
        <div>Reports Area</div>
      </RequireRole>,
      { roleSlug: 'medical_rep' },
    );

    expect(screen.getByText(/غير مصرح/i)).toBeInTheDocument();
    expect(screen.queryByText('Reports Area')).not.toBeInTheDocument();
  });

  it('marks admin-only routes as expected forbidden for non-admin roles', () => {
    renderWithAuth(
      <RequireRole roles={['admin']}>
        <div>Assignment Planner</div>
      </RequireRole>,
      { roleSlug: 'sales_manager' },
    );

    expect(screen.getByTestId('not-authorized')).toHaveAttribute('data-rbac-result', 'expected-forbidden');
    expect(screen.getByText(/مدير النظام فقط/i)).toBeInTheDocument();
    expect(screen.queryByText('Assignment Planner')).not.toBeInTheDocument();
  });
});
