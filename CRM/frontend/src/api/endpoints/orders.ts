import { apiClient } from '../client';
import type { ApiListResponse, ApiItemResponse, Order, OrderLine } from '../../types/crm';

export const orderKeys = {
  all: ['orders'] as const,
  list: (params?: OrderListParams) => ['orders', params] as const,
  detail: (id: string | number) => ['orders', 'detail', String(id)] as const,
};

export interface OrderListParams {
  page?: number;
  page_size?: number;
  status?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
}

export const listOrders = async (params: OrderListParams) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.status) query.set('status_filter', params.status);
  if (params.payment_status) query.set('payment_status', params.payment_status);
  if (params.date_from) query.set('date_from', params.date_from);
  if (params.date_to) query.set('date_to', params.date_to);
  const qs = query.toString();
  const path = qs ? `/orders?${qs}` : '/orders';
  const { data } = await apiClient.get<ApiListResponse<Order>>(path);
  return data;
};

export const getOrderLines = async (id: string | number) => {
  const { data } = await apiClient.get<OrderLine[]>(`/orders/${id}/lines`);
  return data;
};

export interface OrderPayload {
  order_date: string;
  status: string;
  payment_status: string;
  doctor_id?: number | string | null;
  pharmacy_id?: number | string | null;
  aljazeera_ref?: string | null;
  lines: OrderLine[];
}

export interface OrderUpdatePayload {
  order_date?: string;
  status?: string;
  payment_status?: string;
  doctor_id?: number | string | null;
  pharmacy_id?: number | string | null;
  aljazeera_ref?: string | null;
  lines?: OrderLine[];
}

export const createOrder = async (payload: OrderPayload) => {
  const { data } = await apiClient.post<ApiItemResponse<Order>>('/orders', { body: payload });
  return (data as ApiItemResponse<Order> | Order).data ?? (data as Order);
};

export const updateOrder = async (id: string | number, payload: OrderUpdatePayload) => {
  const { data } = await apiClient.put<ApiItemResponse<Order>>(`/orders/${id}`, { body: payload });
  return (data as ApiItemResponse<Order> | Order).data ?? (data as Order);
};

export const deleteOrder = async (id: string | number) => {
  await apiClient.delete(`/orders/${id}`);
};

export const exportOrders = async (params: OrderListParams) => {
  const query = new URLSearchParams();
  if (params.status) query.set('status_filter', params.status);
  if (params.payment_status) query.set('payment_status', params.payment_status);
  if (params.date_from) query.set('date_from', params.date_from);
  if (params.date_to) query.set('date_to', params.date_to);
  const qs = query.toString();
  const path = qs ? `/orders/export?${qs}` : '/orders/export';
  const { data, response } = await apiClient.get<Blob>(path, { responseType: 'blob' });
  return { blob: data, response };
};
