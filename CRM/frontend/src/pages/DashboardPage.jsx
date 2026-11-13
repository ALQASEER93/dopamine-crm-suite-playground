import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import { listDoctors } from '../api/endpoints/doctors';
import { listPharmacies } from '../api/endpoints/pharmacies';
import { listVisits } from '../api/visits';
import './DashboardPage.css';

const getAmmanDateKey = (date = new Date()) => {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Amman',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const parts = Object.fromEntries(dateParts.map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getLocale = user => {
  const preferredLocale = [user?.language, user?.locale, user?.preferences?.language, document.documentElement.lang]
    .find(value => typeof value === 'string' && value.trim());
  return preferredLocale?.toLowerCase().split(/[-_]/)[0] === 'en' ? 'en' : 'ar';
};

const COPY = {
  ar: {
    title: 'العمل اليومي',
    today: date => new Intl.DateTimeFormat('ar-JO', { dateStyle: 'full', timeZone: 'Asia/Amman' }).format(date),
    visitsLink: 'إدارة الزيارات',
    visitMetrics: 'مؤشرات زيارات اليوم',
    totalVisits: 'زيارات اليوم',
    scheduled: 'مجدولة',
    completed: 'مكتملة',
    activeVisits: 'زيارات جارية',
    todayVisits: 'قائمة اليوم',
    activeDescription: 'تابع الزيارات التي بدأت بالفعل.',
    todayDescription: 'زيارات اليوم المسجلة في النظام.',
    records: 'بحث في السجلات',
    recordsDescription: 'ابحث في سجلات الأطباء والصيدليات.',
    searchPlaceholder: 'الاسم أو العيادة أو الصيدلية',
    searchLabel: 'البحث عن طبيب أو صيدلية',
    doctors: 'الأطباء',
    pharmacies: 'الصيدليات',
    openDirectory: 'فتح الدليل',
    doctor: 'طبيب',
    pharmacy: 'صيدلية',
    loading: 'جارٍ التحميل…',
    loadingVisits: 'جارٍ تحميل الزيارات…',
    loadingRecords: 'جارٍ تحميل السجلات…',
    noActiveVisits: 'لا توجد زيارات جارية الآن.',
    noTodayVisits: 'لا توجد زيارات مسجلة لهذا اليوم.',
    noRecords: 'لا توجد سجلات مطابقة.',
    unknownAccount: 'حساب غير محدد',
    unknownRep: 'مندوب غير محدد',
    visitActions: 'فتح الزيارات',
    startedAt: 'بدأت',
    todaySummaryError: 'تعذر تحميل مؤشرات اليوم.',
    activeError: 'تعذر تحميل الزيارات الجارية.',
    todayError: 'تعذر تحميل قائمة اليوم.',
    doctorsError: 'تعذر تحميل دليل الأطباء.',
    pharmaciesError: 'تعذر تحميل دليل الصيدليات.',
    scheduledStatus: 'مجدولة',
    inProgressStatus: 'جارية',
    completedStatus: 'مكتملة',
    cancelledStatus: 'ملغاة',
  },
  en: {
    title: 'Today at work',
    today: date => new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: 'Asia/Amman' }).format(date),
    visitsLink: 'Manage visits',
    visitMetrics: "Today's visit metrics",
    totalVisits: "Today's visits",
    scheduled: 'Scheduled',
    completed: 'Completed',
    activeVisits: 'In-progress visits',
    todayVisits: "Today's list",
    activeDescription: 'Continue visits that have already started.',
    todayDescription: 'Visits for today recorded in the system.',
    records: 'Search records',
    recordsDescription: 'Search doctor and pharmacy records.',
    searchPlaceholder: 'Name, clinic, or pharmacy',
    searchLabel: 'Search doctors or pharmacies',
    doctors: 'Doctors',
    pharmacies: 'Pharmacies',
    openDirectory: 'Open directory',
    doctor: 'Doctor',
    pharmacy: 'Pharmacy',
    loading: 'Loading…',
    loadingVisits: 'Loading visits…',
    loadingRecords: 'Loading records…',
    noActiveVisits: 'There are no in-progress visits right now.',
    noTodayVisits: 'No visits are recorded for today.',
    noRecords: 'No matching records.',
    unknownAccount: 'Unspecified account',
    unknownRep: 'Unspecified representative',
    visitActions: 'Open visits',
    startedAt: 'Started',
    todaySummaryError: "Today's metrics could not be loaded.",
    activeError: 'In-progress visits could not be loaded.',
    todayError: "Today's visit list could not be loaded.",
    doctorsError: 'The doctor directory could not be loaded.',
    pharmaciesError: 'The pharmacy directory could not be loaded.',
    scheduledStatus: 'Scheduled',
    inProgressStatus: 'In progress',
    completedStatus: 'Completed',
    cancelledStatus: 'Cancelled',
  },
};

const getAccountName = (visit, copy) =>
  visit.doctor?.name || visit.pharmacy?.name || visit.hcp?.name || visit.account?.name || copy.unknownAccount;

const getAccountType = (visit, copy) =>
  visit.pharmacy || visit.doctor?.type === 'pharmacy' || visit.hcp?.type === 'pharmacy' || visit.account?.type === 'pharmacy'
    ? copy.pharmacy
    : copy.doctor;

const getStatusLabel = (status, copy) => {
  const labels = {
    scheduled: copy.scheduledStatus,
    in_progress: copy.inProgressStatus,
    completed: copy.completedStatus,
    cancelled: copy.cancelledStatus,
  };
  return labels[status] || String(status || '').replace(/_/g, ' ');
};

const formatTime = (value, locale) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Amman',
  }).format(date);
};

const DashboardPage = () => {
  const { token, user } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const normalizedSearch = search.trim();
    if (!normalizedSearch) {
      setDebouncedSearch('');
      return undefined;
    }
    const timer = window.setTimeout(() => setDebouncedSearch(normalizedSearch), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const locale = getLocale(user);
  const copy = COPY[locale];
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const todayKey = getAmmanDateKey();
  const todayLabel = copy.today(new Date());
  const queryIdentity = token || user?.id || null;
  const isSearchPending = search.trim() !== debouncedSearch;

  const todaySummaryQuery = useQuery({
    queryKey: ['dashboard', 'todaySummary', queryIdentity, todayKey],
    queryFn: async () => {
      const { data } = await apiClient.get(`/visits/summary?date_from=${todayKey}&date_to=${todayKey}`, { token });
      return data?.data ?? data;
    },
    enabled: !!token,
    staleTime: 30_000,
  });

  const activeVisitsQuery = useQuery({
    queryKey: ['dashboard', 'activeVisits', queryIdentity],
    queryFn: () => listVisits({ statuses: ['in_progress'], page: 1, page_size: 5 }),
    enabled: !!token,
    staleTime: 15_000,
  });

  const todayVisitsQuery = useQuery({
    queryKey: ['dashboard', 'todayVisits', queryIdentity, todayKey],
    queryFn: () =>
      listVisits({
        from_date: todayKey,
        to_date: todayKey,
        statuses: ['scheduled', 'in_progress', 'completed', 'cancelled'],
        page: 1,
        page_size: 6,
      }),
    enabled: !!token,
    staleTime: 15_000,
  });

  const doctorsQuery = useQuery({
    queryKey: ['dashboard', 'recordSearch', 'doctors', queryIdentity, debouncedSearch],
    queryFn: () => listDoctors({ page: 1, page_size: 5, search: debouncedSearch }),
    enabled: !!token,
    staleTime: 20_000,
  });

  const pharmaciesQuery = useQuery({
    queryKey: ['dashboard', 'recordSearch', 'pharmacies', queryIdentity, debouncedSearch],
    queryFn: () => listPharmacies({ page: 1, pageSize: 5, search: debouncedSearch }),
    enabled: !!token,
    staleTime: 20_000,
  });

  const activeVisits = activeVisitsQuery.data?.data ?? [];
  const todayVisits = todayVisitsQuery.data?.data ?? [];
  const records = useMemo(() => {
    const doctors = (doctorsQuery.data?.data ?? []).slice(0, 5).map(doctor => ({
      id: doctor.id,
      name: doctor.name,
      detail: doctor.specialty || doctor.clinic || doctor.city,
      type: 'doctor',
      href: '/doctors',
    }));
    const pharmacies = (pharmaciesQuery.data?.data ?? []).slice(0, 5).map(pharmacy => ({
      id: pharmacy.id,
      name: pharmacy.name,
      detail: [pharmacy.city, pharmacy.area].filter(Boolean).join(' · '),
      type: 'pharmacy',
      href: '/pharmacies',
    }));
    return [...doctors, ...pharmacies];
  }, [doctorsQuery.data, pharmaciesQuery.data]);

  const todayMetrics = [
    { label: copy.totalVisits, value: todaySummaryQuery.data?.totalVisits },
    { label: copy.scheduled, value: todaySummaryQuery.data?.scheduledVisits },
    { label: copy.completed, value: todaySummaryQuery.data?.completedVisits },
  ];

  const renderVisit = (visit, isActive = false) => {
    const visitTime = formatTime(visit.startedAt, locale);
    return (
      <li className="dashboard-home__visit" key={visit.id}>
        <div className="dashboard-home__visit-main">
          <strong>{getAccountName(visit, copy)}</strong>
          <span className="dashboard-home__visit-meta">
            {isActive ? getAccountType(visit, copy) : getStatusLabel(visit.status, copy)}
            {visit.rep?.name && ` · ${visit.rep.name}`}
          </span>
        </div>
        <div className="dashboard-home__visit-side">
          {visitTime && <time dateTime={visit.startedAt || visit.visitDate}>{visitTime}</time>}
          {isActive && visit.startedAt && (
            <span className="dashboard-home__visit-meta">
              {copy.startedAt} {formatTime(visit.startedAt, locale)}
            </span>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="page-stack dashboard-home" dir={direction} lang={locale}>
      <header className="dashboard-home__header">
        <div>
          <h1 className="page-heading">{copy.title}</h1>
          <p className="page-subtitle">{todayLabel}</p>
        </div>
        <Link to="/visits" className="btn btn-primary">
          {copy.visitsLink}
        </Link>
      </header>

      <section className="dashboard-home__metrics" aria-label={copy.visitMetrics}>
        {todayMetrics.map(metric => (
          <article className="dashboard-home__metric" key={metric.label}>
            <span>{metric.label}</span>
            {todaySummaryQuery.error ? (
              <strong className="dashboard-home__metric-value dashboard-home__metric-value--error">—</strong>
            ) : (
              <strong className="dashboard-home__metric-value">
                {todaySummaryQuery.isLoading ? copy.loading : Number(metric.value ?? 0).toLocaleString(locale)}
              </strong>
            )}
          </article>
        ))}
        {todaySummaryQuery.error && (
          <p className="dashboard-home__inline-error" role="alert">
            {copy.todaySummaryError}
          </p>
        )}
      </section>

      <div className="dashboard-home__sections">
        <section className="dashboard-home__card" aria-labelledby="dashboard-active-heading">
          <div className="dashboard-home__card-header">
            <div>
              <h2 id="dashboard-active-heading">{copy.activeVisits}</h2>
              <p>{copy.activeDescription}</p>
            </div>
            <Link to="/visits" className="dashboard-home__text-link">
              {copy.visitActions}
            </Link>
          </div>
          <div className="dashboard-home__card-content">
            {activeVisitsQuery.error ? (
              <p className="dashboard-home__state dashboard-home__state--error" role="alert">
                {copy.activeError}
              </p>
            ) : activeVisitsQuery.isLoading ? (
              <p className="dashboard-home__state" role="status">
                {copy.loadingVisits}
              </p>
            ) : activeVisits.length === 0 ? (
              <p className="dashboard-home__state">{copy.noActiveVisits}</p>
            ) : (
              <ul className="dashboard-home__visit-list">{activeVisits.map(visit => renderVisit(visit, true))}</ul>
            )}
          </div>
        </section>

        <section className="dashboard-home__card" aria-labelledby="dashboard-today-heading">
          <div className="dashboard-home__card-header">
            <div>
              <h2 id="dashboard-today-heading">{copy.todayVisits}</h2>
              <p>{copy.todayDescription}</p>
            </div>
            <Link to="/visits" className="dashboard-home__text-link">
              {copy.visitActions}
            </Link>
          </div>
          <div className="dashboard-home__card-content">
            {todayVisitsQuery.error ? (
              <p className="dashboard-home__state dashboard-home__state--error" role="alert">
                {copy.todayError}
              </p>
            ) : todayVisitsQuery.isLoading ? (
              <p className="dashboard-home__state" role="status">
                {copy.loadingVisits}
              </p>
            ) : todayVisits.length === 0 ? (
              <p className="dashboard-home__state">{copy.noTodayVisits}</p>
            ) : (
              <ul className="dashboard-home__visit-list">{todayVisits.map(visit => renderVisit(visit))}</ul>
            )}
          </div>
        </section>
      </div>

      <section className="dashboard-home__card" aria-labelledby="dashboard-records-heading">
        <div className="dashboard-home__card-header dashboard-home__records-header">
          <div>
            <h2 id="dashboard-records-heading">{copy.records}</h2>
            <p>{copy.recordsDescription}</p>
          </div>
          <div className="dashboard-home__directory-links">
            <Link to="/doctors" className="dashboard-home__text-link">
              {copy.doctors}
            </Link>
            <Link to="/pharmacies" className="dashboard-home__text-link">
              {copy.pharmacies}
            </Link>
          </div>
        </div>
        <div className="dashboard-home__card-content">
          <label className="dashboard-home__search-label" htmlFor="dashboard-record-search">
            {copy.searchLabel}
          </label>
          <input
            id="dashboard-record-search"
            className="input dashboard-home__search-input"
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
          />
          {(doctorsQuery.error || pharmaciesQuery.error) && (
            <div className="dashboard-home__record-errors" role="alert">
              {doctorsQuery.error && <p>{copy.doctorsError}</p>}
              {pharmaciesQuery.error && <p>{copy.pharmaciesError}</p>}
            </div>
          )}
          {isSearchPending || doctorsQuery.isLoading || pharmaciesQuery.isLoading ? (
            <p className="dashboard-home__state" role="status">
              {copy.loadingRecords}
            </p>
          ) : records.length === 0 && !doctorsQuery.error && !pharmaciesQuery.error ? (
            <p className="dashboard-home__state">{copy.noRecords}</p>
          ) : (
            <ul className="dashboard-home__record-list">
              {records.map(record => (
                <li className="dashboard-home__record" key={`${record.type}-${record.id}`}>
                  <div className="dashboard-home__record-main">
                    <strong>{record.name}</strong>
                    <span className="dashboard-home__visit-meta">
                      {record.type === 'doctor' ? copy.doctor : copy.pharmacy}
                      {record.detail && ` · ${record.detail}`}
                    </span>
                  </div>
                  <Link
                    to={record.href}
                    className="dashboard-home__text-link"
                    aria-label={`${copy.openDirectory}: ${record.type === 'doctor' ? copy.doctors : copy.pharmacies}`}
                  >
                    {copy.openDirectory}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
