/**
 * Scholarship Service API
 * Tích hợp với scholarship-service backend
 */

import { 
  PaginatedResponse, 
  Scholarship, 
  Application 
} from '@/types';
import { apiRequest, buildRepeatedQueryParam } from '@/lib/api-config';

// API Base URL - sử dụng gateway (port 8080)
// Gateway chạy ở http://localhost:8080, endpoint đã có /api/ prefix
// Generic API call function
async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    return await apiRequest<T>(endpoint, options);
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// Scholarship Filters Interface
export interface ScholarshipSearchFilters {
  q?: string; // Search query
  gpa?: number; // Minimum GPA
  studyMode?: string; // FULL_TIME, PART_TIME, ONLINE, HYBRID
  level?: string; // UNDERGRADUATE, MASTER, PHD, etc.
  isPublic?: boolean;
  currentDate?: string; // YYYY-MM-DD
  page?: number;
  size?: number;
  sort?: string;
}

// Application Request Interface
export interface CreateApplicationRequest {
  opportunityId: number; // BE expects opportunityId, not scholarshipId
  documents?: Array<{
    documentName: string;
    documentUrl: string;
  }>;
  // Additional fields from FE form
  applicantUserName?: string;
  applicantEmail?: string;
  phone?: string;
  gpa?: number;
  coverLetter?: string;
  motivation?: string;
  additionalInfo?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
}

// Create Opportunity Request Interface (for Employer)
export interface CreateOpportunityRequest {
  title: string;
  fullDescription: string;
  applicationDeadline: string; // ISO date string (YYYY-MM-DD)
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string | null; // ISO date string (YYYY-MM-DD) or null
  scholarshipAmount: number;
  fundingType?: string | null;
  minGpa?: number | null;
  studyMode: string; // FULL_TIME, PART_TIME, ONLINE, HYBRID
  level: string; // UNDERGRADUATE, MASTER, PHD, POSTDOC, RESEARCH
  isPublic: boolean;
  contactEmail?: string;
  website?: string | null;
  sourceUrl?: string | null;
  eligibleMajors?: string[];
  eligibleNationalities?: string[];
  tags?: string[]; // Array of tag names
  requiredSkills?: string[]; // Array of skill names
}

export interface ProviderDashboardApplication {
  id: number | string;
  studentName?: string | null;
  studentEmail?: string | null;
  scholarshipId: number | string;
  scholarshipTitle: string;
  appliedDate?: string | Date | null;
  status: string;
  gpa?: number | string | null;
}

export interface ProviderDashboardDeadline {
  id: number | string;
  title: string;
  deadline?: string | null;
  applicationsCount: number;
  daysLeft: number;
}

export interface ProviderScholarshipPerformance {
  id: number | string;
  title: string;
  applications: number;
  accepted: number;
  rejected: number;
  pending: number;
  views?: number;
  acceptanceRate: number;
}

export interface ProviderMonthlyStat {
  month: string;
  applications: number;
  accepted: number;
  rejected: number;
  pending: number;
}

export interface ProviderAnalyticsResponse {
  stats: {
    totalScholarships: number;
    activeScholarships: number;
    pendingScholarships: number;
    totalApplications: number;
    acceptedApplications: number;
    rejectedApplications: number;
    pendingApplications: number;
    applicationsThisWeek?: number;
    totalFunding: number | string;
    averageApplicationsPerScholarship: number;
    acceptanceRate: number;
  };
  recentApplications: ProviderDashboardApplication[];
  upcomingDeadlines: ProviderDashboardDeadline[];
  scholarshipPerformance: ProviderScholarshipPerformance[];
  monthlyStats: ProviderMonthlyStat[];
  topUniversities: Array<{ name: string; applications: number; percentage: number }>;
  topMajors: Array<{ name: string; applications: number; percentage: number }>;
}

/**
 * Transform backend DTO to frontend Scholarship type
 * Backend field names → Frontend field names
 */
const _transformOpportunity = (item: any): Scholarship => {
  return {
    id: item.id,
    providerId: item.creatorUserId || item.providerId, // creatorUserId → providerId
    providerName: item.provider?.fullName || item.providerName || '',
    title: item.title,
    description: item.fullDescription || item.description, // fullDescription → description
    amount: item.scholarshipAmount || item.amount, // scholarshipAmount → amount
    type: item.level || item.type, // level → type
    status: item.moderationStatus || item.status, // moderationStatus → status
    applicationDeadline: item.applicationDeadline,
    location: item.location || '',
    university: item.university || '',
    department: item.department || '',
    duration: item.durationMonths || item.duration || 0, // durationMonths → duration
    isRemote: item.studyMode === 'ONLINE' || item.studyMode === 'HYBRID' || item.isRemote, // studyMode → isRemote
    minGpa: item.minGpa ?? null,
    requirements: {
      minGpa: item.minGpa,
      englishProficiency: item.englishProficiency,
      documents: item.requiredDocuments || [],
    },
    requiredSkills: item.requiredSkills || [],
    preferredSkills: item.preferredSkills || [],
    viewCount: item.viewsCnt || item.viewCount || 0, // viewsCnt → viewCount
    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    
    // Optional fields
    tags: item.tags || [],
    website: item.website,
    sourceUrl: item.sourceUrl,
    fundingType: item.fundingType,
    eligibleMajors: item.eligibleMajors || [],
    eligibleNationalities: item.eligibleNationalities || [],
    opportunityVersion: item.opportunityVersion,
    contactEmail: item.contactEmail,
    isPublic: item.isPublic,
    matchScore: item.matchScore,
    startDate: item.startDate,
    endDate: item.endDate,
    level: item.level,
    studyMode: item.studyMode,
    moderationStatus: item.moderationStatus,
    scholarshipAmount: item.scholarshipAmount,
    currency: item.currency,
  };
};

const unwrapData = <T = any>(response: any): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data as T;
  }
  return response as T;
};

const unwrapList = <T = any>(response: any): T[] => {
  const data = unwrapData<any>(response);
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(response?.content)) return response.content as T[];
  return [];
};

const createIdempotencyKey = (scope: string, payload: unknown) => {
  const raw = `${scope}:${JSON.stringify(payload)}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `${scope}-${Math.abs(hash).toString(16)}`;
};

// Scholarship Service API
export const scholarshipServiceApi = {
  /**
   * Tìm kiếm và lọc scholarships (opportunities)
   * GET /api/v1/scholarships
   */
  getScholarships: async (filters?: ScholarshipSearchFilters) => {
    const searchParams = new URLSearchParams();
    
    if (filters) {
      if (filters.q) searchParams.append('q', filters.q);
      if (filters.gpa !== undefined) searchParams.append('gpa', filters.gpa.toString());
      if (filters.studyMode) searchParams.append('studyMode', filters.studyMode);
      if (filters.level) searchParams.append('level', filters.level);
      if (filters.isPublic !== undefined) searchParams.append('isPublic', filters.isPublic.toString());
      if (filters.currentDate) searchParams.append('currentDate', filters.currentDate);
      if (filters.page !== undefined) searchParams.append('page', filters.page.toString());
      if (filters.size !== undefined) searchParams.append('size', filters.size.toString());
      if (filters.sort) searchParams.append('sort', filters.sort);
    }
    
    const queryString = searchParams.toString();
    const response = await apiCall<any>(`/api/v1/scholarships${queryString ? `?${queryString}` : ''}`);
    
    // Backend may return different response structures
    // Handle both paginated (content/data) and array responses
    if (Array.isArray(response)) {
      return {
        data: response.map(_transformOpportunity),
        total: response.length,
        page: 0,
        limit: response.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      } as PaginatedResponse<Scholarship>;
    }
    
    // Handle Spring Boot PageImpl structure
    const content = response.content || response.data || [];
    const page = response.page || {};
    return {
      data: content.map(_transformOpportunity),
      total: page.totalElements || response.totalElements || response.total || content.length,
      page: page.number !== undefined ? page.number : (response.number !== undefined ? response.number : 0),
      limit: page.size || response.size || response.limit || content.length,
      totalPages: page.totalPages || response.totalPages || Math.ceil((page.totalElements || response.totalElements || response.total || content.length) / (page.size || response.size || response.limit || content.length || 1)),
      hasNextPage: !response.last && response.last !== undefined ? !response.last : (response.hasNextPage || false),
      hasPrevPage: !response.first && response.first !== undefined ? !response.first : (response.hasPrevPage || false),
    } as PaginatedResponse<Scholarship>;
  },

  /**
   * Lấy chi tiết một scholarship (opportunity)
   * GET /api/v1/scholarships/{id}
   */
  getScholarshipById: async (id: string | number) => {
    const response = await apiCall<any>(`/api/v1/scholarships/${id}`);
    const detail = unwrapData<any>(response);
    
    // Backend may return { opportunity: ... } or just the opportunity object
    const opportunityData = detail.opportunity || detail;
    
    return {
      opportunity: _transformOpportunity(opportunityData),
      matchScore: detail.matchScore,
    };
  },

  /**
   * Tạo application (nộp đơn)
   * POST /api/v1/applications
   */
  createApplication: async (request: CreateApplicationRequest) => {
    return unwrapData<Application>(await apiCall<any>('/api/v1/applications', {
      method: 'POST',
      headers: {
        'Idempotency-Key': createIdempotencyKey('application', request),
      },
      body: JSON.stringify(request),
    }));
  },

  /**
   * Lấy danh sách applications của user hiện tại
   * GET /api/v1/me/applications
   */
  getMyApplications: async () => {
    return unwrapList<Application>(await apiCall<any>('/api/v1/me/applications'));
  },

  /**
   * Batch check applied status for visible opportunities.
   * GET /api/v1/me/application-statuses?opportunityIds=1&opportunityIds=2
   */
  getMyApplicationStatuses: async (opportunityIds: Array<string | number>) => {
    if (opportunityIds.length === 0) return {};
    const query = buildRepeatedQueryParam('opportunityIds', opportunityIds);
    return unwrapData<Record<string, boolean>>(await apiCall<any>(`/api/v1/me/application-statuses?${query}`));
  },

  /**
   * Lấy danh sách applications cho một opportunity (Employer only)
   * GET /api/v1/provider/scholarships/{opportunityId}/applications
   */
  getApplicationsForOpportunity: async (opportunityId: string | number) => {
    return unwrapList<Application>(await apiCall<any>(`/api/v1/provider/scholarships/${opportunityId}/applications`));
  },

  /**
   * Láº¥y táº¥t cáº£ applications cho employer hiá»‡n táº¡i trong má»™t request.
   * GET /api/v1/provider/applications
   */
  getProviderApplications: async () => {
    return unwrapList<Application>(await apiCall<any>('/api/v1/provider/applications'));
  },

  /**
   * Cập nhật trạng thái application (Employer only)
   * PATCH /api/v1/provider/applications/{applicationId}/status
   */
  updateApplicationStatus: async (applicationId: string | number, status: string) => {
    return unwrapData<Application>(await apiCall<any>(`/api/v1/provider/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }));
  },

  /**
   * Save bookmark.
   * PUT /api/v1/me/bookmarks/{opportunityId}
   */
  saveBookmark: async (opportunityId: string | number) => {
    return unwrapData<{ bookmarked: boolean }>(await apiCall<any>(`/api/v1/me/bookmarks/${opportunityId}`, {
      method: 'PUT',
    }));
  },

  /**
   * Remove bookmark.
   * DELETE /api/v1/me/bookmarks/{opportunityId}
   */
  removeBookmark: async (opportunityId: string | number) => {
    return unwrapData<{ bookmarked: boolean }>(await apiCall<any>(`/api/v1/me/bookmarks/${opportunityId}`, {
      method: 'DELETE',
    }));
  },

  toggleBookmark: async (opportunityId: string | number, shouldBookmark = true) => {
    return shouldBookmark
      ? scholarshipServiceApi.saveBookmark(opportunityId)
      : scholarshipServiceApi.removeBookmark(opportunityId);
  },

  /**
   * Lấy danh sách bookmarks của user hiện tại
   * GET /api/v1/me/bookmarks
   */
  getMyBookmarks: async () => {
    return unwrapList<{
      id: number;
      applicantUserId: number;
      opportunity: Scholarship;
    }>(await apiCall<any>('/api/v1/me/bookmarks'));
  },

  /**
   * Batch check bookmark status for visible opportunities.
   * GET /api/v1/me/bookmark-statuses?opportunityIds=1&opportunityIds=2
   */
  getMyBookmarkStatuses: async (opportunityIds: Array<string | number>) => {
    if (opportunityIds.length === 0) return {};
    const query = buildRepeatedQueryParam('opportunityIds', opportunityIds);
    return unwrapData<Record<string, boolean>>(await apiCall<any>(`/api/v1/me/bookmark-statuses?${query}`));
  },

  // ============================================
  // EMPLOYER CRUD OPERATIONS
  // ============================================

  /**
   * Tạo học bổng mới (Employer only)
   * POST /api/v1/scholarships
   */
  createOpportunity: async (request: CreateOpportunityRequest) => {
    return unwrapData<Scholarship>(await apiCall<any>('/api/v1/scholarships', {
      method: 'POST',
      body: JSON.stringify(request),
    }));
  },

  /**
   * Lấy danh sách học bổng của employer hiện tại
   * GET /api/v1/provider/scholarships
   */
  getMyOpportunities: async () => {
    return unwrapList<Scholarship>(await apiCall<any>('/api/v1/provider/scholarships'));
  },

  /**
   * Provider analytics aggregate endpoint.
   * GET /api/v1/provider/analytics
   */
  getProviderAnalytics: async () => {
    return unwrapData<ProviderAnalyticsResponse>(await apiCall<any>('/api/v1/provider/analytics'));
  },

  /**
   * Cập nhật học bổng (Employer only)
   * PATCH /api/v1/scholarships/{id}
   */
  updateOpportunity: async (id: string | number, request: CreateOpportunityRequest) => {
    return unwrapData<Scholarship>(await apiCall<any>(`/api/v1/scholarships/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    }));
  },

  /**
   * Xóa học bổng (Employer only)
   * DELETE /api/v1/scholarships/{id}
   */
  deleteOpportunity: async (id: string | number) => {
    return apiCall(`/api/v1/scholarships/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Tăng view count khi user xem chi tiết scholarship
   * POST /api/scholarships/{id}/view
   */
  incrementViewCount: async (id: string | number) => {
    try {
      return apiCall<void>(`/api/scholarships/${id}/view`, {
        method: 'POST',
      });
    } catch (error) {
      console.debug('Failed to increment view count:', error);
      // Không throw error - view count là optional feature
    }
  },
};

export default scholarshipServiceApi;
