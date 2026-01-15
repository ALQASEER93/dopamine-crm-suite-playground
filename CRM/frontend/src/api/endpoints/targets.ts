import { apiClient } from '../client';
import type { ApiListResponse, Target, VisitTarget } from '../../types/crm';

export const targetKeys = {
  targets: (params?: TargetListParams) => ['targets', params] as const,
  visitTargets: (params?: TargetListParams) => ['visitTargets', params] as const,
};

export interface TargetListParams {
  page?: number;
  page_size?: number;
  rep_id?: string | number;
  period?: string;
}

export const listTargets = async (params: TargetListParams) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.rep_id) query.set('rep_id', String(params.rep_id));
  if (params.period) query.set('period', params.period);
  const qs = query.toString();
  const path = qs ? `/targets?${qs}` : '/targets';
  const { data } = await apiClient.get<ApiListResponse<Target>>(path);
  return data;
};

export const createTarget = async (payload: Omit<Target, 'id'>) => {
  const { data } = await apiClient.post<Target>('/targets', { body: payload });
  return data;
};

export const listVisitTargets = async (params: TargetListParams) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.rep_id) query.set('rep_id', String(params.rep_id));
  if (params.period) query.set('period', params.period);
  const qs = query.toString();
  const path = qs ? `/visit-targets?${qs}` : '/visit-targets';
  const { data } = await apiClient.get<ApiListResponse<VisitTarget>>(path);
  return data;
};

export const upsertVisitTarget = async (payload: Omit<VisitTarget, 'id'>) => {
  const { data } = await apiClient.post<VisitTarget>('/visit-targets', { body: payload });
  return data;
};

export const exportTargets = async (params: TargetListParams) => {
  const query = new URLSearchParams();
  if (params.rep_id) query.set('rep_id', String(params.rep_id));
  if (params.period) query.set('period', params.period);
  const qs = query.toString();
  const path = qs ? `/targets/export?${qs}` : '/targets/export';
  const { data, response } = await apiClient.get<Blob>(path, { responseType: 'blob' });
  return { blob: data, response };
};

export const exportVisitTargets = async (params: TargetListParams) => {
  const query = new URLSearchParams();
  if (params.rep_id) query.set('rep_id', String(params.rep_id));
  if (params.period) query.set('period', params.period);
  const qs = query.toString();
  const path = qs ? `/visit-targets/export?${qs}` : '/visit-targets/export';
  const { data, response } = await apiClient.get<Blob>(path, { responseType: 'blob' });
  return { blob: data, response };
};
