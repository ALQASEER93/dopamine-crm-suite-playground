import { apiClient } from './client';

export const visitKeys = {
  all: ['visits'],
  list: filters => ['visits', filters],
  detail: id => ['visits', 'detail', id],
};

const buildQuery = filters => {
  const params = new URLSearchParams();
  if (!filters) return params;
  if (filters.rep_id) params.set('rep_id', String(filters.rep_id));
  if (filters.doctor_id) params.set('doctor_id', String(filters.doctor_id));
  if (filters.pharmacy_id) params.set('pharmacy_id', String(filters.pharmacy_id));
  if (filters.from_date) params.set('date_from', filters.from_date);
  if (filters.to_date) params.set('date_to', filters.to_date);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  return params;
};

export const listVisits = async (filters = {}) => {
  const qs = buildQuery(filters).toString();
  const path = qs ? `/visits?${qs}` : '/visits';
  const { data } = await apiClient.get(path);
  return data;
};

export const getVisit = async id => {
  const { data } = await apiClient.get(`/visits/${id}`);
  return data?.data || data;
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
  };
  const { data } = await apiClient.post('/visits', { body });
  return data?.data || data;
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
  };
  const { data } = await apiClient.put(`/visits/${id}`, { body });
  return data?.data || data;
};

export const deleteVisit = async id => {
  await apiClient.delete(`/visits/${id}`);
  return true;
};
