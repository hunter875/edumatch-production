import {
  ApiResponse,
  PaginatedResponse,
  Scholarship,
  Application,
  UserProfile,
  ScholarshipFilters,
  LoginForm,
  SignupForm,
  ProfileForm,
  ScholarshipForm,
  Notification,
  Message,
  Conversation
} from '@/types';
import { API_PREFIX } from '@/lib/api-config';

// API Configuration
// Use relative path for production (works with nginx proxy)
// Or use environment variable if explicitly set for development
const API_BASE_URL = API_PREFIX;

// Request configuration
const defaultOptions: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include cookies for authentication
};

// Helper function to get auth token from in-memory store only
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const { getAccessToken } = require('@/services/auth.service');
    const memToken = getAccessToken();
    if (memToken) return memToken;
  } catch (_) { /* module not available */ }
  // No localStorage fallback — bearer tokens are in memory only
  return null;
};

// Helper function to create authenticated headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
};

// Generic API call function with timeout, FormData support, and standardized errors
const DEFAULT_TIMEOUT_MS = 15000;

async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Detect FormData body — must NOT set Content-Type so browser can add multipart boundary
  const isFormData = options.body instanceof FormData;

  // AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      signal: controller.signal,
      headers: {
        // Only set Content-Type for non-FormData requests
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      const errorMessage = data.message || data.error || data.detail || `HTTP error! status: ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && (error as DOMException).name === 'AbortError') {
      throw new ApiError(`Request timed out after ${DEFAULT_TIMEOUT_MS}ms`, 408, {});
    }
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

/** Standardized API error with status code and response body */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Auth API
export const authApi = {
  // Login user
  login: (credentials: LoginForm) =>
    apiCall<{ user: UserProfile; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  // Register user
  register: (userData: SignupForm) =>
    apiCall<{ user: UserProfile; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  // Logout user
  logout: () =>
    apiCall('/auth/logout', {
      method: 'POST',
    }),

  // Get current user
  me: () =>
    apiCall<UserProfile>('/auth/me'),

  // Verify email
  verifyEmail: (token: string) =>
    apiCall('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  // Reset password
  requestPasswordReset: (email: string) =>
    apiCall('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Reset password with token
  resetPassword: (token: string, password: string) =>
    apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
};

// Users API
export const usersApi = {
  // Get user profile
  getProfile: (userId?: string) =>
    apiCall<UserProfile>(userId ? `/users/${userId}` : '/users/profile'),

  // Update user profile
  updateProfile: (profileData: Partial<ProfileForm>) =>
    apiCall<UserProfile>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  // Upload avatar
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);

    // apiCall auto-detects FormData and skips Content-Type header
    return apiCall<{ avatarUrl: string }>('/users/avatar', {
      method: 'POST',
      body: formData,
    });
  },

  // Delete account
  deleteAccount: () =>
    apiCall('/users/account', {
      method: 'DELETE',
    }),
};

// Scholarships API
export const scholarshipsApi = {
  // Get scholarships with filters and pagination
  getScholarships: (filters?: ScholarshipFilters, page = 1, limit = 20) => {
    const searchParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }
    
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    
    return apiCall<PaginatedResponse<Scholarship>>(`/v1/scholarships?${searchParams.toString()}`);
  },

  // Get scholarship by ID
  getScholarship: (id: string) =>
    apiCall<Scholarship>(`/v1/scholarships/${id}`),

  // Create scholarship (provider only)
  createScholarship: (scholarshipData: ScholarshipForm) =>
    apiCall<Scholarship>('/v1/scholarships', {
      method: 'POST',
      body: JSON.stringify(scholarshipData),
    }),

  // Update scholarship (provider only)
  updateScholarship: (id: string, scholarshipData: Partial<ScholarshipForm>) =>
    apiCall<Scholarship>(`/v1/scholarships/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(scholarshipData),
    }),

  // Delete scholarship (provider only)
  deleteScholarship: (id: string) =>
    apiCall(`/v1/scholarships/${id}`, {
      method: 'DELETE',
    }),

  // Get scholarship recommendations
  getRecommendations: (limit = 10) =>
    apiCall<Scholarship[]>(`/scholarships/recommendations?limit=${limit}`),

  // Save/bookmark scholarship
  saveScholarship: (scholarshipId: string) =>
    apiCall(`/v1/me/bookmarks/${scholarshipId}`, {
      method: 'PUT',
    }),

  // Unsave scholarship
  unsaveScholarship: (scholarshipId: string) =>
    apiCall(`/v1/me/bookmarks/${scholarshipId}`, {
      method: 'DELETE',
    }),

  // Get saved scholarships
  getSavedScholarships: (page = 1, limit = 20) =>
    apiCall<PaginatedResponse<Scholarship>>(`/v1/me/bookmarks?page=${Math.max(page - 1, 0)}&size=${limit}`),
};

// Applications API
export const applicationsApi = {
  // Get user's applications
  getApplications: (page = 1, limit = 20) =>
    apiCall<PaginatedResponse<Application>>(`/v1/me/applications?page=${Math.max(page - 1, 0)}&size=${limit}`),

  // Get application by ID
  getApplication: (id: string) =>
    apiCall<Application>(`/applications/${id}`),

  // Create application
  createApplication: (scholarshipId: string, applicationData: any) =>
    apiCall<Application>('/v1/applications', {
      method: 'POST',
      headers: {
        'Idempotency-Key': `application-${scholarshipId}`,
      },
      body: JSON.stringify({
        opportunityId: Number(scholarshipId),
        ...applicationData,
      }),
    }),

  // Update application
  updateApplication: (id: string, applicationData: any) =>
    apiCall<Application>(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(applicationData),
    }),

  // Submit application
  submitApplication: (id: string) =>
    apiCall<Application>(`/applications/${id}/submit`, {
      method: 'POST',
    }),

  // Withdraw application
  withdrawApplication: (id: string) =>
    apiCall<Application>(`/applications/${id}/withdraw`, {
      method: 'POST',
    }),

  // Upload application document
  uploadDocument: (applicationId: string, file: File, documentType: string) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', documentType);

    // apiCall auto-detects FormData and skips Content-Type header
    return apiCall<{ url: string }>(`/applications/${applicationId}/documents`, {
      method: 'POST',
      body: formData,
    });
  },

  // Get scholarship applications (for providers)
  getScholarshipApplications: (scholarshipId: string, page = 1, limit = 20) =>
    apiCall<PaginatedResponse<Application>>(`/v1/provider/scholarships/${scholarshipId}/applications?page=${Math.max(page - 1, 0)}&size=${limit}`),

  // Update application status (for providers)
  updateApplicationStatus: (applicationId: string, status: string, feedback?: string) =>
    apiCall<Application>(`/v1/provider/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, feedback }),
    }),
};

// Notifications API
export const notificationsApi = {
  // Get notifications
  getNotifications: (page = 1, limit = 20) =>
    apiCall<PaginatedResponse<Notification>>(`/notifications?page=${page}&limit=${limit}`),

  // Mark notification as read
  markAsRead: (id: string) =>
    apiCall(`/notifications/${id}/read`, {
      method: 'PUT',
    }),

  // Mark all notifications as read
  markAllAsRead: () =>
    apiCall('/notifications/read-all', {
      method: 'PUT',
    }),

  // Delete notification
  deleteNotification: (id: string) =>
    apiCall(`/notifications/${id}`, {
      method: 'DELETE',
    }),

  // Get unread count
  getUnreadCount: () =>
    apiCall<{ count: number }>('/notifications/unread-count'),
};

// Messages API
// @deprecated Use frontend/src/services/chat.service.ts. These legacy helpers are
// kept only for old code paths and should not be used in new screens.
export const messagesApi = {
  // Get conversations through canonical chat API.
  getConversations: (page = 1, limit = 20) =>
    apiCall<Conversation[]>(`/v1/chat/conversations?page=${Math.max(page - 1, 0)}&size=${limit}`),

  // Get conversation messages through canonical chat API.
  getMessages: (conversationId: string, page = 1, limit = 50) =>
    apiCall<PaginatedResponse<Message>>(`/v1/chat/conversations/${conversationId}/messages?page=${Math.max(page - 1, 0)}&size=${limit}`),

  // Legacy helper cannot infer receiverId from conversationId. Use chatService.sendMessage.
  sendMessage: () => Promise.reject(new Error('messagesApi.sendMessage is deprecated. Use services/chat.service.ts sendMessage({ receiverId, content }).')),

  // Conversation creation happens lazily when the first real message is sent.
  createConversation: (participantId: string) =>
    Promise.reject(new Error(`messagesApi.createConversation is deprecated for participant ${participantId}. Use chatService.sendMessage with real content.`)),

  // Read receipts are not implemented in chat-service yet.
  markAsRead: (conversationId: string) =>
    Promise.reject(new Error(`messagesApi.markAsRead is not implemented for conversation ${conversationId}.`)),
};

// Admin API
export const adminApi = {
  // Get users (admin only)
  getUsers: (page = 1, limit = 20, filters?: any) => {
    const searchParams = new URLSearchParams();
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return apiCall<PaginatedResponse<UserProfile>>(`/admin/users?${searchParams.toString()}`);
  },

  // Get scholarships (admin only)
  getAllScholarships: (page = 1, limit = 20, filters?: any) => {
    const searchParams = new URLSearchParams();
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return apiCall<PaginatedResponse<Scholarship>>(`/admin/scholarships?${searchParams.toString()}`);
  },

  // Update user status
  updateUserStatus: (userId: string, status: string) =>
    apiCall(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // Get analytics
  getAnalytics: () =>
    apiCall('/admin/analytics'),
};

// Export all APIs
export const api = {
  auth: authApi,
  users: usersApi,
  scholarships: scholarshipsApi,
  applications: applicationsApi,
  notifications: notificationsApi,
  messages: messagesApi,
  admin: adminApi,
};

export default api;
