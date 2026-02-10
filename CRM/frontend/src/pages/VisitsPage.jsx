import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { listReps, repKeys } from '../api/reps';
import { doctorKeys, listDoctors } from '../api/endpoints/doctors';
import { createVisit, deleteVisit, endVisit, listVisits, startVisit, updateVisit, visitKeys } from '../api/visits';
import DetailDrawer from '../components/DetailDrawer';
import { buildGoogleMapsUrl, buildOpenStreetMapUrl, formatCoords } from '../utils/mapLinks';
import './EntityListPage.css';

const PAGE_SIZE_OPTIONS = [25, 50];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const DEFAULT_FILTERS = {
  rep_id: '',
  doctor_id: '',
  from_date: '',
  to_date: '',
};

const DEFAULT_VISIT_FORM = {
  visit_date: '',
  rep_id: '',
  doctor_id: '',
  pharmacy_id: '',
  notes: '',
  next_action: '',
  next_action_date: '',
};

const VisitForm = ({ initialValues, onSubmit, onCancel, submitting, error, reps, doctors }) => {
  const [form, setForm] = useState(initialValues || DEFAULT_VISIT_FORM);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = event => {
    event.preventDefault();
    onSubmit({
      visit_date: form.visit_date,
      rep_id: form.rep_id || undefined,
      doctor_id: form.doctor_id || undefined,
      pharmacy_id: form.pharmacy_id || undefined,
      notes: form.notes || undefined,
      next_action: form.next_action || undefined,
      next_action_date: form.next_action_date || undefined,
    });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__label">
        تاريخ الزيارة
        <input
          type="date"
          value={form.visit_date}
          onChange={e => updateField('visit_date', e.target.value)}
          required
        />
      </label>
      <label className="form__label">
        المندوب
        <select value={form.rep_id} onChange={e => updateField('rep_id', e.target.value)} required>
          <option value="">اختر المندوب</option>
          {reps.map(rep => (
            <option key={rep.id} value={rep.id}>
              {rep.name} ({rep.email})
            </option>
          ))}
        </select>
      </label>
      <label className="form__label">
        الطبيب
        <select value={form.doctor_id} onChange={e => updateField('doctor_id', e.target.value)}>
          <option value="">اختر الطبيب</option>
          {doctors.map(doc => (
            <option key={doc.id} value={doc.id}>
              {doc.name} {doc.city ? `- ${doc.city}` : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="form__label">
        الملاحظات
        <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3} />
      </label>
      <label className="form__label">
        الإجراء التالي
        <input type="text" value={form.next_action} onChange={e => updateField('next_action', e.target.value)} />
      </label>
      <label className="form__label">
        تاريخ الإجراء التالي
        <input
          type="date"
          value={form.next_action_date}
          onChange={e => updateField('next_action_date', e.target.value)}
        />
      </label>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '8px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'جاري الحفظ…' : 'حفظ'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          إلغاء
        </button>
      </div>
    </form>
  );
};

const VisitsPage = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [formInitial, setFormInitial] = useState(DEFAULT_VISIT_FORM);
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const repQuery = useQuery({
    queryKey: repKeys.all,
    queryFn: () => listReps(),
    enabled: !!token,
    select: data => (Array.isArray(data) ? data : []),
  });

  const doctorsQuery = useQuery({
    queryKey: doctorKeys.list({ page_size: pageSize }),
    queryFn: () => listDoctors({ page_size: pageSize }),
    enabled: !!token,
    select: data => (Array.isArray(data?.data) ? data.data : []),
  });

  const normalizedFilters = useMemo(() => {
    const safe = { ...filters };
    if (user?.role?.slug === 'medical_rep' && user?.id) {
      safe.rep_id = user.id;
    }
    return safe;
  }, [filters, user]);

  const visitsQuery = useQuery({
    queryKey: visitKeys.list({ ...normalizedFilters, page, page_size: pageSize }),
    queryFn: () =>
      listVisits({
        rep_id: normalizedFilters.rep_id || undefined,
        doctor_id: normalizedFilters.doctor_id || undefined,
        date_from: normalizedFilters.from_date || undefined,
        date_to: normalizedFilters.to_date || undefined,
        page,
        page_size: pageSize,
      }),
    enabled: !!token,
    select: payload => {
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      const pagination = payload?.pagination || payload?.meta;
      const total = pagination?.total ?? rows.length;
      const effectivePageSize = pagination?.page_size || pageSize;
      const totalPages =
        pagination?.total_pages ?? Math.max(1, Math.ceil(total / (effectivePageSize || DEFAULT_PAGE_SIZE)));
      return { rows, total, totalPages };
    },
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: payload => createVisit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      closeForm();
    },
    onError: error => setFormError(error.message || 'تعذر إنشاء الزيارة'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateVisit(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      closeForm();
    },
    onError: error => setFormError(error.message || 'تعذر تحديث الزيارة'),
  });

  const deleteMutation = useMutation({
    mutationFn: id => deleteVisit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      setSelected(null);
    },
  });

  const captureLocation = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('خدمة GPS غير متاحة في هذا المتصفح.');
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
        error => reject(new Error(error.message || 'تعذر التقاط الموقع')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  };

  const startMutation = useMutation({
    mutationFn: async id => {
      const coords = await captureLocation();
      return startVisit(id, coords);
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      setSelected(data);
      setActionError(null);
    },
    onError: error => setActionError(error.message || 'تعذر بدء الزيارة'),
  });

  const endMutation = useMutation({
    mutationFn: async id => {
      const coords = await captureLocation();
      return endVisit(id, coords);
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      setSelected(data);
      setActionError(null);
    },
    onError: error => setActionError(error.message || 'تعذر إنهاء الزيارة'),
  });

  const openCreate = () => {
    setFormMode('create');
    setFormInitial({
      ...DEFAULT_VISIT_FORM,
      rep_id: user?.id || '',
      visit_date: new Date().toISOString().slice(0, 10),
    });
    setFormError(null);
  };

  const openEdit = visit => {
    setFormMode('edit');
    setFormInitial({
      visit_date: visit.visit_date?.slice(0, 10) || '',
      rep_id: visit.rep_id || '',
      doctor_id: visit.doctor_id || '',
      pharmacy_id: visit.pharmacy_id || '',
      notes: visit.notes || '',
      next_action: visit.next_action || '',
      next_action_date: visit.next_action_date ? visit.next_action_date.slice(0, 10) : '',
    });
    setFormError(null);
  };

  const closeForm = () => {
    setFormMode(null);
    setFormInitial(DEFAULT_VISIT_FORM);
    setFormError(null);
  };

  const handleStartWithGps = async () => {
    if (!selected) return;
    setActionError(null);
    try {
      await startMutation.mutateAsync(selected.id);
    } catch (error) {
      setActionError(error.message || 'تعذر بدء الزيارة');
    }
  };

  const handleEndWithGps = async () => {
    if (!selected) return;
    setActionError(null);
    try {
      await endMutation.mutateAsync(selected.id);
    } catch (error) {
      setActionError(error.message || 'تعذر إنهاء الزيارة');
    }
  };

  const handleSubmit = payload => {
    setFormError(null);
    if (formMode === 'edit' && selected) {
      updateMutation.mutate({ id: selected.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const reps = repQuery.data || [];
  const doctors = doctorsQuery.data || [];
  const visits = visitsQuery.data?.rows || [];
  const totalVisits = visitsQuery.data?.total || 0;
  const totalPages = visitsQuery.data?.totalPages || 1;

  const renderAccount = visit => {
    if (visit.doctor) return `الطبيب: ${visit.doctor.name}`;
    if (visit.pharmacy) return `الصيدلية: ${visit.pharmacy.name}`;
    return 'غير متاح';
  };

  const formatTimestamp = value => (value ? new Date(value).toLocaleString() : 'غير مسجل');

  const formatLocation = location => {
    if (!location || location.lat == null || location.lng == null) return 'غير مسجل';
    const accuracyText =
      location.accuracy != null && Number.isFinite(Number(location.accuracy))
        ? ` (+/-${Number(location.accuracy).toFixed(1)}م)`
        : '';
    return `${formatCoords(location.lat, location.lng)}${accuracyText}`;
  };

  const formatStatus = status => {
    if (!status) return '-';
    const normalized = String(status).toLowerCase();
    const labels = {
      scheduled: 'مجدولة',
      planned: 'مخططة',
      active: 'جارية',
      completed: 'مكتملة',
      cancelled: 'ملغاة',
      canceled: 'ملغاة',
      pending: 'قيد الانتظار',
    };
    return labels[normalized] || String(status).replace(/_/g, ' ');
  };

  const renderGpsLinks = location => {
    if (!location || location.lat == null || location.lng == null) return null;
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
        <a className="btn btn-secondary" href={buildOpenStreetMapUrl(lat, lng)} target="_blank" rel="noreferrer">
          فتح في OpenStreetMap
        </a>
        <a className="btn btn-secondary" href={buildGoogleMapsUrl(lat, lng)} target="_blank" rel="noreferrer">
          فتح في خرائط Google
        </a>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
          (c) مساهمو OpenStreetMap
        </span>
      </div>
    );
  };

  const resetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS, rep_id: user?.role?.slug === 'medical_rep' ? user.id : '' });
    setPage(1);
  };

  return (
    <div className="entity-page">
      <div className="entity-toolbar">
        <div>
          <h1 className="page-heading">الزيارات</h1>
          <p className="page-subtitle">متابعة الزيارات الميدانية والمتابعات.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          إضافة زيارة
        </button>
      </div>

      <div className="entity-filters">
        <select
          className="input"
          value={normalizedFilters.rep_id}
          onChange={event => {
            setFilters(prev => ({ ...prev, rep_id: event.target.value }));
            setPage(1);
          }}
          disabled={user?.role?.slug === 'medical_rep'}
        >
          <option value="">كل المندوبين</option>
          {reps.map(rep => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={normalizedFilters.doctor_id}
          onChange={event => {
            setFilters(prev => ({ ...prev, doctor_id: event.target.value }));
            setPage(1);
          }}
        >
          <option value="">كل الأطباء</option>
          {doctors.map(doc => (
            <option key={doc.id} value={doc.id}>
              {doc.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="date"
          value={normalizedFilters.from_date}
          onChange={event => {
            setFilters(prev => ({ ...prev, from_date: event.target.value }));
            setPage(1);
          }}
        />
        <input
          className="input"
          type="date"
          value={normalizedFilters.to_date}
          onChange={event => {
            setFilters(prev => ({ ...prev, to_date: event.target.value }));
            setPage(1);
          }}
        />
        <button type="button" className="btn btn-secondary" onClick={resetFilters}>
          مسح الفلاتر
        </button>
      </div>

      <section className="table-card entity-table">
        {visitsQuery.error && <div className="entity-empty">تعذر تحميل الزيارات: {visitsQuery.error.message}</div>}
        {!visitsQuery.error && visitsQuery.isLoading && <div className="entity-empty">جاري تحميل الزيارات...</div>}
        {!visitsQuery.error && !visitsQuery.isLoading && visits.length === 0 && (
          <div className="entity-empty">لا توجد زيارات للفلاتر المختارة.</div>
        )}
        {!visitsQuery.error && visits.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>المندوب</th>
                <th>الحساب</th>
                <th>الحالة</th>
                <th>المدة</th>
                <th>الملاحظات</th>
                <th>الإجراء التالي</th>
              </tr>
            </thead>
            <tbody>
              {visits.map(visit => (
                <tr
                  key={visit.id}
                  onClick={() => {
                    setActionError(null);
                    setSelected(visit);
                  }}
                >
                  <td>{visit.visitDate || visit.visit_date}</td>
                  <td>{visit.rep?.name || visit.rep_id || '-'}</td>
                  <td>{renderAccount(visit)}</td>
                  <td>{formatStatus(visit.status)}</td>
                  <td>{visit.durationMinutes != null ? `${visit.durationMinutes} دقيقة` : '-'}</td>
                  <td>{visit.notes || '-'}</td>
                  <td>
                    {visit.next_action || '-'} {visit.next_action_date ? `(${visit.next_action_date})` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="entity-pagination">
          <span>
            صفحة {page} من {totalPages}
          </span>
          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              السابق
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              التالي
            </button>
          </div>
          <div>
            الصفوف
            <select
              value={pageSize}
              onChange={event => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span style={{ marginLeft: '8px' }}>الإجمالي: {totalVisits}</span>
          </div>
        </div>
      </section>

      <DetailDrawer
        title={selected ? `زيارة بتاريخ ${selected.visitDate || selected.visit_date}` : ''}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="detail-grid">
            <p>
              <strong>المندوب:</strong> {selected.rep?.name || selected.rep_id}
            </p>
            <p>
              <strong>الطبيب:</strong> {selected.doctor?.name || '-'}
            </p>
            <p>
              <strong>الصيدلية:</strong> {selected.pharmacy?.name || '-'}
            </p>
            <p>
              <strong>الحالة:</strong> {formatStatus(selected.status)}
            </p>
            <p>
              <strong>المدة:</strong>{' '}
              {selected.durationMinutes != null ? `${selected.durationMinutes} دقيقة` : 'غير منتهية'}
            </p>
            <p>
              <strong>بدأت:</strong> {formatTimestamp(selected.startedAt || selected.started_at)}
            </p>
            <div>
              <strong>GPS البداية:</strong> {formatLocation(selected.startLocation)}
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                التوقيت: {formatTimestamp(selected.startedAt || selected.started_at)}
              </div>
              {renderGpsLinks(selected.startLocation)}
            </div>
            <p>
              <strong>انتهت:</strong> {formatTimestamp(selected.endedAt || selected.ended_at)}
            </p>
            <div>
              <strong>GPS النهاية:</strong> {formatLocation(selected.endLocation)}
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                التوقيت: {formatTimestamp(selected.endedAt || selected.ended_at)}
              </div>
              {renderGpsLinks(selected.endLocation)}
            </div>
            <p>
              <strong>الملاحظات:</strong> {selected.notes || '-'}
            </p>
            <p>
              <strong>الإجراء التالي:</strong> {selected.next_action || '-'} {selected.next_action_date || ''}
            </p>
            {actionError && (
              <div className="alert alert-danger" style={{ gridColumn: '1 / -1' }}>
                {actionError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={() => openEdit(selected)}>
                تعديل
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => deleteMutation.mutate(selected.id)}
                disabled={deleteMutation.isPending}
              >
                حذف
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleStartWithGps}
                disabled={
                  startMutation.isPending ||
                  !!selected.startedAt ||
                  selected.status === 'completed' ||
                  selected.status === 'cancelled'
                }
              >
                {startMutation.isPending ? 'جارٍ البدء...' : 'بدء باستخدام GPS'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleEndWithGps}
                disabled={endMutation.isPending || selected.status === 'completed' || selected.status === 'cancelled'}
              >
                {endMutation.isPending ? 'جارٍ الإنهاء...' : 'إنهاء الزيارة'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>
                إغلاق
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>

      <DetailDrawer title={formMode === 'edit' ? 'تعديل زيارة' : 'إضافة زيارة'} isOpen={Boolean(formMode)} onClose={closeForm}>
        {formMode && (
          <VisitForm
            initialValues={formInitial}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            submitting={createMutation.isPending || updateMutation.isPending}
            error={formError}
            reps={reps}
            doctors={doctors}
          />
        )}
      </DetailDrawer>
    </div>
  );
};

export default VisitsPage;


