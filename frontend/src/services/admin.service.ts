/**
 * Admin Service API
 * Tích hợp với auth-service backend cho admin panel
 */

import { API_ROOT, getAuthHeaders, getAuthToken } from '@/lib/api-config';

const API_BASE_URL = API_ROOT;

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
  document.cookie = 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'auth_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  window.location.href = `/auth/login?redirect=${redirect}`;
};

// Generic API call function
async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('NO_AUTH_TOKEN');
    }

    const headers = getAuthHeaders();
    
    console.log(`[AdminService] Calling API: ${url}`, {
      method: options.method || 'GET',
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
      headers: Object.keys(headers)
    });

    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies for CORS
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    console.log(`[AdminService] Response status: ${response.status}`, {
      url,
      ok: response.ok,
      statusText: response.statusText
    });

    if (!response.ok) {
      if (response.status === 401) {
        redirectToLogin();
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }

      let errorData: any = {};
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : {};
      } catch (e) {
        // If response is not JSON, use status text
        errorData = { message: response.statusText };
      }
      
      const fallbackByStatus: Record<number, string> = {
        400: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại dữ liệu.',
        403: 'Bạn không có quyền thực hiện thao tác này.',
        404: 'Không tìm thấy dữ liệu yêu cầu.',
        409: 'Dữ liệu đã thay đổi hoặc bị trùng. Vui lòng tải lại trang.',
        429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
        500: 'Server đang gặp lỗi. Vui lòng thử lại sau.',
      };
      const errorMessage = errorData.message || errorData.error || fallbackByStatus[response.status] || `Request failed with status ${response.status}`;
      console.error(`[AdminService] API error for ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    const text = await response.text();
    if (text) {
      try {
        return JSON.parse(text) as T;
      } catch {
        return {} as T;
      }
    }
    return {} as T;
  } catch (error: any) {
    if (error.message === 'NO_AUTH_TOKEN') {
      redirectToLogin();
      throw new Error('Bạn cần đăng nhập admin trước khi xem trang này.');
    }

    console.error(`[AdminService] API call failed for ${endpoint}:`, {
      url,
      error: error.message,
      stack: error.stack
    });
    
    // Provide more helpful error messages
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo server đang chạy.');
    }
    
    throw error;
  }
}

// Types
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  sex?: string;
  organizationId?: number;
  enabled: boolean;
  status?: string;
  subscriptionType?: string;
  roles: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalEmployers: number;
  totalAdmins: number;
  activeUsers: number;
  inactiveUsers: number;
  totalScholarships: number;
  activeScholarships: number;
  pendingScholarships: number;
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
}

export interface AdminUserGrowthPoint {
  month: string;
  users: number;
  applicants: number;
  providers: number;
}

export interface AdminTopScholarship {
  id: number;
  title: string;
  applications: number;
  views: number;
  conversionRate: number;
}

export interface AdminAnalyticsResponse {
  stats: AdminStats;
  userGrowth: AdminUserGrowthPoint[];
  subscriptionBreakdown: {
    premium: number;
    free: number;
    premiumPercentage: number;
    freePercentage: number;
  };
  scholarshipBreakdown: {
    active: number;
    pending: number;
    expired: number;
  };
  applicationStats: {
    pending: number;
    accepted: number;
    rejected: number;
    averageApplicationsPerScholarship: number;
    acceptanceRate: number;
  };
  topScholarships: AdminTopScholarship[];
}

export interface PaginatedResponse<T> {
  [key: string]: T[] | number;
  currentPage: number;
  totalItems: number;
  totalPages: number;
  pageSize: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationId?: number;
}

export interface AdminScholarship {
  id: number;
  title: string;
  description?: string;
  amount?: number;
  type?: string;
  status?: string;
  moderationStatus?: string;
  applicationDeadline?: string;
  location?: string;
  university?: string;
  department?: string;
  creatorUserId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminApplication {
  id: number;
  applicantUserId: number;
  applicantUserName?: string;
  applicantEmail?: string;
  opportunityId: number;
  opportunityTitle?: string; // Thêm title của opportunity
  status: string;
  gpa?: number;
  coverLetter?: string;
  motivation?: string;
  phone?: string;
  submittedAt?: string; // Dùng submittedAt thay vì createdAt
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminEmployerRequest {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  organizationName: string;
  description: string;
  organizationType: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  city: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEmployerRequestsResponse {
  requests: AdminEmployerRequest[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
  pageSize: number;
}

export interface SpringPageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

const unwrapData = <T = any>(response: any): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data as T;
  }
  return response as T;
};

const toSpringPage = <T = any>(response: any): SpringPageResponse<T> => {
  if (response?.page && Array.isArray(response.data)) {
    return {
      content: response.data,
      totalElements: response.page.totalElements ?? response.data.length,
      totalPages: response.page.totalPages ?? 1,
      size: response.page.size ?? response.data.length,
      number: response.page.number ?? 0,
      first: (response.page.number ?? 0) === 0,
      last: (response.page.number ?? 0) >= ((response.page.totalPages ?? 1) - 1),
    };
  }
  return response as SpringPageResponse<T>;
};

// Admin Service API
export const adminService = {
  /**
   * Lấy thống kê tổng quan cho admin dashboard
   * GET /api/admin/stats
   */
  getStats: async (): Promise<AdminStats> => {
    return apiCall<AdminStats>('/api/admin/stats');
  },

  /**
   * Aggregated analytics without downloading raw users/scholarships/applications.
   * GET /api/admin/analytics
   */
  getAnalytics: async (): Promise<AdminAnalyticsResponse> => {
    return apiCall<AdminAnalyticsResponse>('/api/admin/analytics');
  },

  /**
   * Lấy danh sách users với filter và pagination
   * GET /api/admin/users
   */
  getUsers: async (params?: {
    page?: number;
    size?: number;
    role?: string;
    enabled?: boolean;
    keyword?: string;
  }): Promise<PaginatedResponse<AdminUser>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.page !== undefined) searchParams.append('page', params.page.toString());
      if (params.size !== undefined) searchParams.append('size', params.size.toString());
      if (params.role) searchParams.append('role', params.role);
      if (params.enabled !== undefined) searchParams.append('enabled', params.enabled.toString());
      if (params.keyword) searchParams.append('keyword', params.keyword);
    }
    
    const queryString = searchParams.toString();
    return apiCall<PaginatedResponse<AdminUser>>(`/api/admin/users${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Lấy chi tiết một user
   * GET /api/admin/users/{id}
   */
  getUserById: async (id: number): Promise<AdminUser> => {
    return apiCall<AdminUser>(`/api/admin/users/${id}`);
  },

  /**
   * Tạo user mới
   * POST /api/admin/create-user
   */
  createUser: async (request: CreateUserRequest): Promise<{ success: boolean; message: string }> => {
    return apiCall('/api/admin/create-user', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Tạo employer mới
   * POST /api/admin/create-employer
   */
  createEmployer: async (request: CreateUserRequest): Promise<{ success: boolean; message: string }> => {
    return apiCall('/api/admin/create-employer', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Xóa user
   * DELETE /api/admin/users/{id}
   */
  deleteUser: async (id: number): Promise<{ success: boolean; message: string }> => {
    return apiCall(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Toggle user status (lock/unlock)
   * PATCH /api/admin/users/{id}/toggle-status
   */
  toggleUserStatus: async (id: number): Promise<{ success: boolean; message: string }> => {
    return apiCall(`/api/admin/users/${id}/toggle-status`, {
      method: 'PATCH',
    });
  },

  /**
   * Lấy danh sách scholarships (opportunities) với pagination
   * GET /api/v1/admin/scholarships
   */
  getScholarships: async (params?: {
    page?: number;
    size?: number;
    status?: string;
    keyword?: string;
  }): Promise<SpringPageResponse<AdminScholarship>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.page !== undefined) searchParams.append('page', params.page.toString());
      if (params.size !== undefined) searchParams.append('size', params.size.toString());
      if (params.status) searchParams.append('status', params.status);
      if (params.keyword) searchParams.append('keyword', params.keyword);
    }
    
    const queryString = searchParams.toString();
    return toSpringPage<AdminScholarship>(
      await apiCall<any>(`/api/v1/admin/scholarships${queryString ? `?${queryString}` : ''}`)
    );
  },

  /**
   * Duyệt hoặc từ chối scholarship
   * PATCH /api/v1/admin/scholarships/{id}/moderation
   */
  moderateScholarship: async (id: number, status: 'APPROVED' | 'REJECTED'): Promise<AdminScholarship> => {
    return unwrapData<AdminScholarship>(await apiCall<any>(`/api/v1/admin/scholarships/${id}/moderation`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }));
  },

  /**
   * Lấy chi tiết một scholarship (cho phép xem cả PENDING)
   * GET /api/v1/admin/scholarships/{id}
   */
  getScholarshipById: async (id: number): Promise<any> => {
    const token = getAuthToken();
    console.log('[AdminService] getScholarshipById - Token check:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? `${token.substring(0, 30)}...` : 'none',
      id
    });
    return unwrapData<any>(await apiCall<any>(`/api/v1/admin/scholarships/${id}`));
  },

  /**
   * Xóa scholarship (admin only)
   * DELETE /api/v1/admin/scholarships/{id}
   */
  deleteScholarship: async (id: number): Promise<{ success: boolean; message: string }> => {
    await apiCall(`/api/v1/admin/scholarships/${id}`, {
      method: 'DELETE',
    });
    return { success: true, message: 'Scholarship deleted successfully' };
  },

  /**
   * Lấy danh sách applications với filter và pagination
   * GET /api/v1/admin/applications
   */
  getApplications: async (params?: {
    page?: number;
    size?: number;
    status?: string;
    opportunityId?: number;
    keyword?: string;
  }): Promise<SpringPageResponse<AdminApplication>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.page !== undefined) searchParams.append('page', params.page.toString());
      if (params.size !== undefined) searchParams.append('size', params.size.toString());
      if (params.status) searchParams.append('status', params.status);
      if (params.opportunityId) searchParams.append('opportunityId', params.opportunityId.toString());
      if (params.keyword) searchParams.append('keyword', params.keyword);
    }
    
    const queryString = searchParams.toString();
    return toSpringPage<AdminApplication>(
      await apiCall<any>(`/api/v1/admin/applications${queryString ? `?${queryString}` : ''}`)
    );
  },

  /**
   * Lấy chi tiết một application
   * GET /api/v1/admin/applications/{id}
   */
  getApplicationById: async (id: number): Promise<AdminApplication> => {
    return unwrapData<AdminApplication>(await apiCall<any>(`/api/v1/admin/applications/${id}`));
  },

  /**
   * Admin cập nhật trạng thái application (Accept/Reject/Under Review)
   * PATCH /api/v1/admin/applications/{id}/status
   */
  updateApplicationStatus: async (id: number, status: 'ACCEPTED' | 'REJECTED' | 'UNDER_REVIEW' | 'PENDING'): Promise<AdminApplication> => {
    return unwrapData<AdminApplication>(await apiCall<any>(`/api/v1/admin/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }));
  },

  /**
   * Lay danh sach employer/organization requests voi pagination.
   * GET /api/admin/employer/requests
   */
  getEmployerRequests: async (params?: {
    page?: number;
    size?: number;
    status?: string;
  }): Promise<AdminEmployerRequestsResponse> => {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
      if (params.page !== undefined) searchParams.append('page', params.page.toString());
      if (params.size !== undefined) searchParams.append('size', params.size.toString());
    }

    const queryString = searchParams.toString();
    return apiCall<AdminEmployerRequestsResponse>(`/api/admin/employer/requests${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Approve employer/organization request.
   * PUT /api/admin/employer/requests/{id}/approve
   */
  approveEmployerRequest: async (id: number): Promise<AdminEmployerRequest> => {
    const response = await apiCall<any>(`/api/admin/employer/requests/${id}/approve`, {
      method: 'PUT',
    });
    return unwrapData<AdminEmployerRequest>(response);
  },

  /**
   * Reject employer/organization request.
   * PUT /api/admin/employer/requests/{id}/reject
   */
  rejectEmployerRequest: async (id: number, reason: string): Promise<AdminEmployerRequest> => {
    const response = await apiCall<any>(`/api/admin/employer/requests/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
    return unwrapData<AdminEmployerRequest>(response);
  },
};

export default adminService;
