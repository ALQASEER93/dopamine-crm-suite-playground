import { apiClient } from '../client';
import type { ApiListResponse, ApiItemResponse, Route } from '../../types/crm';

export const routeKeys = {
  all: ['routes'] as const,
  list: (params?: RouteListParams) => ['routes', params] as const,
  detail: (id: string | number) => ['routes', 'detail', String(id)] as const,
};

export interface RouteListParams {
  page?: number;
  page_size?: number;
  rep_id?: string | number;
}

export const listRoutes = async (params: RouteListParams) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.rep_id) query.set('rep_id', String(params.rep_id));
  const qs = query.toString();
  const path = qs ? `/routes?${qs}` : '/routes';
  const { data } = await apiClient.get<ApiListResponse<Route>>(path);
  return data;
};

export const createRoute = async (payload: Omit<Route, 'id'>) => {
  const { data } = await apiClient.post<ApiItemResponse<Route>>('/routes', { body: payload });
  return (data as ApiItemResponse<Route> | Route).data ?? (data as Route);
};

export const updateRoute = async (id: string | number, payload: Partial<Route>) => {
  const { data } = await apiClient.put<ApiItemResponse<Route>>(`/routes/${id}`, { body: payload });
  return (data as ApiItemResponse<Route> | Route).data ?? (data as Route);
};

export const deleteRoute = async (id: string | number) => {
  await apiClient.delete(`/routes/${id}`);
};

export const exportRoutes = async (params: RouteListParams) => {
  const query = new URLSearchParams();
  if (params.rep_id) query.set('rep_id', String(params.rep_id));
  const qs = query.toString();
  const path = qs ? `/routes/export?${qs}` : '/routes/export';
  const { data, response } = await apiClient.get<Blob>(path, { responseType: 'blob' });
  return { blob: data, response };
};
