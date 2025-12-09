import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import DoctorsPage from './DoctorsPage';
import { AuthContext } from '../auth/AuthContext';

vi.mock('../api/endpoints/doctors', () => {
  const sample = [
    { id: 1, name: 'Dr. Ali', specialty: 'Cardiology', city: 'Amman', area: 'Downtown', segment: 'A' },
    { id: 2, name: 'Dr. Sara', specialty: 'Pediatrics', city: 'Irbid', area: 'North', segment: 'B' },
  ];
  return {
    doctorKeys: {
      all: ['doctors'],
      list: params => ['doctors', params],
      detail: id => ['doctors', 'detail', id],
    },
    listDoctors: vi.fn().mockResolvedValue({ data: sample, meta: { total: sample.length } }),
    createDoctor: vi.fn().mockResolvedValue({}),
    updateDoctor: vi.fn().mockResolvedValue({}),
  };
});

describe('DoctorsPage', () => {
  const renderPage = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <AuthContext.Provider value={{ user: { role: { slug: 'admin' } }, token: 'test', login: vi.fn(), logout: vi.fn() }}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <DoctorsPage />
          </MemoryRouter>
        </QueryClientProvider>
      </AuthContext.Provider>,
    );
  };

  it('renders doctors from the API list', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Dr. Ali')).toBeInTheDocument();
      expect(screen.getByText('Dr. Sara')).toBeInTheDocument();
    });

    expect(screen.getByText(/Cardiology/i)).toBeInTheDocument();
    expect(screen.getByText(/Pediatrics/i)).toBeInTheDocument();
  });
});
