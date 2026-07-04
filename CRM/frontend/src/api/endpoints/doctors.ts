import { apiClient } from '../client';
import type { ApiListResponse, ApiItemResponse, Doctor } from '../../types/crm';

export const doctorKeys = {
  all: ['doctors'] as const,
  list: (params?: DoctorListParams) => ['doctors', params] as const,
  detail: (id: string | number) => ['doctors', 'detail', String(id)] as const,
};

export interface DoctorListParams {
  page?: number;
  page_size?: number;
  search?: string;
  city?: string;
  area?: string;
  classification?: string;
}

export const listDoctors = async (params: DoctorListParams) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.search) query.set('search', params.search.trim());
  if (params.city) query.set('city', params.city);
  if (params.area) query.set('area', params.area);
  if (params.classification) query.set('classification', params.classification);

  const qs = query.toString();
  const path = qs ? `/doctors?${qs}` : '/doctors';
  const { data } = await apiClient.get<ApiListResponse<Doctor>>(path);
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
  classification?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  notes?: string | null;
}

export const createDoctor = async (payload: DoctorPayload) => {
  const { data } = await apiClient.post<ApiItemResponse<Doctor>>('/doctors', { body: payload });
  return (data as ApiItemResponse<Doctor> | Doctor).data ?? (data as Doctor);
};

export const updateDoctor = async (id: string | number, payload: DoctorPayload) => {
  const { data } = await apiClient.put<ApiItemResponse<Doctor>>(`/doctors/${id}`, { body: payload });
  return (data as ApiItemResponse<Doctor> | Doctor).data ?? (data as Doctor);
};
