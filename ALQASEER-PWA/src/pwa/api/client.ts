import { useAuthStore } from "../state/auth";
import {
  Customer,
  LoginResponse,
  OrderPayload,
  Product,
  RouteStop,
  Visit,
  VisitPayload,
} from "./types";

const DEFAULT_API_BASE = "http://127.0.0.1:8000/api/v1";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE;

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

function buildUrl(path: string) {
  if (path.startsWith("http")) return path;
  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL.replace(/\/$/, "")}/${trimmed}`;
}

function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.warn("cache read failed", err);
    return null;
  }
}

function setCached<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("cache write failed", err);
  }
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, clearSession } = useAuthStore.getState();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path), { ...options, headers });

  if (res.status === 401) {
    clearSession();
    window.location.replace("/login");
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed with status ${res.status}`);
  }

  return (await res.json()) as T;
}

export async function login(credentials: { email: string; password: string }) {
  const data = await apiFetch<LoginResponse>("auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  useAuthStore.getState().setSession(data.access_token, data.user);
  return data;
}

export async function getTodayRoute(): Promise<RouteStop[]> {
  try {
    const data = await apiFetch<RouteStop[]>("routes/today");
    setCached("today-route", data);
    return data;
  } catch (err) {
    const cached = getCached<RouteStop[]>("today-route");
    if (cached) return cached;
    throw err;
  }
}

export async function getCustomers(query?: {
  search?: string;
  type?: string;
  area?: string;
  specialty?: string;
}): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.type) params.set("type", query.type);
  if (query?.area) params.set("area", query.area);
  if (query?.specialty) params.set("specialty", query.specialty);
  const path = params.toString() ? `customers?${params.toString()}` : "customers";

  try {
    const data = await apiFetch<Customer[]>(path);
    setCached("customers", data);
    return data;
  } catch (err) {
    const cached = getCached<Customer[]>("customers");
    if (cached) return cached;
    throw err;
  }
}

export async function getVisits(filters?: { date?: string; status?: string; customerId?: string }) {
  const params = new URLSearchParams();
  if (filters?.date) params.set("date", filters.date);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.customerId) params.set("customerId", filters.customerId);
  const path = params.toString() ? `visits?${params.toString()}` : "visits";

  try {
    const data = await apiFetch<Visit[]>(path);
    setCached("visits", data);
    return data;
  } catch (err) {
    const cached = getCached<Visit[]>("visits");
    if (cached) return cached;
    throw err;
  }
}

export async function createVisit(payload: VisitPayload) {
  return apiFetch<Visit>("visits", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getProducts() {
  return apiFetch<Product[]>("products");
}

export async function createOrder(payload: OrderPayload) {
  return apiFetch<{ id: string }>("orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendLocationPing(payload: {
  lat: number;
  lng: number;
  accuracy?: number | null;
}) {
  try {
    return await apiFetch<{ success: boolean }>("tracking/pings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("location ping failed, will rely on queue", error);
    return { success: false };
  }
}
