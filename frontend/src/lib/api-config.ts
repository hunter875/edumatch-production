export const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:19080';

export const API_ROOT = API_GATEWAY_URL.replace(/\/$/, '');
export const API_PREFIX = `${API_ROOT}/api`;
export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  `${API_ROOT.replace(/^http/, 'ws')}/api/ws`;

const DEFAULT_API_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 10000);

const getCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) return null;
  const cookieValue = parts.pop()?.split(';').shift();
  return cookieValue ? decodeURIComponent(cookieValue) : null;
};

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('auth_token') ||
    getCookieValue('auth_token') ||
    localStorage.getItem('token')
  );
};

export const getAuthHeaders = (contentType: string | null = 'application/json'): HeadersInit => {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_API_TIMEOUT_MS);

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${DEFAULT_API_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_ROOT}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetchWithTimeout(url, {
    ...options,
    credentials: options.credentials ?? 'include',
    headers: {
      ...getAuthHeaders(isFormData ? null : 'application/json'),
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type');
  let data: any = {};

  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || data.detail || `HTTP error! status: ${response.status}`);
  }

  return data as T;
}

export function buildRepeatedQueryParam(name: string, values: Array<string | number>): string {
  const params = new URLSearchParams();
  values.forEach((value) => params.append(name, value.toString()));
  return params.toString();
}
