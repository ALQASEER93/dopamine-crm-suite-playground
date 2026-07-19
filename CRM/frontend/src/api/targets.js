import { apiClient } from './client';
import { normalizePaginatedResponse } from './pagination';

export const targetKeys = {
  all: ['targets'],
  list: filters => ['targets', filters],
};

export const listTargets = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.rep_id) params.set('rep_id', String(filters.rep_id));
  if (filters.period) params.set('period', filters.period);
  const qs = params.toString();
  const { data } = await apiClient.get(qs ? `/targets/?${qs}` : '/targets/');
  return normalizePaginatedResponse(data);
};

export const createTarget = async payload => {
  const { data } = await apiClient.post('/targets/', { body: payload });
  return data?.data || data;
};
