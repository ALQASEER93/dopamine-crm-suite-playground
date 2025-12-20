import { apiClient } from './client';

export const visitKeys = {
  all: ['visits'],
  list: filters => ['visits', filters],
  detail: id => ['visits', 'detail', id],
};

export const normalizeVisit = visit => {
  if (!visit) return null;
  const durationSeconds =
    visit.duration_seconds ?? visit.durationSeconds ?? visit.visit_duration_seconds ?? null;
  const durationMinutes =
    visit.duration_minutes ??
    visit.durationMinutes ??
    (durationSeconds != null ? Number((durationSeconds / 60).toFixed(2)) : null);

  const startLocation = {
    lat: visit.start_lat ?? visit.startLocation?.lat ?? null,
    lng: visit.start_lng ?? visit.startLocation?.lng ?? null,
    accuracy: visit.start_accuracy ?? visit.startLocation?.accuracy ?? null,
  };
  const endLocation = {
    lat: visit.end_lat ?? visit.endLocation?.lat ?? null,
    lng: visit.end_lng ?? visit.endLocation?.lng ?? null,
    accuracy: visit.end_accuracy ?? visit.endLocation?.accuracy ?? null,
  };

  return {
    id: visit.id ?? visit.visitId,
    visitDate: visit.visit_date || visit.visitDate || visit.date || null,
    startedAt: visit.started_at || visit.startedAt || null,
    endedAt: visit.ended_at || visit.endedAt || null,
    status: visit.status || visit.visit_status || 'scheduled',
    rep_id: visit.rep_id ?? visit.repId ?? visit.rep?.id ?? null,
    rep: visit.rep || null,
    doctor_id: visit.doctor_id ?? visit.doctorId ?? visit.doctor?.id ?? null,
    doctor: visit.doctor || visit.hcp || null,
    pharmacy_id: visit.pharmacy_id ?? visit.pharmacyId ?? visit.pharmacy?.id ?? null,
    pharmacy: visit.pharmacy || null,
    notes: visit.notes ?? null,
    samples_given: visit.samples_given ?? visit.samplesGiven ?? null,
    next_action: visit.next_action ?? visit.nextAction ?? null,
    next_action_date: visit.next_action_date ?? visit.nextActionDate ?? null,
    startLocation,
    endLocation,
    durationSeconds,
    durationMinutes,
    raw: visit,
  };
};

const buildQuery = filters => {
  const params = new URLSearchParams();
  if (!filters) return params;
  if (Array.isArray(filters.rep_ids) && filters.rep_ids.length > 0) {
    filters.rep_ids.forEach(repId => params.append('rep_id', String(repId)));
  } else if (filters.rep_id) {
    params.set('rep_id', String(filters.rep_id));
  }
  if (filters.doctor_id) params.set('doctor_id', String(filters.doctor_id));
  if (filters.pharmacy_id) params.set('pharmacy_id', String(filters.pharmacy_id));
  if (filters.from_date) params.set('date_from', filters.from_date);
  if (filters.to_date) params.set('date_to', filters.to_date);
  if (Array.isArray(filters.statuses) && filters.statuses.length > 0) {
    filters.statuses.forEach(status => params.append('status', status));
  }
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  return params;
};

export const listVisits = async (filters = {}) => {
  const qs = buildQuery(filters).toString();
  const path = qs ? `/visits?${qs}` : '/visits';
  const { data } = await apiClient.get(path);
  const normalized = Array.isArray(data?.data) ? data.data.map(normalizeVisit).filter(Boolean) : [];
  return {
    data: normalized,
    pagination: data?.pagination || null,
  };
};

export const getVisit = async id => {
  const { data } = await apiClient.get(`/visits/${id}`);
  const payload = data?.data || data;
  return normalizeVisit(payload);
};

export const createVisit = async payload => {
  const body = {
    visit_date: payload.visit_date,
    rep_id: payload.rep_id,
    doctor_id: payload.doctor_id || null,
    pharmacy_id: payload.pharmacy_id || null,
    notes: payload.notes || null,
    samples_given: payload.samples_given || null,
    next_action: payload.next_action || null,
    next_action_date: payload.next_action_date || null,
    status: payload.status || undefined,
  };
  const { data } = await apiClient.post('/visits', { body });
  const payloadData = data?.data || data;
  return normalizeVisit(payloadData);
};

export const updateVisit = async (id, payload) => {
  const body = {
    visit_date: payload.visit_date,
    rep_id: payload.rep_id,
    doctor_id: payload.doctor_id,
    pharmacy_id: payload.pharmacy_id,
    notes: payload.notes,
    samples_given: payload.samples_given,
    next_action: payload.next_action,
    next_action_date: payload.next_action_date,
    status: payload.status,
    started_at: payload.started_at,
    ended_at: payload.ended_at,
    start_lat: payload.start_lat,
    start_lng: payload.start_lng,
    start_accuracy: payload.start_accuracy,
    end_lat: payload.end_lat,
    end_lng: payload.end_lng,
    end_accuracy: payload.end_accuracy,
    duration_seconds: payload.duration_seconds,
  };
  const { data } = await apiClient.put(`/visits/${id}`, { body });
  const payloadData = data?.data || data;
  return normalizeVisit(payloadData);
};

export const deleteVisit = async id => {
  await apiClient.delete(`/visits/${id}`);
  return true;
};

export const startVisit = async (id, payload = {}) => {
  const body = {
    lat: payload.lat,
    lng: payload.lng,
    accuracy: payload.accuracy,
    started_at: payload.started_at,
  };
  const { data } = await apiClient.post(`/visits/${id}/start`, { body });
  return normalizeVisit(data?.data || data);
};

export const endVisit = async (id, payload = {}) => {
  const body = {
    lat: payload.lat,
    lng: payload.lng,
    accuracy: payload.accuracy,
    ended_at: payload.ended_at,
  };
  const { data } = await apiClient.post(`/visits/${id}/end`, { body });
  return normalizeVisit(data?.data || data);
};
