import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import HcpsPage from './HcpsPage';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
  apiClient: {
    get: vi.fn(),
  },
  setAuthToken: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}));

const syntheticHcp = {
  id: 17,
  name: 'Dr. Synthetic HCP',
  specialty: 'Cardiology / Synthetic',
  areaTag: 'Synthetic Area',
  segment: null,
  city: 'Test City',
  area: 'Test Area',
  phone: null,
  mobile: null,
  email: null,
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <AuthContext.Provider value={{ user: { role: { slug: 'admin' } }, token: 'test-token', login: vi.fn(), logout: vi.fn() }}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HcpsPage />
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
};

describe('HcpsPage profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockImplementation(path => {
      if (path.startsWith('/hcps?')) {
        return Promise.resolve({ data: { data: [syntheticHcp], meta: { total: 1 } } });
      }
      if (path === '/hcps/17') {
        return Promise.resolve({ data: { ...syntheticHcp } });
      }
      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });
  });

  it('loads the current HCP detail DTO and states that its activity history is unavailable', async () => {
    renderPage();

    fireEvent.click(await screen.findByText(syntheticHcp.name));

    expect(await screen.findByRole('heading', { name: syntheticHcp.name })).toBeInTheDocument();
    const profile = screen.getByRole('region', { name: 'بيانات مقدم الرعاية' });
    expect(within(profile).getByText(syntheticHcp.specialty)).toBeInTheDocument();
    for (const unsupportedFieldLabel of ['الفئة', 'التصنيف', 'التكرار', 'العلامات', 'المصدر', 'المعرف الخارجي']) {
      expect(within(profile).queryByText(unsupportedFieldLabel)).not.toBeInTheDocument();
    }
    expect(screen.getByText(/السجل غير متاح حالياً/)).toBeInTheDocument();
    expect(screen.getByText(/لا توفر واجهة API الحالية نقطة نهاية مخوّلة/)).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/hcps/17');
    expect(apiClient.get.mock.calls.some(([path]) => String(path).includes('/visits'))).toBe(false);
  });

  it('renders optional profile fields exactly when the HCP detail DTO provides them', async () => {
    const detailDto = {
      ...syntheticHcp,
      class: 'Synthetic class A',
      frequency: 'Synthetic monthly',
      flags: ['synthetic-flag', 'review-needed'],
      source: 'synthetic-fixture',
      external_id: 'synthetic-hcp-17',
    };
    apiClient.get.mockImplementation(path => {
      if (path.startsWith('/hcps?')) {
        return Promise.resolve({ data: { data: [syntheticHcp], meta: { total: 1 } } });
      }
      if (path === '/hcps/17') return Promise.resolve({ data: detailDto });
      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    renderPage();
    fireEvent.click(await screen.findByText(syntheticHcp.name));

    const profile = screen.getByRole('region', { name: 'بيانات مقدم الرعاية' });
    expect(await within(profile).findByText('Synthetic class A')).toBeInTheDocument();
    expect(within(profile).getByText('Synthetic monthly')).toBeInTheDocument();
    expect(within(profile).getByText('["synthetic-flag","review-needed"]')).toBeInTheDocument();
    expect(within(profile).getByText('synthetic-fixture')).toBeInTheDocument();
    expect(within(profile).getByText('synthetic-hcp-17')).toBeInTheDocument();
  });
});
