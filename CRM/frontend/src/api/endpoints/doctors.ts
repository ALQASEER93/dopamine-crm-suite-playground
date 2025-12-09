import { apiClient } from '../client';
import type { ApiListResponse, ApiItemResponse, Doctor } from '../../types/crm';

export const doctorKeys = {
  all: ['doctors'] as const,
  list: (params?: DoctorListParams) => ['doctors', params] as const,
  detail: (id: string | number) => ['doctors', 'detail', String(id)] as const,
};

export interface DoctorListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  city?: string;
  specialty?: string;
  territoryId?: string | number;
}

export const listDoctors = async (params: DoctorListParams) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search) query.set('search', params.search.trim());
  if (params.city) query.set('city', params.city);
  if (params.specialty) query.set('specialty', params.specialty);
  if (params.territoryId) query.set('territoryId', String(params.territoryId));

  const { data } = await apiClient.get<ApiListResponse<Doctor>>(`/doctors?${query.toString()}`);
  return data;
};

export const getDoctor = async (id: string | number) => {
  const { data } = await apiClient.get<ApiItemResponse<Doctor>>(`/doctors/${id}`);
  return (data as ApiItemResponse<Doctor> | Doctor).data ?? (data as Doctor);
};

export interface DoctorPayload {
  name: string;
  specialty?: string | null;
  city?: string | null;
  area?: string | null;
  territoryId?: string | number | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  segment?: string | null;
}

export const createDoctor = async (payload: DoctorPayload) => {
  const { data } = await apiClient.post<ApiItemResponse<Doctor>>('/doctors', { body: payload });
  return (data as ApiItemResponse<Doctor> | Doctor).data ?? (data as Doctor);
};

export const updateDoctor = async (id: string | number, payload: DoctorPayload) => {
  const { data } = await apiClient.put<ApiItemResponse<Doctor>>(`/doctors/${id}`, { body: payload });
  return (data as ApiItemResponse<Doctor> | Doctor).data ?? (data as Doctor);
};
