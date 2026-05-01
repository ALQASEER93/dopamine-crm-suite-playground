import { apiClient } from './client';
import { normalizePaginatedResponse } from './pagination';

export const routeKeys = {
  all: ['routes'],
  list: filters => ['routes', filters],
  today: ['routes', 'today'],
};

export const listRoutes = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.rep_id) params.set('rep_id', String(filters.rep_id));
  const qs = params.toString();
  const { data } = await apiClient.get(qs ? `/routes?${qs}` : '/routes');
  return normalizePaginatedResponse(data);
};

export const createRoute = async payload => {
  const { data } = await apiClient.post('/routes', { body: payload });
  return data?.data || data;
};

export const listTodayRoute = async () => {
  const { data } = await apiClient.get('/routes/today');
  return Array.isArray(data) ? data : data?.data || [];
};
