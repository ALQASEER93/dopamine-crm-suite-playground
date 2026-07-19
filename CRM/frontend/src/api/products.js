import { apiClient } from './client';
import { normalizePaginatedResponse } from './pagination';

export const productKeys = {
  all: ['products'],
  list: filters => ['products', filters],
};

export const listProducts = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.line) params.set('line', filters.line);
  if (filters.search) params.set('search', filters.search.trim());
  const qs = params.toString();
  const { data } = await apiClient.get(qs ? `/products?${qs}` : '/products');
  return normalizePaginatedResponse(data);
};
