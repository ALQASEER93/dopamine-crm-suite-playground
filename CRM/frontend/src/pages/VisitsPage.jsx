import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { normalizeRole } from '../auth/roleAccess';
import { apiClient } from '../api/client';
import { listReps, repKeys } from '../api/reps';
import { doctorKeys, listDoctors } from '../api/endpoints/doctors';
import {
  createVisit,
  deleteVisit,
  downloadVisitAttachment,
  endVisit,
  listVisitAttachments,
  listVisits,
  startVisit,
  updateVisit,
  uploadVisitAttachment,
  visitKeys,
} from '../api/visits';
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

const formatBytes = value => {
  if (!value && value !== 0) return 'غير متوفر';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = Number(value);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const haversineDistanceMeters = (start, end) => {
  if (!start || !end) return null;
  if (start.lat == null || start.lng == null || end.lat == null || end.lng == null) return null;
  const toRad = value => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(end.lat - start.lat);
  const dLng = toRad(end.lng - start.lng);
  const lat1 = toRad(start.lat);
  const lat2 = toRad(end.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const formatDistance = value => {
  if (value == null || Number.isNaN(value)) return 'غير متوفر';
  if (value >= 1000) return `${(value / 1000).toFixed(2)} كم`;
  return `${value.toFixed(1)} م`;
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
        ملاحظات
        <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3} />
      </label>
      <label className="form__label">
        الإجراء التالي
        <input type="text" value={form.next_action} onChange={e => updateField('next_action', e.target.value)} />
      </label>
      <label className="form__label">
        تاريخ المتابعة
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
          {submitting ? 'جارٍ الحفظ...' : 'حفظ'}
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
  const roleSlug = normalizeRole(user?.role?.slug || user?.roleSlug || user?.role);
  const isManager = ['admin', 'sales_manager'].includes(roleSlug);
  const uploadInputRef = useRef(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [formInitial, setFormInitial] = useState(DEFAULT_VISIT_FORM);
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [attachmentError, setAttachmentError] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');

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

  const gpsPolicyQuery = useQuery({
    queryKey: ['gps-policy'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/gps-policy');
      return data?.data || data;
    },
    enabled: !!token && isManager,
    staleTime: 5 * 60_000,
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

  const attachmentsQuery = useQuery({
    queryKey: ['visits', 'attachments', selected?.id],
    queryFn: () => listVisitAttachments(selected.id),
    enabled: !!token && !!selected?.id,
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

  const overrideMutation = useMutation({
    mutationFn: ({ id, reason }) => updateVisit(id, { override_reason: reason }),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      setSelected(data);
      setOverrideReason('');
      setActionError(null);
    },
    onError: error => setActionError(error.message || 'تعذر اعتماد الاستثناء'),
  });

  const uploadMutation = useMutation({
    mutationFn: file => uploadVisitAttachment(selected.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', 'attachments', selected?.id] });
      setAttachmentError(null);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    },
    onError: error => setAttachmentError(error.message || 'تعذر رفع المرفق'),
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
      throw new Error('ميزة GPS غير متاحة في هذا المتصفح.');
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
        error => reject(new Error(error.message || 'تعذر تحديد الموقع')),
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

  const handleApproveOverride = async () => {
    if (!selected || !overrideReason.trim()) return;
    setActionError(null);
    try {
      await overrideMutation.mutateAsync({ id: selected.id, reason: overrideReason.trim() });
    } catch (error) {
      setActionError(error.message || 'تعذر اعتماد الاستثناء');
    }
  };

  const handleAttachmentUpload = async event => {
    const file = event.target.files?.[0];
    if (!file || !selected) return;
    setAttachmentError(null);
    try {
      await uploadMutation.mutateAsync(file);
    } catch (error) {
      setAttachmentError(error.message || 'تعذر رفع المرفق');
    }
  };

  const handleDownloadAttachment = async attachment => {
    if (!selected) return;
    setAttachmentError(null);
    try {
      const { blob, response } = await downloadVisitAttachment(selected.id, attachment.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const header = response.headers.get('Content-Disposition') || '';
      const headerName = header.split('filename=')[1]?.replace(/\"/g, '');
      link.href = url;
      link.download = headerName || attachment.filename || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setAttachmentError(error.message || 'تعذر تنزيل المرفق');
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
  const attachments = attachmentsQuery.data || [];

  const renderAccount = visit => {
    if (visit.doctor) return `طبيب: ${visit.doctor.name}`;
    if (visit.pharmacy) return `صيدلية: ${visit.pharmacy.name}`;
    return 'غير متاح';
  };

  const formatTimestamp = value => (value ? new Date(value).toLocaleString() : 'غير مسجل');

  const formatLocation = location => {
    if (!location || location.lat == null || location.lng == null) return 'غير مسجل';
    const accuracyText =
      location.accuracy != null && Number.isFinite(Number(location.accuracy))
        ? ` (±${Number(location.accuracy).toFixed(1)}م)`
        : '';
    return `${formatCoords(location.lat, location.lng)}${accuracyText}`;
  };

  const gpsPolicy = gpsPolicyQuery.data || {};
  const compliance = useMemo(() => {
    if (!selected) return null;
    const accuracyLimit = gpsPolicy.gpsMinAccuracyM ?? 50;
    const distanceLimit = gpsPolicy.gpsMaxDistanceM ?? 150;
    const startAccuracy = selected.startLocation?.accuracy;
    const endAccuracy = selected.endLocation?.accuracy;
    const distanceMeters = haversineDistanceMeters(selected.startLocation, selected.endLocation);
    const issues = [];

    if (startAccuracy == null) {
      issues.push('لم يتم تسجيل دقة GPS للبداية');
    } else if (accuracyLimit && startAccuracy > accuracyLimit) {
      issues.push('دقة GPS عند البداية أقل من المطلوب');
    }

    if (endAccuracy == null) {
      issues.push('لم يتم تسجيل دقة GPS للنهاية');
    } else if (accuracyLimit && endAccuracy > accuracyLimit) {
      issues.push('دقة GPS عند النهاية أقل من المطلوب');
    }

    if (distanceMeters != null && distanceLimit && distanceMeters > distanceLimit) {
      issues.push('المسافة بين البداية والنهاية تجاوزت الحد');
    }

    return {
      accuracyLimit,
      distanceLimit,
      distanceMeters,
      issues,
    };
  }, [gpsPolicy.gpsMinAccuracyM, gpsPolicy.gpsMaxDistanceM, selected]);

  const STATUS_LABELS = {
    scheduled: 'مجدولة',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتملة',
    canceled: 'ملغاة',
    cancelled: 'ملغاة',
    no_show: 'لم تتم',
    started: 'جارية',
    pending: 'معلقة',
  };

  const formatStatus = status => {
    if (!status) return '-';
    const normalized = String(status).toLowerCase();
    return STATUS_LABELS[normalized] || normalized.replace(/_/g, ' ');
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
        <span style={{ fontSize: '11px', color: '#6b7280', alignSelf: 'center' }}>
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
          <p className="page-subtitle">متابعة زيارات الميدان وخطط المتابعة.</p>
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
        {!visitsQuery.error && visitsQuery.isLoading && <div className="entity-empty">جارٍ تحميل الزيارات...</div>}
        {!visitsQuery.error && !visitsQuery.isLoading && visits.length === 0 && (
          <div className="entity-empty">لا توجد نتائج مطابقة.</div>
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
                <th>ملاحظات</th>
                <th>الإجراء التالي</th>
              </tr>
            </thead>
            <tbody>
              {visits.map(visit => (
                <tr
                  key={visit.id}
                  onClick={() => {
                    setActionError(null);
                    setAttachmentError(null);
                    setOverrideReason('');
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
              {selected.durationMinutes != null ? `${selected.durationMinutes} دقيقة` : 'غير مكتملة'}
            </p>
            <p>
              <strong>البداية:</strong> {formatTimestamp(selected.startedAt || selected.started_at)}
            </p>
            <div>
              <strong>GPS البداية:</strong> {formatLocation(selected.startLocation)}
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                التوقيت: {formatTimestamp(selected.startedAt || selected.started_at)}
              </div>
              {renderGpsLinks(selected.startLocation)}
            </div>
            <p>
              <strong>النهاية:</strong> {formatTimestamp(selected.endedAt || selected.ended_at)}
            </p>
            <div>
              <strong>GPS النهاية:</strong> {formatLocation(selected.endLocation)}
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                التوقيت: {formatTimestamp(selected.endedAt || selected.ended_at)}
              </div>
              {renderGpsLinks(selected.endLocation)}
            </div>
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #1f2937',
                background: '#0f172a',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <strong>امتثال GPS</strong>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  الحدود: دقة ≤ {compliance?.accuracyLimit ?? 50}م | مسافة ≤ {compliance?.distanceLimit ?? 150}م
                </span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#cbd5f5' }}>
                دقة البداية: {selected.startLocation?.accuracy != null ? `${selected.startLocation.accuracy}م` : 'غير متوفر'}
              </div>
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#cbd5f5' }}>
                دقة النهاية: {selected.endLocation?.accuracy != null ? `${selected.endLocation.accuracy}م` : 'غير متوفر'}
              </div>
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#cbd5f5' }}>
                مسافة الحركة: {formatDistance(compliance?.distanceMeters)}
              </div>
              {compliance?.issues?.length > 0 ? (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#fca5a5' }}>ملاحظات التحقق:</div>
                  {compliance.issues.map(issue => (
                    <div key={issue} style={{ fontSize: '12px', color: '#fca5a5' }}>
                      - {issue}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#86efac' }}>متوافق مع سياسة GPS.</div>
              )}
              {selected.override_reason && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#fbbf24' }}>
                  سبب الاستثناء: {selected.override_reason}
                </div>
              )}
              {isManager && compliance?.issues?.length > 0 && !selected.override_reason && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ fontSize: '12px', color: '#cbd5f5' }}>اعتماد استثناء</label>
                  <textarea
                    value={overrideReason}
                    onChange={event => setOverrideReason(event.target.value)}
                    rows={2}
                    className="input"
                    placeholder="اكتب سبب الاعتماد..."
                    style={{ marginTop: '4px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleApproveOverride}
                    disabled={overrideMutation.isPending || !overrideReason.trim()}
                    style={{ marginTop: '8px' }}
                  >
                    {overrideMutation.isPending ? 'جارٍ الاعتماد...' : 'اعتماد الاستثناء'}
                  </button>
                </div>
              )}
            </div>
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #1f2937',
                background: '#111827',
              }}
            >
              <strong>المرفقات</strong>
              {attachmentsQuery.error && (
                <div className="alert alert-danger" style={{ marginTop: '8px' }}>
                  تعذر تحميل المرفقات: {attachmentsQuery.error.message}
                </div>
              )}
              {attachmentsQuery.isLoading && <div style={{ fontSize: '12px', color: '#94a3b8' }}>جارٍ التحميل...</div>}
              {!attachmentsQuery.isLoading && attachments.length === 0 && (
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>لا توجد مرفقات.</div>
              )}
              {attachments.length > 0 && (
                <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
                  {attachments.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0' }}>{item.filename}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {formatBytes(item.size_bytes)} · {item.content_type || 'ملف'}
                        </div>
                      </div>
                      <button type="button" className="btn btn-secondary" onClick={() => handleDownloadAttachment(item)}>
                        تنزيل
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: '10px' }}>
                <input type="file" ref={uploadInputRef} onChange={handleAttachmentUpload} className="input" />
              </div>
              {attachmentError && (
                <div className="alert alert-danger" style={{ marginTop: '8px' }}>
                  {attachmentError}
                </div>
              )}
            </div>
            <p>
              <strong>ملاحظات:</strong> {selected.notes || '-'}
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
                {startMutation.isPending ? '...جارٍ البدء' : 'بدء مع GPS'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleEndWithGps}
                disabled={endMutation.isPending || selected.status === 'completed' || selected.status === 'cancelled'}
              >
                {endMutation.isPending ? '...جارٍ الإنهاء' : 'إنهاء الزيارة'}
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
