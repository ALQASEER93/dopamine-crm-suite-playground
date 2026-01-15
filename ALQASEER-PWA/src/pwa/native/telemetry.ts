import { API_BASE_URL } from "../api/client";

type BackgroundLocationPlugin = {
  configure: (options: {
    authToken?: string;
    apiBaseUrl?: string;
    intervalSeconds?: number;
  }) => Promise<void>;
  start: (options: {
    authToken?: string;
    apiBaseUrl?: string;
    intervalSeconds?: number;
    source?: string;
  }) => Promise<void>;
  stop: () => Promise<void>;
};

const getPlugin = (): BackgroundLocationPlugin | null => {
  const cap = (window as typeof window & { Capacitor?: any }).Capacitor;
  return cap?.Plugins?.BackgroundLocation ?? null;
};

const getAbsoluteApiBaseUrl = () => {
  if (API_BASE_URL.startsWith("http")) return API_BASE_URL;
  const base = API_BASE_URL.startsWith("/") ? API_BASE_URL : `/${API_BASE_URL}`;
  return `${window.location.origin}${base}`;
};

export const configureNativeTelemetry = async (token?: string, intervalSeconds = 30) => {
  const plugin = getPlugin();
  if (!plugin) return;
  await plugin.configure({
    authToken: token,
    apiBaseUrl: getAbsoluteApiBaseUrl(),
    intervalSeconds,
  });
};

export const startNativeTelemetry = async (token?: string, intervalSeconds = 30) => {
  const plugin = getPlugin();
  if (!plugin) return;
  await plugin.start({
    authToken: token,
    apiBaseUrl: getAbsoluteApiBaseUrl(),
    intervalSeconds,
    source: "native_capacitor",
  });
};

export const stopNativeTelemetry = async () => {
  const plugin = getPlugin();
  if (!plugin) return;
  await plugin.stop();
};
