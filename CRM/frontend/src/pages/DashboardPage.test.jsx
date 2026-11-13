import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import { AuthContext } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import { listDoctors } from '../api/endpoints/doctors';
import { listPharmacies } from '../api/endpoints/pharmacies';
import { listVisits } from '../api/visits';

vi.mock('../api/client', () => ({ apiClient: { get: vi.fn() } }));
vi.mock('../api/endpoints/doctors', () => ({ listDoctors: vi.fn() }));
vi.mock('../api/endpoints/pharmacies', () => ({ listPharmacies: vi.fn() }));
vi.mock('../api/visits', () => ({ listVisits: vi.fn() }));

const summary = {
  totalVisits: 3,
  scheduledVisits: 2,
  completedVisits: 1,
  inProgressVisits: 0,
};

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const renderDashboard = (user = { id: 7, language: 'ar' }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const result = render(
    <AuthContext.Provider value={{ user, token: 'synthetic-token' }}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
  return { ...result, queryClient };
};

const emptyVisitResult = { data: [], pagination: { total: 0 } };

beforeEach(() => {
  apiClient.get.mockResolvedValue({ data: { data: summary } });
  listVisits.mockResolvedValue(emptyVisitResult);
  listDoctors.mockResolvedValue({ data: [], pagination: { total: 0 } });
  listPharmacies.mockResolvedValue({ data: [], pagination: { total: 0 } });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DashboardPage operational home', () => {
  it('shows ongoing and today visits plus searchable doctor and pharmacy records', async () => {
    const activeVisit = {
      id: 91,
      status: 'in_progress',
      startedAt: '2026-11-13T08:20:00+03:00',
      doctor: { id: 11, name: 'د. هدى' },
      rep: { name: 'رنا' },
    };
    const activePharmacyVisit = {
      id: 93,
      status: 'in_progress',
      startedAt: '2026-11-13T09:10:00+03:00',
      doctor: { id: 22, name: 'صيدلية المدى', type: 'pharmacy' },
      rep: { name: 'سلمى' },
    };
    const todayVisit = {
      id: 92,
      status: 'scheduled',
      visitDate: '2026-11-13',
      pharmacy: { id: 21, name: 'صيدلية الندى' },
    };
    listVisits.mockImplementation(filters =>
      Promise.resolve({
        data: filters.from_date ? [activeVisit, activePharmacyVisit, todayVisit] : [activeVisit, activePharmacyVisit],
        pagination: { total: filters.from_date ? 3 : 2 },
      }),
    );
    listDoctors.mockResolvedValue({
      data: [{ id: 11, name: 'د. ندى', specialty: 'باطنية' }],
      pagination: { total: 1 },
    });
    listPharmacies.mockResolvedValue({
      data: [{ id: 21, name: 'صيدلية القمر', city: 'عمّان', area: 'الرابية' }],
      pagination: { total: 1 },
    });

    renderDashboard();

    expect(await screen.findByRole('heading', { level: 1, name: 'العمل اليومي' })).toBeInTheDocument();
    expect(await screen.findAllByText('د. هدى')).toHaveLength(2);
    expect(screen.getByText('صيدلية الندى')).toBeInTheDocument();
    const activePharmacyRow = within(screen.getByRole('region', { name: 'زيارات جارية' }))
      .getByText('صيدلية المدى')
      .closest('li');
    expect(activePharmacyRow).toHaveTextContent('صيدلية');
    expect(screen.getByText('د. ندى')).toBeInTheDocument();
    expect(screen.getByText('صيدلية القمر')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'إدارة الزيارات' })).toHaveAttribute('href', '/visits');
    expect(listVisits).toHaveBeenCalledWith(expect.objectContaining({ statuses: ['in_progress'] }));
    expect(listVisits).toHaveBeenCalledWith(
      expect.objectContaining({ from_date: expect.any(String), to_date: expect.any(String) }),
    );
    const todayVisitsCall = listVisits.mock.calls.find(([filters]) => filters.from_date);
    expect(todayVisitsCall[0].statuses).toContain('in_progress');

    fireEvent.change(screen.getByRole('searchbox', { name: 'البحث عن طبيب أو صيدلية' }), {
      target: { value: 'مركز الشفاء' },
    });
    await waitFor(() => {
      expect(listDoctors).toHaveBeenCalledWith(expect.objectContaining({ search: 'مركز الشفاء' }));
      expect(listPharmacies).toHaveBeenCalledWith(expect.objectContaining({ search: 'مركز الشفاء' }));
    });
  });

  it('shows loading states then clear empty states when there are no visits or records', async () => {
    const activeDeferred = createDeferred();
    const todayDeferred = createDeferred();
    const doctorsDeferred = createDeferred();
    const pharmaciesDeferred = createDeferred();
    listVisits.mockImplementation(filters =>
      filters.statuses?.includes('in_progress') ? activeDeferred.promise : todayDeferred.promise,
    );
    listDoctors.mockReturnValue(doctorsDeferred.promise);
    listPharmacies.mockReturnValue(pharmaciesDeferred.promise);

    renderDashboard();

    expect(screen.getAllByRole('status').some(node => node.textContent?.includes('تحميل'))).toBe(true);
    activeDeferred.resolve(emptyVisitResult);
    todayDeferred.resolve(emptyVisitResult);
    doctorsDeferred.resolve({ data: [], pagination: { total: 0 } });
    pharmaciesDeferred.resolve({ data: [], pagination: { total: 0 } });

    expect(await screen.findByText('لا توجد زيارات جارية الآن.')).toBeInTheDocument();
    expect(screen.getByText('لا توجد زيارات مسجلة لهذا اليوم.')).toBeInTheDocument();
    expect(screen.getByText('لا توجد سجلات مطابقة.')).toBeInTheDocument();
  });

  it('shows independent error states without hiding navigation to the existing visit workflow', async () => {
    listVisits.mockRejectedValue(new Error('synthetic visit error'));
    listDoctors.mockRejectedValue(new Error('synthetic doctor error'));
    listPharmacies.mockResolvedValue({ data: [], pagination: { total: 0 } });
    apiClient.get.mockRejectedValue(new Error('synthetic summary error'));

    renderDashboard();

    expect(await screen.findByText('تعذر تحميل الزيارات الجارية.')).toBeInTheDocument();
    expect(await screen.findByText('تعذر تحميل قائمة اليوم.')).toBeInTheDocument();
    expect(screen.getByText('تعذر تحميل دليل الأطباء.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'إدارة الزيارات' })).toHaveAttribute('href', '/visits');
  });

  it('uses English copy and LTR direction when the authenticated user locale is English', async () => {
    renderDashboard({ id: 7, locale: 'en-US' });

    const heading = await screen.findByRole('heading', { level: 1, name: 'Today at work' });
    expect(heading.closest('.dashboard-home')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByRole('searchbox', { name: 'Search doctors or pharmacies' })).toBeInTheDocument();
  });
});
