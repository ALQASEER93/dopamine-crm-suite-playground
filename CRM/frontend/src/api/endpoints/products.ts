import { apiClient } from '../client';
import type { ApiListResponse, ApiItemResponse, Product } from '../../types/crm';

export const productKeys = {
  all: ['products'] as const,
  list: (params?: ProductListParams) => ['products', params] as const,
};

export interface ProductListParams {
  page?: number;
  page_size?: number;
  line?: string;
  search?: string;
  is_active?: boolean;
}

export const listProducts = async (params: ProductListParams) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.line) query.set('line', params.line);
  if (params.search) query.set('search', params.search.trim());
  if (typeof params.is_active === 'boolean') query.set('is_active', String(params.is_active));

  const qs = query.toString();
  const path = qs ? `/products?${qs}` : '/products';
  const { data } = await apiClient.get<ApiListResponse<Product>>(path);
  return data;
};

export interface ProductPayload {
  code: string;
  name: string;
  line?: string | null;
  pack?: string | null;
  cost?: number | string | null;
  selling_price?: number | string | null;
  bonus_rules?: string | null;
  is_active?: boolean | null;
}

export const createProduct = async (payload: ProductPayload) => {
  const { data } = await apiClient.post<ApiItemResponse<Product>>('/products', { body: payload });
  return (data as ApiItemResponse<Product> | Product).data ?? (data as Product);
};

export const updateProduct = async (id: string | number, payload: ProductPayload) => {
  const { data } = await apiClient.put<ApiItemResponse<Product>>(`/products/${id}`, { body: payload });
  return (data as ApiItemResponse<Product> | Product).data ?? (data as Product);
};

export const deactivateProduct = async (id: string | number) => {
  await apiClient.delete(`/products/${id}`);
};

export const exportProducts = async (params: ProductListParams) => {
  const query = new URLSearchParams();
  if (params.line) query.set('line', params.line);
  if (params.search) query.set('search', params.search.trim());
  if (typeof params.is_active === 'boolean') query.set('is_active', String(params.is_active));
  const qs = query.toString();
  const path = qs ? `/products/export?${qs}` : '/products/export';
  const { data, response } = await apiClient.get<Blob>(path, { responseType: 'blob' });
  return { blob: data, response };
};

export const importProducts = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post('/products/import', { body: form });
  return data;
};
