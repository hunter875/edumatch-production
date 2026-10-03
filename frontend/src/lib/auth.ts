'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthUser, AuthState, LoginCredentials, RegisterCredentials, UserRole } from '@/types';
import { authService } from '@/services/auth.service';
import { removeFromLocalStorage } from '@/lib/utils';
import { deleteCookie } from '@/lib/cookies';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const resetAuthState = () => ({
    user: null,
    profile: null,
    isLoading: false,
    isAuthenticated: false,
    role: null,
  });

  const createAuthenticatedState = (user: any) => ({
    user,
    profile: user?.profile || null,
    isLoading: false,
    isAuthenticated: true,
    role: user?.role || null,
  });

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    role: null,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state by attempting a refresh.
  //
  // The session cookies (refresh_token, auth_session) are HttpOnly by design so
  // JavaScript cannot read them — which is exactly why this bootstrap must not
  // try to. An earlier version guarded on getCookie('auth_token'), a cookie the
  // backend never sets, so the guard always failed and the session was never
  // restored after a reload. The only reliable signal is the refresh call
  // itself: it carries the cookie and answers whether a session exists.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // Show loading until refresh attempt completes
      setAuthState(prev => ({ ...prev, isLoading: true }));

      try {
        const { tokenStore } = await import('@/lib/tokenStore');
        const { API_ROOT } = await import('@/lib/api-config');

        // Try single-flight refresh to recover session
        const newToken = await tokenStore.refreshOnce(async () => {
          const res = await fetch(`${API_ROOT}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          if (!res.ok) return null;
          const data = await res.json();
          return data.accessToken || null;
        });

        if (!newToken || cancelled) {
          // No session to restore. This is the normal anonymous case, not an
          // error: clear any stale legacy markers and settle as signed out.
          tokenStore.clear();
          deleteCookie('auth_token');
          deleteCookie('auth_user');
          if (!cancelled) setAuthState(resetAuthState());
          return;
        }

        tokenStore.setAccessToken(newToken);

        // Fetch user info with new token
        try {
          const userRes = await fetch(`${API_ROOT}/api/auth/me`, {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            // The token carries roles ("ROLE_ADMIN"); the profile payload may
            // report a single role. Prefer the highest-privilege role so an
            // admin is not downgraded to USER on reload.
            const rawRoles: string[] = Array.isArray(userData.roles)
              ? userData.roles
              : (userData.role ? [userData.role] : []);
            const normalized = rawRoles.map((r: string) => String(r).replace('ROLE_', '').toUpperCase());
            const primaryRole = normalized.includes('ADMIN') ? 'ADMIN'
              : normalized.includes('EMPLOYER') ? 'EMPLOYER'
              : normalized[0] || 'USER';

            const authUser = {
              id: String(userData.id),
              email: userData.email || userData.username,
              name: [userData.firstName, userData.lastName].filter(Boolean).join(' ')
                || userData.name || userData.username,
              role: primaryRole as UserRole,
              emailVerified: true,
              status: 'ACTIVE',
              subscriptionType: 'FREE',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            if (!cancelled) setAuthState(createAuthenticatedState(authUser));
            return;
          }
        } catch (_) { /* fall through */ }

        // Token is valid but the profile call failed; treat as signed in with an
        // unknown role rather than dropping a live session.
        if (!cancelled) {
          setAuthState({
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: true,
            role: null,
          });
        }
      } catch (_) {
        if (!cancelled) {
          deleteCookie('auth_token');
          deleteCookie('auth_user');
          setAuthState(resetAuthState());
        }
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  // Auto refresh token periodically
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        await refreshToken();
      } catch (error) {
        logout();
      }
    }, 15 * 60 * 1000); // Refresh every 15 minutes

    return () => clearInterval(interval);
  }, [authState.isAuthenticated]);

  const login = async (credentials: LoginCredentials) => {
    try {
      setError(null);
      setAuthState((prev: AuthState) => ({ ...prev, isLoading: true }));

      // Call real authService
      const response = await authService.login({
        email: credentials.email,
        password: credentials.password || '',
      });

      if (response.user && response.accessToken) {
        const { user } = response;

        // Transform backend user to AuthUser format
        // Prioritize role: ADMIN > EMPLOYER > USER
        const roles = user.roles || [];
        let primaryRole = 'USER';
        
        // Check if user has ADMIN role (highest priority)
        if (roles.some((r: string) => r.replace('ROLE_', '').toUpperCase() === 'ADMIN')) {
          primaryRole = 'ADMIN';
        } else if (roles.some((r: string) => r.replace('ROLE_', '').toUpperCase() === 'EMPLOYER')) {
          primaryRole = 'EMPLOYER';
        } else if (roles.length > 0) {
          primaryRole = roles[0]?.replace('ROLE_', '') || 'USER';
        }
        
        const authUser: AuthUser = {
          id: String(user.id),
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          role: primaryRole.toUpperCase() as UserRole, // Cast to UserRole enum
          emailVerified: user.enabled,
          status: 'ACTIVE',
          subscriptionType: 'FREE',
          createdAt: new Date(),
          updatedAt: new Date(),
          profile: {
            firstName: user.firstName,
            lastName: user.lastName,
          }
        };

        console.log('💾 [Auth.ts] User authenticated:', authUser.email);

        // Update state only — no localStorage or non-HttpOnly cookies for user data
        setAuthState(createAuthenticatedState(authUser));

        // Wait a bit then redirect
        setTimeout(() => {
          // Redirect based on user role - ADMIN always goes to admin dashboard
          if (authUser.role === UserRole.ADMIN) {
            window.location.href = '/admin/dashboard';
          } else if (authUser.role === UserRole.EMPLOYER) {
            window.location.href = '/employer/dashboard';
          } else {
            window.location.href = '/user/dashboard';
          }
        }, 100);
      } else {
        setAuthState((prev: AuthState) => ({ ...prev, isLoading: false }));
        const errorMessage = 'Login failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      setAuthState(resetAuthState());
      throw err;
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      setError(null);
      setAuthState((prev: AuthState) => ({ ...prev, isLoading: true }));

      // Call real authService
      const response = await authService.register({
        email: credentials.email,
        password: credentials.password || '',
        firstName: credentials.name?.split(' ')[0] || credentials.email.split('@')[0],
        lastName: credentials.name?.split(' ').slice(1).join(' ') || '',
      });

      if (response.user && response.accessToken) {
        const { user } = response;

        // Transform backend user to AuthUser format
        const roleStr = user.roles?.[0]?.replace('ROLE_', '') || 'USER';
        const authUser: AuthUser = {
          id: String(user.id),
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          role: roleStr as UserRole, // Cast to UserRole enum
          emailVerified: user.enabled,
          status: 'ACTIVE',
          subscriptionType: 'FREE',
          createdAt: new Date(),
          updatedAt: new Date(),
          profile: {
            firstName: user.firstName,
            lastName: user.lastName,
          }
        };

        // Update state only — no localStorage or non-HttpOnly cookies for user data
        setAuthState(createAuthenticatedState(authUser));

        // Redirect to home page after successful registration
        window.location.href = '/';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      setAuthState(resetAuthState());
      throw err;
    }
  };

  const logout = async () => {
    try {
      // Call real logout API
      await authService.logout();
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      // Clear any legacy localStorage items
      try {
        removeFromLocalStorage('auth_token');
        removeFromLocalStorage('auth_user');
      } catch (_) { /* ignore */ }

      // Clear cookies
      deleteCookie('auth_token');
      deleteCookie('auth_user');

      // Update state
      setAuthState(resetAuthState());
      setError(null);
      
      // Redirect to home page
      window.location.href = '/';
    }
  };

  /**
   * Refresh the access token from the HttpOnly refresh cookie.
   *
   * This previously logged "not implemented yet", so the periodic refresh did
   * nothing and every session died when the short-lived access token expired
   * (15 minutes by default).
   */
  const refreshToken = async () => {
    const { tokenStore } = await import('@/lib/tokenStore');
    const { API_ROOT } = await import('@/lib/api-config');

    const newToken = await tokenStore.refreshOnce(async () => {
      const res = await fetch(`${API_ROOT}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.accessToken || null;
    });

    if (!newToken) {
      // The refresh cookie is gone or rejected: the session really is over.
      await logout();
      throw new Error('Session expired');
    }

    tokenStore.setAccessToken(newToken);
    return newToken;
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    error,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protecting routes
export function useRequireAuth(redirectTo = '/login') {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isAuthenticated, isLoading };
}

// Hook for role-based access
export function useRequireRole(allowedRoles: string[], redirectTo = '/') {
  const { user, isAuthenticated, isLoading } = useAuth();

  const hasRequiredRole = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRequiredRole && typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, hasRequiredRole, redirectTo]);

  return { hasRequiredRole, isLoading };
}
