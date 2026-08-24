/**
 * Matching Service API
 * Tích hợp với matching-service backend để lấy matching scores
 */

import { apiRequest } from '@/lib/api-config';

// Generic API call function
async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    return await apiRequest<T>(endpoint, options);
  } catch (error) {
    console.error(`Matching API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// Types
export interface MatchingScore {
  opportunityId: string;
  applicantId: string | null;
  matchingScore: number; // 0-100
  scoreType?: 'RULE_COMPATIBILITY' | 'HYBRID_RANKING';
  modelVersion?: string | null;
  corpusVersion?: string | null;
}

export interface RecommendationMetadata {
  total: number;
  page: number;
  limit: number;
}

export interface RecommendationResponse {
  metadata: RecommendationMetadata;
  data: MatchingScore[];
}

/**
 * Get scholarship recommendations for current user (applicant)
 */
export const getRecommendationsForApplicant = async (
  applicantId: string,
  limit: number = 10,
  page: number = 1
): Promise<RecommendationResponse> => {
  return apiCall<RecommendationResponse>(
    `/api/v1/recommendations/applicant/${applicantId}?limit=${limit}&page=${page}`
  );
};

/**
 * Get matching score for a specific applicant-opportunity pair
 */
export const getMatchingScore = async (
  applicantId: string,
  opportunityId: string
): Promise<{
  overallScore: number;
  breakdown: any;
  scoreType: 'RULE_COMPATIBILITY';
  modelVersion?: string | null;
  corpusVersion?: string | null;
}> => {
  return apiCall(
    `/api/v1/match/score`,
    {
      method: 'POST',
      body: JSON.stringify({
        applicantId,
        opportunityId
      })
    }
  );
};

/**
 * Batch get matching scores for multiple scholarships (optimized)
 */
export const batchGetMatchingScores = async (
  applicantId: string,
  opportunityIds: string[]
): Promise<Map<string, number>> => {
  try {
    const response = await apiCall<Record<string, number>>(
      `/api/v1/matching/batch-scores`,
      {
        method: 'POST',
        body: JSON.stringify({
          applicantId,
          opportunityIds
        })
      }
    );

    // Convert object to Map
    const scores = new Map<string, number>();
    Object.entries(response).forEach(([opportunityId, score]) => {
      scores.set(opportunityId, score);
    });
    return scores;
  } catch (error) {
    console.error('[MatchingService] Error batch fetching matching scores:', error);
    return new Map();
  }
};

const matchingService = {
  getRecommendationsForApplicant,
  getMatchingScore,
  batchGetMatchingScores,
};

export default matchingService;
