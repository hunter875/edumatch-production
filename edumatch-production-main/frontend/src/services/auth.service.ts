// File: src/services/auth.service.ts
// Canonical auth service — uses fetch with credentials: 'include' for cookie-based refresh.

import { API_ROOT } from '@/lib/api-config';
import { tokenStore } from '@/lib/tokenStore';

const API_BASE_URL = API_ROOT;
const AUTH_API_URL = `${API_BASE_URL}/api/auth`;

// Re-export access token helpers for backward compatibility
export const getAccessToken = () => tokenStore.getAccessToken();
export const setAccessToken = (t: string | null) => tokenStore.setAccessToken(t);

// Helper: Decode JWT token and extract roles
const decodeJWT = (token: string): { roles: string[] } | null => {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    const rolesStr = decoded.roles || '';
    const roles = rolesStr.split(',').map((r: string) => r.trim()).filter(Boolean);
    return { roles };
  } catch {
    return null;
  }
};

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  // refreshToken is NO LONGER in the JSON body — it's an HttpOnly cookie
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  enabled: boolean;
}

export const authService = {
  /**
   * Login — access token returned in JSON, refresh token set as HttpOnly cookie.
   */
  login: async (data: LoginCredentials): Promise<LoginResponse & { user: UserResponse }> => {
    const loginResponse = await fetch(`${AUTH_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: data.email,
        password: data.password,
      }),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Invalid username or password');
    }

    const loginData = await loginResponse.json();

    // Store access token in memory only
    if (loginData.accessToken) {
      tokenStore.setAccessToken(loginData.accessToken);
    }

    // Fetch user info
    const userResponse = await fetch(`${AUTH_API_URL}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.accessToken}`,
      },
      credentials: 'include',
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userData = await userResponse.json();
    const tokenData = decodeJWT(loginData.accessToken);
    const roles = tokenData?.roles || ['USER'];

    const enrichedUser = {
      ...userData,
      roles,
      role: roles[0] || 'USER',
      enabled: true,
      firstName: userData.firstName || userData.name?.split(' ')[0] || userData.username,
      lastName: userData.lastName || userData.name?.split(' ').slice(1).join(' ') || '',
    };

    return { ...loginData, user: enrichedUser };
  },

  /**
   * Register — access token in JSON, refresh token as HttpOnly cookie.
   */
  register: async (data: RegisterCredentials): Promise<LoginResponse & { user: UserResponse }> => {
    const registerResponse = await fetch(`${AUTH_API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      }),
    });

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Registration failed');
    }

    const registerData = await registerResponse.json();

    if (registerData.accessToken) {
      tokenStore.setAccessToken(registerData.accessToken);
    }

    const userResponse = await fetch(`${AUTH_API_URL}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${registerData.accessToken}`,
      },
      credentials: 'include',
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userData = await userResponse.json();
    const tokenData = decodeJWT(registerData.accessToken);
    const roles = tokenData?.roles || ['USER'];

    const enrichedUser = {
      ...userData,
      roles,
      role: roles[0] || 'USER',
      enabled: true,
      firstName: data.firstName,
      lastName: data.lastName,
    };

    return { ...registerData, user: enrichedUser };
  },

  /**
   * Logout — clears backend cookie + local state.
   */
  logout: async (): Promise<void> => {
    try {
      const token = tokenStore.getAccessToken();
      await fetch(`${AUTH_API_URL}/logout`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      });
    } catch {
      // Logout is best-effort — clear local state regardless
    } finally {
      tokenStore.clear();
      // Remove legacy localStorage items
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          localStorage.removeItem('auth_user');
        } catch { /* ignore */ }
      }
    }
  },

  /**
   * Refresh access token via HttpOnly cookie.
   * No body — the backend reads the cookie.
   */
  refreshToken: async (): Promise<string | null> => {
    try {
      const response = await fetch(`${AUTH_API_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (data.accessToken) {
        tokenStore.setAccessToken(data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Get current user info.
   */
  getCurrentUser: async (): Promise<UserResponse> => {
    const token = tokenStore.getAccessToken();
    const response = await fetch(`${AUTH_API_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to get user');
    }

    return response.json();
  },

  /**
   * Get user role from stored user data (legacy — prefer AuthContext).
   */
  getUserRole: (): string | null => {
    // Legacy localStorage lookup replaced with null return.
    // Callers should use AuthContext/useAuth() instead.
    return null;
  },

  /**
   * Get stored user (legacy — prefer AuthContext).
   */
  getStoredUser: (): UserResponse | null => {
    return null;
  },
};
