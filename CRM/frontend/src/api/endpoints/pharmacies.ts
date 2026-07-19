import { apiClient } from '../client';
import type { ApiListResponse, ApiItemResponse, Pharmacy } from '../../types/crm';

export const pharmacyKeys = {
  all: ['pharmacies'] as const,
  list: (params?: PharmacyListParams) => ['pharmacies', params] as const,
  detail: (id: string | number) => ['pharmacies', 'detail', String(id)] as const,
};

export interface PharmacyListParams {
  page?: number;
  page_size?: number;
  search?: string;
  city?: string;
  area?: string;
  segment?: string;
}

export const listPharmacies = async (params: PharmacyListParams) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.search) query.set('search', params.search.trim());
  if (params.city) query.set('city', params.city);
  if (params.area) query.set('area', params.area);
  if (params.segment) query.set('segment', params.segment);

  const qs = query.toString();
  const path = qs ? `/pharmacies/?${qs}` : '/pharmacies/';
  const { data } = await apiClient.get<ApiListResponse<Pharmacy>>(path);
  return data;
};

export const getPharmacy = async (id: string | number) => {
  const { data } = await apiClient.get<ApiItemResponse<Pharmacy>>(`/pharmacies/${id}`);
  return (data as ApiItemResponse<Pharmacy> | Pharmacy).data ?? (data as Pharmacy);
};

export interface PharmacyPayload {
  name: string;
  city?: string | null;
  area?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  tag?: string | null;
  clientTag?: string | null;
  segment?: string | null;
}

export const createPharmacy = async (payload: PharmacyPayload) => {
  const { data } = await apiClient.post<ApiItemResponse<Pharmacy>>('/pharmacies', { body: payload });
  return (data as ApiItemResponse<Pharmacy> | Pharmacy).data ?? (data as Pharmacy);
};

export const updatePharmacy = async (id: string | number, payload: PharmacyPayload) => {
  const { data } = await apiClient.put<ApiItemResponse<Pharmacy>>(`/pharmacies/${id}`, { body: payload });
  return (data as ApiItemResponse<Pharmacy> | Pharmacy).data ?? (data as Pharmacy);
};
