import { apiClient } from '../client';
import type { ApiListResponse, StockLocation, StockMovement } from '../../types/crm';

export const stockKeys = {
  locations: ['stock', 'locations'] as const,
  movements: (params?: MovementListParams) => ['stock', 'movements', params] as const,
};

export interface MovementListParams {
  page?: number;
  page_size?: number;
  product_id?: string | number;
  location_id?: string | number;
}

export const listLocations = async () => {
  const { data } = await apiClient.get<StockLocation[]>('/stock/locations');
  return data;
};

export const createLocation = async (payload: Omit<StockLocation, 'id'>) => {
  const { data } = await apiClient.post<StockLocation>('/stock/locations', { body: payload });
  return data;
};

export const listMovements = async (params: MovementListParams) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.product_id) query.set('product_id', String(params.product_id));
  if (params.location_id) query.set('location_id', String(params.location_id));
  const qs = query.toString();
  const path = qs ? `/stock/movements?${qs}` : '/stock/movements';
  const { data } = await apiClient.get<ApiListResponse<StockMovement>>(path);
  return data;
};

export const createMovement = async (payload: Omit<StockMovement, 'id' | 'movement_date'>) => {
  const { data } = await apiClient.post<StockMovement>('/stock/movements', { body: payload });
  return data;
};

export const exportLocations = async () => {
  const { data, response } = await apiClient.get<Blob>('/stock/locations/export', { responseType: 'blob' });
  return { blob: data, response };
};

export const exportMovements = async (params: MovementListParams) => {
  const query = new URLSearchParams();
  if (params.product_id) query.set('product_id', String(params.product_id));
  if (params.location_id) query.set('location_id', String(params.location_id));
  const qs = query.toString();
  const path = qs ? `/stock/movements/export?${qs}` : '/stock/movements/export';
  const { data, response } = await apiClient.get<Blob>(path, { responseType: 'blob' });
  return { blob: data, response };
};
