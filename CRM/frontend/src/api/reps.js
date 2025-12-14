import { apiClient } from './client';

export const repKeys = {
  all: ['reps'],
  list: (filters = {}) => ['reps', filters],
  detail: id => ['reps', 'detail', id],
};

export const listReps = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.name) params.set('name', filters.name);
  if (filters.email) params.set('email', filters.email);
  if (filters.route_id) params.set('route_id', String(filters.route_id));
  if (filters.include_inactive) params.set('include_inactive', 'true');
  const qs = params.toString();
  const path = qs ? `/reps?${qs}` : '/reps';
  const { data } = await apiClient.get(path);
  return Array.isArray(data) ? data : data?.data || [];
};

export const getRep = async id => {
  const { data } = await apiClient.get(`/reps/${id}`);
  return data?.data || data;
};

export const createRep = async payload => {
  const body = {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    is_active: payload.is_active ?? true,
    role_slug: payload.role_slug ?? 'medical_rep',
    role_id: payload.role_id,
  };
  const { data } = await apiClient.post('/reps', { body });
  return data?.data || data;
};

export const updateRep = async (id, payload) => {
  const body = {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    is_active: payload.is_active,
    role_slug: payload.role_slug,
    role_id: payload.role_id,
  };
  const { data } = await apiClient.put(`/reps/${id}`, { body });
  return data?.data || data;
};

export const deactivateRep = async id => {
  await apiClient.delete(`/reps/${id}`);
  return true;
};
