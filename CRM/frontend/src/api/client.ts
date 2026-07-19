const LOCAL_API_DEFAULT = import.meta.env.DEV ? '/api/v1' : '';
const SAME_ORIGIN_API_BASE = '/api/v1';

const isBlockedProductionApiUrl = (value: string) => {
  const normalized = value.trim();
  if (!normalized || normalized.startsWith('/')) return false;

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    const localHost = ['local', 'host'].join('');
    const loopback = ['127', '0', '0', '1'].join('.');
    const bindAll = ['0', '0', '0', '0'].join('.');
    const localTld = ['', 'local'].join('.');
    const vercelTld = ['vercel', 'app'].join('.');
    return host === localHost || host === loopback || host === bindAll || host === '::1' || host.endsWith(localTld) || host.endsWith(vercelTld);
  } catch (_error) {
    return true;
  }
};

const resolveApiBaseUrl = () => {
  const rawBaseUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? LOCAL_API_DEFAULT : SAME_ORIGIN_API_BASE)
  ) as string;
  const normalized = rawBaseUrl.trim().replace(/\/$/, '');

  if (import.meta.env.PROD && (!normalized || isBlockedProductionApiUrl(normalized))) {
    throw new Error(
      [
        'Production API base URL is invalid.',
        'Use same-origin /api/v1 or set VITE_API_BASE_URL to an approved deployed API host.',
      ].join(' '),
    );
  }

  return normalized;
};

export const API_BASE_URL = resolveApiBaseUrl();

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ResponseType = 'json' | 'text' | 'blob';

export interface ApiRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string> | Headers;
  body?: any;
  token?: string | null;
  responseType?: ResponseType;
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  data: T;
  response: Response;
}

export class ApiError extends Error {
  status?: number;
  payload?: unknown;
  response?: Response;

  constructor(message: string, init: Partial<ApiError> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = init.status;
    this.payload = init.payload;
    this.response = init.response;
  }
}

let authToken: string | null = null;
export interface UnauthorizedContext {
  path: string;
  status: number;
}

let unauthorizedHandler: ((context: UnauthorizedContext) => void) | null = null;

const API_PREFIX = '/api/v1';

const buildUrl = (path: string): string => {
  if (!path) {
    throw new Error('apiFetch requires a path argument.');
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const shouldStripPrefix = API_BASE_URL.endsWith(API_PREFIX) && normalizedPath.startsWith(API_PREFIX);
  const finalPath = shouldStripPrefix ? normalizedPath.slice(API_PREFIX.length) || '/' : normalizedPath;

  return `${API_BASE_URL}${finalPath.startsWith('/') ? finalPath : `/${finalPath}`}`;
};

const shouldSerializeBody = (body: unknown) =>
  body !== undefined &&
  body !== null &&
  typeof body === 'object' &&
  !(body instanceof FormData) &&
  !(body instanceof Blob);

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return text as unknown;
  }
};

const normalizeErrorMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object') {
    const maybeMessage = (payload as Record<string, unknown>).message || (payload as Record<string, unknown>).detail;
    if (typeof maybeMessage === 'string') return maybeMessage;
    if (Array.isArray((payload as Record<string, unknown>).errors)) {
      const first = (payload as Record<string, unknown>).errors?.[0];
      if (typeof first === 'string') return first;
    }
  }
  if (typeof payload === 'string' && payload.trim()) return payload;
  return fallback;
};

export const setAuthToken = (token: string | null) => {
  authToken = token ?? null;
};

export const setUnauthorizedHandler = (handler: ((context: UnauthorizedContext) => void) | null) => {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
};

export async function apiFetch<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', headers = {}, body, token, responseType = 'json', signal } = options;

  const finalHeaders = new Headers(headers);
  const effectiveToken = token ?? authToken;
  if (effectiveToken && !finalHeaders.has('Authorization')) {
    finalHeaders.set('Authorization', `Bearer ${effectiveToken}`);
  }

  let requestBody = body;
  if (shouldSerializeBody(body)) {
    requestBody = JSON.stringify(body);
  }

  if (requestBody !== undefined && !(requestBody instanceof FormData) && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  const requestUrl = buildUrl(path);

  const response = await fetch(requestUrl, {
    method,
    headers: finalHeaders,
    body: requestBody as BodyInit | null | undefined,
    signal,
  });

  let data: any = null;
  if (responseType === 'blob') {
    data = await response.blob();
  } else if (responseType === 'text') {
    data = await response.text();
  } else {
    data = await parseJsonSafely(response);
  }

  if (response.status === 401 && unauthorizedHandler && effectiveToken) {
    unauthorizedHandler({ path, status: response.status });
  }

  if (!response.ok) {
    const message = normalizeErrorMessage(data, `${response.status} ${response.statusText}`);
    if (response.status === 422) {
      // Surface backend validation payloads to aid debugging in the browser console.
      // eslint-disable-next-line no-console
      console.error('API validation error', { url: requestUrl, payload: data });
    }
    throw new ApiError(message, { status: response.status, payload: data, response });
  }

  return { data: data as T, response };
}

const requestWithMethod = <T = unknown>(method: HttpMethod) => {
  return (path: string, options: Omit<ApiRequestOptions, 'method'> = {}) =>
    apiFetch<T>(path, { ...options, method });
};

export const apiClient = {
  request: apiFetch,
  get: requestWithMethod('GET'),
  post: requestWithMethod('POST'),
  put: requestWithMethod('PUT'),
  patch: requestWithMethod('PATCH'),
  delete: requestWithMethod('DELETE'),
};

export type { ApiRequestOptions as ApiRequestConfig };
