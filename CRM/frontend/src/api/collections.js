import { apiClient } from './client';
import { normalizePaginatedResponse } from './pagination';

export const collectionKeys = {
  all: ['collections'],
  list: filters => ['collections', filters],
};

export const listCollections = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  const qs = params.toString();
  const { data } = await apiClient.get(qs ? `/collections/?${qs}` : '/collections/');
  return normalizePaginatedResponse(data);
};

export const createCollection = async payload => {
  const { data } = await apiClient.post('/collections/', { body: payload });
  return data?.data || data;
};
