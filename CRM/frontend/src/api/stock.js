import { apiClient } from './client';
import { normalizePaginatedResponse } from './pagination';

export const stockKeys = {
  all: ['stock'],
  locations: ['stock', 'locations'],
  movements: filters => ['stock', 'movements', filters],
};

export const listStockLocations = async () => {
  const { data } = await apiClient.get('/stock/locations');
  return Array.isArray(data) ? data : data?.data || [];
};

export const createStockLocation = async payload => {
  const { data } = await apiClient.post('/stock/locations', { body: payload });
  return data?.data || data;
};

export const listStockMovements = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.product_id) params.set('product_id', String(filters.product_id));
  if (filters.location_id) params.set('location_id', String(filters.location_id));
  const qs = params.toString();
  const { data } = await apiClient.get(qs ? `/stock/movements?${qs}` : '/stock/movements');
  return normalizePaginatedResponse(data);
};

export const createStockMovement = async payload => {
  const { data } = await apiClient.post('/stock/movements', { body: payload });
  return data?.data || data;
};
