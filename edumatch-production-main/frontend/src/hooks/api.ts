import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '@/lib/api-config';

// Real API hooks

export function useApplications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async (userId?: string) => {
    if (!getAuthToken()) {
      setApplications([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { scholarshipServiceApi } = await import('@/services/scholarship.service');
      const response = await scholarshipServiceApi.getMyApplications();
      
      // Helper to parse date from backend (LocalDateTime can be string or Date)
      const parseDate = (dateValue: any): Date => {
        if (!dateValue) return new Date();
        if (dateValue instanceof Date) return dateValue;
        if (typeof dateValue === 'string') {
          const parsed = new Date(dateValue);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        }
        return new Date();
      };
      
      // Map backend ApplicationDto to frontend Application format
      const mappedApplications = Array.isArray(response) ? response.map((app: any) => {
        const submittedAt = parseDate(app.submittedAt);
        
        return {
          id: app.id?.toString() || '',
          applicantId: app.applicantUserId?.toString() || '',
          applicantUserId: app.applicantUserId, // Keep backend field name
          scholarshipId: app.opportunityId?.toString() || '',
          opportunityId: app.opportunityId?.toString() || '', // Backend field name
          opportunityTitle: app.opportunityTitle || '', // Title from backend
          status: app.status || 'PENDING',
          submittedAt: submittedAt,
          // Map documents - keep full objects and also extract URLs for additionalDocs
          documents: app.documents || [],
          additionalDocs: app.documents?.map((doc: any) => doc.documentUrl || doc.documentName) || [],
          createdAt: submittedAt, // Use submittedAt as createdAt if available
          updatedAt: submittedAt, // Use submittedAt as updatedAt if available
          // Include additional fields from backend ApplicationDto
          applicantUserName: app.applicantUserName,
          applicantEmail: app.applicantEmail,
          phone: app.phone,
          gpa: app.gpa ? Number(app.gpa) : undefined,
          coverLetter: app.coverLetter,
          motivation: app.motivation,
          additionalInfo: app.additionalInfo,
          portfolioUrl: app.portfolioUrl,
          linkedinUrl: app.linkedinUrl,
          githubUrl: app.githubUrl,
        };
      }) : [];
      
      setApplications(mappedApplications);
    } catch (err) {
      setError('Failed to fetch applications');
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitApplication = useCallback(async (data: any) => {
    if (!getAuthToken()) {
      const errorMessage = 'You must be logged in to submit an application';
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    setLoading(true);
    setError(null);
    try {
      const { scholarshipServiceApi } = await import('@/services/scholarship.service');
      
      // Convert scholarshipId to opportunityId (BE uses opportunityId)
      const opportunityId = parseInt(data.scholarshipId || data.opportunityId);
      
      // Handle file upload - create document entry
      const documents: Array<{ documentName: string; documentUrl: string }> = [];
      if (data.cvFile) {
        // TODO: Implement actual file upload to storage service
        // For now, create a placeholder URL
        // In production, upload file to S3/MinIO and get URL
        const fileUrl = data.cvFileUrl || `placeholder://cv/${data.cvFile}`;
        documents.push({
          documentName: data.cvFile,
          documentUrl: fileUrl
        });
      }
      
      // Prepare request matching BE DTO (CreateApplicationRequest)
      const request = {
        opportunityId,
        documents: documents.length > 0 ? documents : undefined,
        applicantUserName: data.applicantUserName,
        applicantEmail: data.applicantEmail,
        phone: data.phone,
        gpa: data.gpa ? Number(data.gpa) : undefined,
        coverLetter: data.coverLetter,
        motivation: data.motivation,
        additionalInfo: data.additionalInfo,
        portfolioUrl: data.portfolioUrl,
        linkedinUrl: data.linkedinUrl,
        githubUrl: data.githubUrl,
      };
      
      const response = await scholarshipServiceApi.createApplication(request);
      
      // Refresh applications list
      await fetchApplications();
      
      return { success: true, data: response };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit application';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchApplications]);

  const withdrawApplication = useCallback(async (id: string) => {
    // Withdraw functionality to be implemented when backend is ready
    return true;
  }, []);

  const checkApplicationStatus = useCallback(async (scholarshipId: string) => {
    if (!getAuthToken()) {
      return { hasApplied: false };
    }

    try {
      const { scholarshipServiceApi } = await import('@/services/scholarship.service');
      const statuses = await scholarshipServiceApi.getMyApplicationStatuses([scholarshipId]);
      return { hasApplied: !!statuses[scholarshipId.toString()] };
    } catch (err) {
      console.error('Error checking application status:', err);
      return { hasApplied: false };
    }
  }, []);

  return {
    applications,
    loading,
    error,
    fetchApplications,
    submitApplication,
    withdrawApplication,
    checkApplicationStatus,
  };
}

export function useScholarships() {
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScholarships = useCallback(async (filters?: any) => {
    setLoading(true);
    setError(null);
    try {
      const { scholarshipServiceApi } = await import('@/services/scholarship.service');
      const { mapPaginatedOpportunities, mapOpportunityDtoToScholarship } = await import('@/lib/scholarship-mapper');
      
      const response: any = await scholarshipServiceApi.getScholarships(filters);
      
      // Handle paginated response - check for scholarships property or data/content
      if (response && typeof response === 'object') {
        if ('scholarships' in response && Array.isArray(response.scholarships)) {
          // Already mapped paginated response
          setScholarships(response.scholarships);
        } else if ('data' in response || 'content' in response) {
          // Raw paginated response from backend
          const mapped = mapPaginatedOpportunities(response);
          setScholarships(mapped.scholarships);
        } else if (Array.isArray(response)) {
          // Direct array response
          setScholarships(response.map((item: any) => mapOpportunityDtoToScholarship(item)));
        } else {
          setScholarships([]);
        }
      } else if (Array.isArray(response)) {
        setScholarships(response.map((item: any) => mapOpportunityDtoToScholarship(item)));
      } else {
        setScholarships([]);
      }
    } catch (err) {
      setError('Failed to fetch scholarships');
      console.error('Error fetching scholarships:', err);
      setScholarships([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchScholarshipById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { scholarshipServiceApi } = await import('@/services/scholarship.service');
      const { mapOpportunityDetailToScholarship } = await import('@/lib/scholarship-mapper');
      
      const response = await scholarshipServiceApi.getScholarshipById(id);
      
      // Response may be { opportunity, matchScore } or just opportunity
      const mapped = mapOpportunityDetailToScholarship(response);
      return mapped.scholarship;
    } catch (err) {
      setError('Failed to fetch scholarship');
      console.error('Error fetching scholarship:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    scholarships,
    loading,
    error,
    fetchScholarships,
    fetchScholarshipById,
  };
}

export function useSavedScholarships() {
  const [savedScholarships, setSavedScholarships] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedScholarships = useCallback(async () => {
    if (!getAuthToken()) {
      setSavedScholarships([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { scholarshipServiceApi } = await import('@/services/scholarship.service');
      const bookmarks = await scholarshipServiceApi.getMyBookmarks();
      
      // Extract opportunity IDs from bookmarks
      // Backend returns BookmarkDto with opportunity field
      const opportunityIds = (Array.isArray(bookmarks) ? bookmarks : []).map((bookmark: any) => 
        bookmark.opportunity?.id?.toString() || 
        bookmark.opportunityId?.toString() ||
        bookmark.id?.toString()
      ).filter(Boolean);
      
      setSavedScholarships(opportunityIds);
    } catch (err) {
      setError('Failed to fetch saved scholarships');
      console.error('Error fetching bookmarks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveScholarship = useCallback(async (scholarshipId: string) => {
    if (!getAuthToken()) {
      setError('You must be logged in to bookmark scholarships');
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const { scholarshipServiceApi } = await import('@/services/scholarship.service');
      const opportunityId = parseInt(scholarshipId);
      const response = await scholarshipServiceApi.saveBookmark(opportunityId);
      
      if (response.bookmarked !== undefined) {
        // Update local state immediately for better UX
        setSavedScholarships(prev => {
          if (response.bookmarked) {
            return prev.includes(scholarshipId) ? prev : [...prev, scholarshipId];
          } else {
            return prev.filter(id => id !== scholarshipId);
          }
        });
        
        // Optionally refresh from server
        // await fetchSavedScholarships();
        return true;
      }
      return false;
    } catch (err) {
      setError('Failed to toggle bookmark');
      console.error('Error toggling bookmark:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const unsaveScholarship = useCallback(async (scholarshipId: string) => {
    if (!getAuthToken()) {
      setError('You must be logged in to remove bookmarks');
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const { scholarshipServiceApi } = await import('@/services/scholarship.service');
      await scholarshipServiceApi.removeBookmark(parseInt(scholarshipId));
      setSavedScholarships(prev => prev.filter(id => id !== scholarshipId));
      return true;
    } catch (err) {
      setError('Failed to remove bookmark');
      console.error('Error removing bookmark:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const isScholarshipSaved = useCallback((scholarshipId: string) => {
    return savedScholarships.includes(scholarshipId.toString());
  }, [savedScholarships]);

  const toggleSaved = useCallback(async (scholarshipId: string) => {
    return savedScholarships.includes(scholarshipId.toString())
      ? await unsaveScholarship(scholarshipId)
      : await saveScholarship(scholarshipId);
  }, [saveScholarship, savedScholarships, unsaveScholarship]);

  useEffect(() => {
    fetchSavedScholarships();
  }, [fetchSavedScholarships]);

  return {
    savedScholarships,
    loading,
    error,
    isSaved: false,
    fetchSavedScholarships,
    saveScholarship,
    unsaveScholarship,
    isScholarshipSaved,
    toggleSaved,
  };
}

export function useProviderApplications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async (opportunityId?: string) => {
    if (!opportunityId) {
      setApplications([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const { scholarshipServiceApi } = await import('@/services/scholarship.service');
      const response = await scholarshipServiceApi.getApplicationsForOpportunity(opportunityId);
      
      // Map applications similar to useApplications
      const parseDate = (dateValue: any): Date => {
        if (!dateValue) return new Date();
        if (dateValue instanceof Date) return dateValue;
        if (typeof dateValue === 'string') {
          const parsed = new Date(dateValue);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        }
        return new Date();
      };
      
      const mappedApplications = Array.isArray(response) ? response.map((app: any) => {
        const submittedAt = parseDate(app.submittedAt);
        return {
          id: app.id?.toString() || '',
          applicantId: app.applicantUserId?.toString() || '',
          applicantUserId: app.applicantUserId,
          scholarshipId: app.opportunityId?.toString() || '',
          opportunityId: app.opportunityId?.toString() || '',
          opportunityTitle: app.opportunityTitle || '',
          status: app.status || 'PENDING',
          submittedAt: submittedAt,
          documents: app.documents || [],
          additionalDocs: app.documents?.map((doc: any) => doc.documentUrl || doc.documentName) || [],
          createdAt: submittedAt,
          updatedAt: submittedAt,
          applicantUserName: app.applicantUserName,
          applicantEmail: app.applicantEmail,
          phone: app.phone,
          gpa: app.gpa ? Number(app.gpa) : undefined,
          coverLetter: app.coverLetter,
          motivation: app.motivation,
          additionalInfo: app.additionalInfo,
          portfolioUrl: app.portfolioUrl,
          linkedinUrl: app.linkedinUrl,
          githubUrl: app.githubUrl,
        };
      }) : [];
      
      setApplications(mappedApplications);
    } catch (err) {
      setError('Failed to fetch applications');
      console.error('Error fetching provider applications:', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateApplicationStatus = useCallback(async (applicationId: string, status: string) => {
    setLoading(true);
    setError(null);
    try {
      const { scholarshipServiceApi } = await import('@/services/scholarship.service');
      await scholarshipServiceApi.updateApplicationStatus(applicationId, status);
      
      // Refresh applications
      // Note: Would need opportunityId to refresh - may need to store it
      return true;
    } catch (err) {
      setError('Failed to update application status');
      console.error('Error updating application status:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (applicationId: string, message: string) => {
    // TODO: Implement message sending via chat service
    console.log('Send message to application:', applicationId, message);
    return true;
  }, []);

  return {
    applications,
    loading,
    error,
    fetchApplications,
    updateApplicationStatus,
    sendMessage,
  };
}

export function useScholarshipApplications(scholarshipId: string) {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!scholarshipId) {
      setApplications([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const { scholarshipServiceApi } = await import('@/services/scholarship.service');
      const response = await scholarshipServiceApi.getApplicationsForOpportunity(scholarshipId);
      
      // Map applications (same logic as useProviderApplications)
      const parseDate = (dateValue: any): Date => {
        if (!dateValue) return new Date();
        if (dateValue instanceof Date) return dateValue;
        if (typeof dateValue === 'string') {
          const parsed = new Date(dateValue);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        }
        return new Date();
      };
      
      const mappedApplications = Array.isArray(response) ? response.map((app: any) => {
        const submittedAt = parseDate(app.submittedAt);
        return {
          id: app.id?.toString() || '',
          applicantId: app.applicantUserId?.toString() || '',
          applicantUserId: app.applicantUserId,
          scholarshipId: app.opportunityId?.toString() || '',
          opportunityId: app.opportunityId?.toString() || '',
          opportunityTitle: app.opportunityTitle || '',
          status: app.status || 'PENDING',
          submittedAt: submittedAt,
          documents: app.documents || [],
          additionalDocs: app.documents?.map((doc: any) => doc.documentUrl || doc.documentName) || [],
          createdAt: submittedAt,
          updatedAt: submittedAt,
          applicantUserName: app.applicantUserName,
          applicantEmail: app.applicantEmail,
          phone: app.phone,
          gpa: app.gpa ? Number(app.gpa) : undefined,
          coverLetter: app.coverLetter,
          motivation: app.motivation,
          additionalInfo: app.additionalInfo,
          portfolioUrl: app.portfolioUrl,
          linkedinUrl: app.linkedinUrl,
          githubUrl: app.githubUrl,
        };
      }) : [];
      
      setApplications(mappedApplications);
    } catch (err) {
      setError('Failed to fetch applications');
      console.error('Error fetching scholarship applications:', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [scholarshipId]);

  const updateApplicationStatus = useCallback(async (applicationId: string, status: string) => {
    setLoading(true);
    setError(null);
    try {
      const { scholarshipServiceApi } = await import('@/services/scholarship.service');
      await scholarshipServiceApi.updateApplicationStatus(applicationId, status);
      
      // Refresh applications
      await fetchApplications();
      return true;
    } catch (err) {
      setError('Failed to update application status');
      console.error('Error updating application status:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchApplications]);

  const sendMessage = useCallback(async (applicationId: string, message: string, subject?: string) => {
    // TODO: Implement message sending via chat service
    console.log('Send message to application:', applicationId, message, subject);
    return true;
  }, []);

  useEffect(() => {
    if (scholarshipId) {
      fetchApplications();
    }
  }, [scholarshipId, fetchApplications]);

  return {
    applications,
    loading,
    error,
    fetchApplications,
    updateApplicationStatus,
    sendMessage,
  };
}
