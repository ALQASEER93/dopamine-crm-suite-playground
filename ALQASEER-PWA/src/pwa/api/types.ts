export type User = {
  id: string;
  name: string;
  email?: string;
  role?: string;
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
  territory?: string;
  specialty?: string;
  category?: string;
  priority?: "A" | "B" | "C";
  monthlyFrequencyTarget?: number;
  visitsThisMonth?: number;
  assignedRepEmail?: string;
  productFocus?: string;
  notes?: string;
  phone?: string;
  address?: string;
  lastVisit?: string;
  location?: {
    lat: number;
    lng: number;
  };
};

export type VisitPayload = {
  customerId: string;
  customerName: string;
  customerType: "doctor" | "pharmacy";
  visitType: "follow-up" | "new" | "reminder";
  status?: "scheduled" | "success" | "refused" | "no-show" | "reminder";
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
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  callDurationSeconds?: number;
  startAccuracy?: number | null;
  endAccuracy?: number | null;
  endCoordinates?: {
    lat: number;
    lng: number;
  } | null;
  serverStatus?: string;
};

export type CoverageSummary = {
  totalAssignedCustomers: number;
  visitedToday: number;
  remainingToday: number;
  completedVisitsThisMonth: number;
  monthlyFrequencyTarget: number;
  frequencyAchievedPct: number;
  dueCustomers: number;
  overdueCustomers: number;
  avgVisitDurationMinutes: number;
  avgCallDurationMinutes: number;
  visitsByArea: Array<{ area: string; visits: number }>;
  visitsByCustomerType: Array<{ type: "doctor" | "pharmacy"; visits: number }>;
  gpsMissingOrLowAccuracy: number;
};

export type LoginResponse = {
  access_token?: string;
  token?: string;
  token_type?: string;
  user: User;
};
