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

export interface RepRole {
  id: number | string;
  slug?: string;
  name?: string;
}

export interface Rep {
  id: number | string;
  name: string;
  email: string;
  is_active?: boolean;
  role?: RepRole | null;
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

export interface Visit {
  id: number | string;
  visit_date: string;
  rep_id: number | string;
  doctor_id?: number | string | null;
  pharmacy_id?: number | string | null;
  notes?: string | null;
  samples_given?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  doctor?: Pick<Doctor, 'id' | 'name' | 'specialty' | 'city' | 'area'> | null;
  pharmacy?: Pick<Pharmacy, 'id' | 'name' | 'city' | 'area'> | null;
  rep?: Pick<Rep, 'id' | 'name' | 'email'> | null;
}
