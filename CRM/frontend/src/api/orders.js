import { apiClient } from './client';
import { normalizePaginatedResponse } from './pagination';

export const orderKeys = {
  all: ['orders'],
  list: filters => ['orders', filters],
  detail: id => ['orders', 'detail', id],
};

export const listOrders = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.status_filter) params.set('status_filter', filters.status_filter);
  if (filters.payment_status) params.set('payment_status', filters.payment_status);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  const qs = params.toString();
  const { data } = await apiClient.get(qs ? `/orders/?${qs}` : '/orders/');
  return normalizePaginatedResponse(data);
};

export const createOrder = async payload => {
  const { data } = await apiClient.post('/orders/', { body: payload });
  return data?.data || data;
};

export const getOrder = async id => {
  const { data } = await apiClient.get(`/orders/${id}`);
  return data?.data || data;
};
