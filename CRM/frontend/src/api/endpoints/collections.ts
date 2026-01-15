import { apiClient } from '../client';
import type { ApiListResponse, Collection } from '../../types/crm';

export const collectionKeys = {
  list: (params?: CollectionListParams) => ['collections', params] as const,
};

export interface CollectionListParams {
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
}

export const listCollections = async (params: CollectionListParams) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.date_from) query.set('date_from', params.date_from);
  if (params.date_to) query.set('date_to', params.date_to);
  const qs = query.toString();
  const path = qs ? `/collections?${qs}` : '/collections';
  const { data } = await apiClient.get<ApiListResponse<Collection>>(path);
  return data;
};

export const createCollection = async (payload: Omit<Collection, 'id'>) => {
  const { data } = await apiClient.post<Collection>('/collections', { body: payload });
  return data;
};

export const exportCollections = async (params: CollectionListParams) => {
  const query = new URLSearchParams();
  if (params.date_from) query.set('date_from', params.date_from);
  if (params.date_to) query.set('date_to', params.date_to);
  const qs = query.toString();
  const path = qs ? `/collections/export?${qs}` : '/collections/export';
  const { data, response } = await apiClient.get<Blob>(path, { responseType: 'blob' });
  return { blob: data, response };
};
