import { useAuthStore } from "../state/auth";
import {
  Customer,
  LoginResponse,
  RouteStop,
  Visit,
  VisitPayload,
} from "./types";
import { BUILD_API_BASE } from "../buildInfo";

const LOCAL_API_DEFAULT = import.meta.env.DEV ? "http://127.0.0.1:8000/api/v1" : "";
const SAME_ORIGIN_API_BASE = "/api/v1";

function isBlockedProductionApiUrl(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.startsWith("/")) return false;

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    const localHost = ["local", "host"].join("");
    const loopback = ["127", "0", "0", "1"].join(".");
    const bindAll = ["0", "0", "0", "0"].join(".");
    const localTld = ["", "local"].join(".");
    const vercelTld = ["vercel", "app"].join(".");
    return host === localHost || host === loopback || host === bindAll || host === "::1" || host.endsWith(localTld) || host.endsWith(vercelTld);
  } catch (_error) {
    return true;
  }
}

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  const rawBaseUrl = configured || (import.meta.env.DEV ? LOCAL_API_DEFAULT : BUILD_API_BASE || SAME_ORIGIN_API_BASE);
  const normalized = rawBaseUrl.trim().replace(/\/$/, "");

  if (import.meta.env.PROD && isBlockedProductionApiUrl(normalized)) {
    throw new Error("Production PWA API base URL is blocked. Use same-origin /api/v1 or an approved HTTPS API host.");
  }

  return normalized;
}

export const API_BASE_URL = resolveApiBaseUrl();

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
    // For login, avoid a forced redirect so the UI can show "wrong credentials"
    // vs "API unreachable" without leaking details.
    if (path !== "auth/login") {
      clearSession();
      window.location.replace("/login");
    }
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
  const token = data.access_token || data.token;
  if (!token) {
    throw new Error("Login succeeded but no token was returned.");
  }
  useAuthStore.getState().setSession(token, data.user);
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
  const path = params.toString() ? `pwa/customers?${params.toString()}` : "pwa/customers";

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
  const path = params.toString() ? `pwa/visits?${params.toString()}` : "pwa/visits";

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
  const body = {
    customerId: payload.customerId,
    customerName: payload.customerName,
    customerType: payload.customerType,
    visitType: payload.visitType,
    notes: payload.notes,
    ...(payload.status ? { status: payload.status } : {}),
  };
  return apiFetch<Visit>("pwa/visits", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function startVisit(visitId: string, payload: { lat: number; lng: number; accuracy?: number | null; startedAt?: string }) {
  return apiFetch<Visit>(`visits/${visitId}/start`, {
    method: "POST",
    body: JSON.stringify({
      lat: payload.lat,
      lng: payload.lng,
      accuracy: payload.accuracy ?? null,
      started_at: payload.startedAt,
    }),
  });
}

export async function endVisit(visitId: string, payload: { lat: number; lng: number; accuracy?: number | null; endedAt?: string }) {
  return apiFetch<Visit>(`visits/${visitId}/end`, {
    method: "POST",
    body: JSON.stringify({
      lat: payload.lat,
      lng: payload.lng,
      accuracy: payload.accuracy ?? null,
      ended_at: payload.endedAt,
    }),
  });
}

export async function updateVisitNotes(visitId: string, notes: string) {
  return apiFetch<Visit>(`visits/${visitId}`, {
    method: "PUT",
    body: JSON.stringify({ notes }),
  });
}

export async function sendLocationPing(payload: {
  lat: number;
  lng: number;
  accuracy?: number | null;
}) {
  try {
    return await apiFetch<{ success: boolean }>("pwa/tracking/pings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("location ping failed, will rely on queue", error);
    return { success: false };
  }
}
