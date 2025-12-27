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
        Visit date
        <input
          type="date"
          value={form.visit_date}
          onChange={e => updateField('visit_date', e.target.value)}
          required
        />
      </label>
      <label className="form__label">
        Rep
        <select value={form.rep_id} onChange={e => updateField('rep_id', e.target.value)} required>
          <option value="">Select rep</option>
          {reps.map(rep => (
            <option key={rep.id} value={rep.id}>
              {rep.name} ({rep.email})
            </option>
          ))}
        </select>
      </label>
      <label className="form__label">
        Doctor
        <select value={form.doctor_id} onChange={e => updateField('doctor_id', e.target.value)}>
          <option value="">Select doctor</option>
          {doctors.map(doc => (
            <option key={doc.id} value={doc.id}>
              {doc.name} {doc.city ? `- ${doc.city}` : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="form__label">
        Notes
        <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3} />
      </label>
      <label className="form__label">
        Next action
        <input type="text" value={form.next_action} onChange={e => updateField('next_action', e.target.value)} />
      </label>
      <label className="form__label">
        Next action date
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
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
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
    onError: error => setFormError(error.message || 'Unable to create visit'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateVisit(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
      closeForm();
    },
    onError: error => setFormError(error.message || 'Unable to update visit'),
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
      throw new Error('GPS not available in this browser.');
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
        error => reject(new Error(error.message || 'Unable to capture location')),
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
    onError: error => setActionError(error.message || 'Unable to start visit'),
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
    onError: error => setActionError(error.message || 'Unable to end visit'),
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
      setActionError(error.message || 'Unable to start visit');
    }
  };

  const handleEndWithGps = async () => {
    if (!selected) return;
    setActionError(null);
    try {
      await endMutation.mutateAsync(selected.id);
    } catch (error) {
      setActionError(error.message || 'Unable to end visit');
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
    if (visit.doctor) return `Doctor: ${visit.doctor.name}`;
    if (visit.pharmacy) return `Pharmacy: ${visit.pharmacy.name}`;
    return 'N/A';
  };

  const formatTimestamp = value => (value ? new Date(value).toLocaleString() : 'Not captured');

  const formatLocation = location => {
    if (!location || location.lat == null || location.lng == null) return 'Not captured';
    const accuracyText =
      location.accuracy != null && Number.isFinite(Number(location.accuracy))
        ? ` (+/-${Number(location.accuracy).toFixed(1)}m)`
        : '';
    return `${formatCoords(location.lat, location.lng)}${accuracyText}`;
  };

  const renderGpsLinks = location => {
    if (!location || location.lat == null || location.lng == null) return null;
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
        <a className="btn btn-secondary" href={buildOpenStreetMapUrl(lat, lng)} target="_blank" rel="noreferrer">
          Open in OpenStreetMap
        </a>
        <a className="btn btn-secondary" href={buildGoogleMapsUrl(lat, lng)} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
        <span style={{ fontSize: '11px', color: '#6b7280', alignSelf: 'center' }}>
          (c) OpenStreetMap contributors
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
          <h1 className="page-heading">Visits</h1>
          <p className="page-subtitle">Track field visits and follow-ups.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Add visit
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
          <option value="">All reps</option>
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
          <option value="">All doctors</option>
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
          Clear filters
        </button>
      </div>

      <section className="table-card entity-table">
        {visitsQuery.error && <div className="entity-empty">Unable to load visits: {visitsQuery.error.message}</div>}
        {!visitsQuery.error && visitsQuery.isLoading && <div className="entity-empty">Loading visits...</div>}
        {!visitsQuery.error && !visitsQuery.isLoading && visits.length === 0 && (
          <div className="entity-empty">No visits found for the selected filters.</div>
        )}
        {!visitsQuery.error && visits.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Rep</th>
                <th>Account</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Notes</th>
                <th>Next action</th>
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
                  <td>{visit.status ? visit.status.replace(/_/g, ' ') : '-'}</td>
                  <td>{visit.durationMinutes != null ? `${visit.durationMinutes} min` : '-'}</td>
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
            Page {page} of {totalPages}
          </span>
          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
          <div>
            Rows
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
            <span style={{ marginLeft: '8px' }}>Total: {totalVisits}</span>
          </div>
        </div>
      </section>

      <DetailDrawer
        title={selected ? `Visit on ${selected.visitDate || selected.visit_date}` : ''}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="detail-grid">
            <p>
              <strong>Rep:</strong> {selected.rep?.name || selected.rep_id}
            </p>
            <p>
              <strong>Doctor:</strong> {selected.doctor?.name || '-'}
            </p>
            <p>
              <strong>Pharmacy:</strong> {selected.pharmacy?.name || '-'}
            </p>
            <p>
              <strong>Status:</strong> {selected.status ? selected.status.replace(/_/g, ' ') : '-'}
            </p>
            <p>
              <strong>Duration:</strong>{' '}
              {selected.durationMinutes != null ? `${selected.durationMinutes} min` : 'Not finished'}
            </p>
            <p>
              <strong>Started:</strong> {formatTimestamp(selected.startedAt || selected.started_at)}
            </p>
            <div>
              <strong>Start GPS:</strong> {formatLocation(selected.startLocation)}
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Timestamp: {formatTimestamp(selected.startedAt || selected.started_at)}
              </div>
              {renderGpsLinks(selected.startLocation)}
            </div>
            <p>
              <strong>Ended:</strong> {formatTimestamp(selected.endedAt || selected.ended_at)}
            </p>
            <div>
              <strong>End GPS:</strong> {formatLocation(selected.endLocation)}
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Timestamp: {formatTimestamp(selected.endedAt || selected.ended_at)}
              </div>
              {renderGpsLinks(selected.endLocation)}
            </div>
            <p>
              <strong>Notes:</strong> {selected.notes || '-'}
            </p>
            <p>
              <strong>Next action:</strong> {selected.next_action || '-'} {selected.next_action_date || ''}
            </p>
            {actionError && (
              <div className="alert alert-danger" style={{ gridColumn: '1 / -1' }}>
                {actionError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={() => openEdit(selected)}>
                Edit
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => deleteMutation.mutate(selected.id)}
                disabled={deleteMutation.isPending}
              >
                Delete
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
                {startMutation.isPending ? 'Starting...' : 'Start with GPS'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleEndWithGps}
                disabled={endMutation.isPending || selected.status === 'completed' || selected.status === 'cancelled'}
              >
                {endMutation.isPending ? 'Ending...' : 'End visit'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>

      <DetailDrawer title={formMode === 'edit' ? 'Edit visit' : 'Add visit'} isOpen={Boolean(formMode)} onClose={closeForm}>
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


