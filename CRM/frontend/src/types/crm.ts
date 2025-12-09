export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta?: PaginationMeta;
  pagination?: PaginationMeta;
  total?: number;
}

export interface ApiItemResponse<T> {
  data: T;
}

export interface Doctor {
  id: number | string;
  name: string;
  specialty?: string | null;
  city?: string | null;
  area?: string | null;
  territoryId?: number | string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive?: boolean;
  segment?: string | null;
}

export interface Pharmacy {
  id: number | string;
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
