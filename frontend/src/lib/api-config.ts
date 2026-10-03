import { tokenStore } from '@/lib/tokenStore';

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

/**
 * Read the in-memory access token.
 *
 * `require` is not defined in the client bundle's ESM scope, so the previous
 * implementation silently fell into its catch block every time and this
 * function always returned null — meaning no request ever carried a bearer
 * token. The token store is imported statically instead, which the bundler
 * resolves at build time.
 */
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return tokenStore.getAccessToken();
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

/**
 * Perform a request, recovering the session once if the token is not ready yet.
 *
 * The access token lives in memory only, so on a fresh page load it is absent
 * until the auth bootstrap completes its refresh. A page that fetches on mount
 * (the profile page does) therefore raced the bootstrap and sent no
 * Authorization header, producing a 401 that surfaced as an empty profile.
 *
 * Instead of making every caller wait for auth state, one 401 triggers a single
 * cookie-based refresh and the request is retried. `refreshOnce` is
 * single-flight, so concurrent 401s cause one refresh, not one each.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  _retried = false
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

  if (response.status === 401 && !_retried) {
    const recovered = await refreshAccessTokenOnce();
    if (recovered) {
      return apiRequest<T>(endpoint, options, true);
    }
  }

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

/**
 * Exchange the HttpOnly refresh cookie for a new access token.
 * Single-flight so a burst of 401s cannot stampede the auth service.
 */
async function refreshAccessTokenOnce(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const { tokenStore } = await import('@/lib/tokenStore');
    return await tokenStore.refreshOnce(async () => {
      const res = await fetch(`${API_ROOT}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) return null;
      const body = await res.json();
      return body.accessToken || null;
    });
  } catch (_) {
    return null;
  }
}

export function buildRepeatedQueryParam(name: string, values: Array<string | number>): string {
  const params = new URLSearchParams();
  values.forEach((value) => params.append(name, value.toString()));
  return params.toString();
}
