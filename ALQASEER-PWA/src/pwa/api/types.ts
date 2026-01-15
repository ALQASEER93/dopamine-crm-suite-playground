export type User = {
  id: string;
  name: string;
  email?: string;
  role?: string | { name?: string; slug?: string };
};

export type RouteStopStatus = "planned" | "in-progress" | "done" | "skipped";

export type RouteStop = {
  id: string;
  customerId: string;
  customerName: string;
  customerType: "doctor" | "pharmacy";
  address?: string;
  status: RouteStopStatus;
  scheduledFor?: string;
  location?: {
    lat: number;
    lng: number;
  };
};

export type Customer = {
  id: string;
  name: string;
  type: "doctor" | "pharmacy";
  area?: string;
  specialty?: string;
  phone?: string;
  address?: string;
  lastVisit?: string;
  location?: {
    lat: number;
    lng: number;
  };
};

export type VisitStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "NO_SHOW";

export type VisitPayload = {
  customerId: string;
  customerName: string;
  customerType: "doctor" | "pharmacy";
  visitType: "follow-up" | "new" | "reminder";
  status: VisitStatus;
  notes?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  visitedAt?: string;
};

export type Visit = VisitPayload & {
  id: string;
  repId?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  serverStatus?: string;
};

export type Product = {
  id: string;
  name: string;
  sku?: string;
  price?: number;
};

export type OrderItem = {
  productId: string;
  quantity: number;
};

export type OrderPayload = {
  customerId: string;
  items: OrderItem[];
  notes?: string;
};

export type LoginResponse = {
  access_token?: string;
  token?: string;
  token_type?: string;
  user: User;
};
