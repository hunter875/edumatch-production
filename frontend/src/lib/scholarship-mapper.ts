/**
 * Utility functions to map backend DTOs to frontend types
 */

import { Scholarship } from '@/types';

/**
 * Calculate duration in months from start and end dates
 */
function calculateDuration(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 0;
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                   (end.getMonth() - start.getMonth());
    return Math.max(0, months);
  } catch {
    return 0;
  }
}

/**
 * Map backend OpportunityDto to frontend Scholarship type
 * Backend uses description field which contains fullDescription from entity
 */
export function mapOpportunityDtoToScholarship(opportunity: any): Scholarship {
  const startDate = opportunity.startDate || undefined;
  const endDate = opportunity.endDate || undefined;
  const duration = calculateDuration(startDate, endDate);
  
  // Backend sets description = fullDescription in fromEntity()
  // So we use description as primary, with fallback
  const description = opportunity.description || opportunity.fullDescription || opportunity.title || '';
  
  // Provider name: try organizationName if available (may come from joined query)
  // Otherwise fallback to a generic name based on organizationId
  const providerName = opportunity.organizationName || 
                      (opportunity.organizationId ? `Organization ${opportunity.organizationId}` : 'Unknown Provider');
  
  return {
    id: opportunity.id?.toString() || '',
    providerId: opportunity.organizationId?.toString() || opportunity.creatorUserId?.toString() || '',
    providerName: providerName,
    title: opportunity.title || '',
    description: description,
    amount: opportunity.scholarshipAmount ? Number(opportunity.scholarshipAmount) : 0,
    scholarshipAmount: opportunity.scholarshipAmount ? Number(opportunity.scholarshipAmount) : undefined,
    type: opportunity.level || 'UNDERGRADUATE',
    level: opportunity.level || 'UNDERGRADUATE',
    status: opportunity.moderationStatus === 'APPROVED' ? 'PUBLISHED' : 
            opportunity.moderationStatus === 'PENDING' ? 'PENDING' : 
            opportunity.moderationStatus === 'REJECTED' ? 'REJECTED' : 'PUBLISHED',
    moderationStatus: opportunity.moderationStatus || 'PENDING',
    applicationDeadline: opportunity.applicationDeadline ? 
                        (typeof opportunity.applicationDeadline === 'string' ? opportunity.applicationDeadline : 
                         opportunity.applicationDeadline.toString()) : '',
    startDate: startDate,
    endDate: endDate,
    location: opportunity.location || '',
    university: opportunity.university || opportunity.organizationName || providerName,
    department: opportunity.department || '',
    duration: duration,
    isRemote: opportunity.studyMode === 'ONLINE' || opportunity.studyMode === 'HYBRID',
    studyMode: opportunity.studyMode || 'FULL_TIME',
    minGpa: opportunity.minGpa ? Number(opportunity.minGpa) : 0,
    requirements: {
      minGpa: opportunity.minGpa ? Number(opportunity.minGpa) : undefined,
      englishProficiency: undefined,
      documents: []
    },
    requiredSkills: opportunity.requiredSkills || [],
    preferredSkills: opportunity.preferredSkills || [],
    viewCount: opportunity.viewsCnt || 0,
    createdAt: opportunity.createdAt ? new Date(opportunity.createdAt) : new Date(),
    tags: opportunity.tags || [],
    website: opportunity.website || undefined,
    contactEmail: opportunity.contactEmail || undefined,
    isPublic: opportunity.isPublic !== undefined ? opportunity.isPublic : true,
    matchScore: opportunity.matchScore ? Number(opportunity.matchScore) : undefined,
    applicationCount: opportunity.applicationCount ? Number(opportunity.applicationCount) : 0,
    currency: 'USD'
  };
}

/**
 * Map paginated response from backend
 */
export function mapPaginatedOpportunities(response: any): {
  scholarships: Scholarship[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
} {
  const content = response.content || response.data || [];
  const scholarships = Array.isArray(content) 
    ? content.map(mapOpportunityDtoToScholarship)
    : [];

  return {
    scholarships,
    totalElements: response.totalElements || scholarships.length,
    totalPages: response.totalPages || 1,
    currentPage: response.number !== undefined ? response.number + 1 : response.page || 1,
    size: response.size || response.limit || 20
  };
}

/**
 * Map OpportunityDetailDto to Scholarship with matchScore
 */
export function mapOpportunityDetailToScholarship(detail: any): {
  scholarship: Scholarship;
  matchScore?: number;
} {
  const opportunity = detail.opportunity || detail;
  const scholarship = mapOpportunityDtoToScholarship(opportunity);
  
  return {
    scholarship,
    matchScore: detail.matchScore ? Number(detail.matchScore) : undefined
  };
}
