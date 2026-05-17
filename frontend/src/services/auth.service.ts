// File: src/services/auth.service.ts (Using fetch API)

import { API_ROOT } from '@/lib/api-config';

const API_BASE_URL = API_ROOT;
const AUTH_API_URL = `${API_BASE_URL}/api/auth`;

// Helper: Decode JWT token and extract roles
const decodeJWT = (token: string): { roles: string[] } | null => {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    // JWT has roles as "USER,ADMIN,EMPLOYER" string
    const rolesStr = decoded.roles || '';
    const roles = rolesStr.split(',').map((r: string) => r.trim()).filter(Boolean);
    return { roles };
  } catch (error) {
    console.error('Failed to decode JWT:', error);
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
  // sex removed - backend không hỗ trợ
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  refreshToken?: string;
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
   * Login - POST /login
   */
  login: async (data: LoginCredentials): Promise<LoginResponse & { user: UserResponse }> => {
    try {
      console.log('🔐 [AuthService] Login attempt with REAL API...');
      console.log('📤 Request payload:', { username: data.email, password: '***' });
      
      // Step 1: Login to get token
      const loginResponse = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      console.log('✅ [AuthService] Login successful, token received');
      
      // Save token immediately
      if (loginData.accessToken) {
        const token = loginData.accessToken;
        localStorage.setItem('auth_token', token);
        if (loginData.refreshToken) {
          localStorage.setItem('refresh_token', loginData.refreshToken);
        }
        if (typeof document !== 'undefined') {
          document.cookie = `auth_token=${token}; Path=/; Max-Age=86400`;
        }
      }
      
      // Step 2: Get user info
      console.log('👤 [AuthService] Fetching user info...');
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
      console.log('📝 [AuthService] User info retrieved:', userData);
      
      // Extract roles from JWT token
      const tokenData = decodeJWT(loginData.accessToken);
      const roles = tokenData?.roles || ['USER'];
      console.log('🎭 [AuthService] Roles from JWT:', roles);
      
      // Merge user data with roles
      const enrichedUser = {
        ...userData,
        roles,
        role: roles[0] || 'USER', // Add primary role for Navbar
        enabled: true,
        firstName: userData.name?.split(' ')[0] || userData.username,
        lastName: userData.name?.split(' ').slice(1).join(' ') || '',
      };
      
      console.log('✅ [AuthService] Enriched user with role:', enrichedUser);
      
      // NOTE: Don't save user to localStorage here!
      // Let auth.ts handle saving the properly transformed AuthUser
      
      return {
        ...loginData,
        user: enrichedUser,
      };
    } catch (error: any) {
      console.error('❌ [AuthService] Login failed:', error);
      throw new Error(error.message || 'Invalid credentials');
    }
  },

  /**
   * Register - POST /register
   */
  register: async (data: RegisterCredentials): Promise<LoginResponse & { user: UserResponse }> => {
    try {
      console.log('📝 [AuthService] Register attempt with REAL API...');
      
      // Step 1: Register
      const registerResponse = await fetch(`${AUTH_API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      console.log('✅ [AuthService] Registration successful');
      
      // Save token
      if (registerData.accessToken) {
        const token = registerData.accessToken;
        localStorage.setItem('auth_token', token);
        if (registerData.refreshToken) {
          localStorage.setItem('refresh_token', registerData.refreshToken);
        }
        if (typeof document !== 'undefined') {
          document.cookie = `auth_token=${token}; Path=/; Max-Age=86400`;
        }
      }
      
      // Step 2: Get user info
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
      
      // Extract roles from JWT token
      const tokenData = decodeJWT(registerData.accessToken);
      const roles = tokenData?.roles || ['USER'];
      
      // Merge user data with roles
      const enrichedUser = {
        ...userData,
        roles,
        role: roles[0] || 'USER', // Add primary role for Navbar
        enabled: true,
        firstName: data.firstName,
        lastName: data.lastName,
      };
      
      // NOTE: Don't save user to localStorage here!
      // Let auth.ts handle saving the properly transformed AuthUser
      
      return {
        ...registerData,
        user: enrichedUser,
      };
    } catch (error: any) {
      console.error('❌ [AuthService] Registration failed:', error);
      throw new Error(error.message || 'Đăng ký thất bại');
    }
  },

  /**
   * Logout
   */
  logout: async (): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${AUTH_API_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_user');
      if (typeof document !== 'undefined') {
        document.cookie = 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'auth_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  },

  /**
   * Get current user
   */
  getCurrentUser: async (): Promise<UserResponse> => {
    const token = localStorage.getItem('auth_token');
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
   * Get user role from stored user data
   */
  getUserRole: (): string | null => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      
      const user: UserResponse = JSON.parse(userStr);
      if (!user.roles || user.roles.length === 0) return null;
      
      // Return first role and remove 'ROLE_' prefix
      // Example: 'ROLE_ADMIN' -> 'admin'
      return user.roles[0].replace('ROLE_', '').toLowerCase();
    } catch {
      return null;
    }
  },

  /**
   * Get stored user
   */
  getStoredUser: (): UserResponse | null => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },
};
