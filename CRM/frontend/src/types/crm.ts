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

export interface Product {
  id: number | string;
  code: string;
  name: string;
  line?: string | null;
  pack?: string | null;
  cost?: number | string | null;
  selling_price?: number | string | null;
  bonus_rules?: string | null;
  is_active?: boolean;
}

export interface OrderLine {
  id?: number | string;
  product_id: number | string;
  quantity: number;
  price: number | string;
  discount?: number | null;
  bonus?: number | null;
  product?: Pick<Product, 'id' | 'name' | 'code'> | null;
}

export interface Order {
  id: number | string;
  order_date: string;
  status: string;
  payment_status: string;
  total_amount: number | string;
  aljazeera_ref?: string | null;
  doctor_id?: number | string | null;
  pharmacy_id?: number | string | null;
  doctor?: Pick<Doctor, 'id' | 'name'> | null;
  pharmacy?: Pick<Pharmacy, 'id' | 'name'> | null;
  lines?: OrderLine[];
}

export interface StockLocation {
  id: number | string;
  name: string;
  location_type: 'warehouse' | 'rep_car' | string;
  rep_id?: number | string | null;
}

export interface StockMovement {
  id: number | string;
  movement_date: string;
  product_id: number | string;
  quantity: number;
  reason: string;
  location_from_id?: number | string | null;
  location_to_id?: number | string | null;
  notes?: string | null;
  product?: Pick<Product, 'id' | 'name' | 'code'> | null;
}

export interface Target {
  id: number | string;
  rep_id: number | string;
  period: string;
  product_id?: number | string | null;
  target_amount: number | string;
  achieved_amount?: number | string | null;
}

export interface VisitTarget {
  id: number | string;
  rep_id: number | string;
  period: string;
  daily_target_visits: number;
  monthly_target_visits: number;
}

export interface Collection {
  id: number | string;
  collection_date: string;
  amount: number | string;
  method: string;
  reference?: string | null;
  doctor_id?: number | string | null;
  pharmacy_id?: number | string | null;
  notes?: string | null;
  doctor?: Pick<Doctor, 'id' | 'name'> | null;
  pharmacy?: Pick<Pharmacy, 'id' | 'name'> | null;
}

export interface Territory {
  id: number | string;
  name: string;
  code?: string | null;
}

export interface RouteAccount {
  id?: number | string;
  account_type: 'doctor' | 'pharmacy';
  doctor_id?: number | string | null;
  pharmacy_id?: number | string | null;
  visit_frequency?: string | null;
}

export interface Route {
  id: number | string;
  name: string;
  rep_id: number | string;
  frequency?: string | null;
  notes?: string | null;
  accounts?: RouteAccount[];
}
