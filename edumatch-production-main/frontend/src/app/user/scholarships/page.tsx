'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Building2,
  Heart,
  Clock,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApplyButton } from '@/components/ApplyButton';
import Link from 'next/link';
import { formatDate, getDaysUntilDeadline } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { ScholarshipCard } from '@/components/ScholarshipCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { Pagination } from '@/components/Pagination';
import { pageVariants, fadeInUpVariants } from '@/lib/animations';
import { ScholarshipFilters, type ScholarshipFilterState } from '@/components/ScholarshipFilters';
import { useScholarships } from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';
import { Scholarship, ScholarshipFilters as ScholarshipFiltersType } from '@/types';
import { batchGetMatchingScores } from '@/services/matching.service';
import { scholarshipServiceApi } from '@/services/scholarship.service';
import { getAuthToken } from '@/lib/api-config';
import { useAuth } from '@/lib/auth';
import { useSavedScholarships } from '@/hooks/api';

const areSetsEqual = <T,>(left: Set<T>, right: Set<T>) =>
  left.size === right.size && Array.from(left).every((value) => right.has(value));

const areMapsEqual = <K, V>(left: Map<K, V>, right: Map<K, V>) =>
  left.size === right.size && Array.from(left).every(([key, value]) => right.get(key) === value);

export default function ScholarshipsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // Filter state - consolidated for server-side filtering
  const [filters, setFilters] = useState<ScholarshipFilterState>({
    searchTerm: '',
    categories: [],
    amountRange: [0, 0],
    deadlineRange: 'all',
    locations: [],
    educationLevels: []
  });

  // Debounce search term for better UX
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);

  // Build API filters from filter state
  const apiFilters: ScholarshipFiltersType = React.useMemo(() => {
    const f: any = {
      isPublic: true,
      currentDate: new Date().toISOString().split('T')[0],
    };

    // Search query
    if (debouncedSearchTerm) {
      f.q = debouncedSearchTerm;
    }

    // Education levels
    if (filters.educationLevels.length > 0) {
      f.level = filters.educationLevels[0]; // Backend may accept only one level
    }

    // Categories (map to study fields or tags if backend supports)
    if (filters.categories.length > 0) {
      f.categories = filters.categories.join(',');
    }

    // Locations
    if (filters.locations.length > 0) {
      f.locations = filters.locations.join(',');
    }

    // GPA filter (if amount range is used for GPA)
    if (filters.amountRange[0] > 0) {
      f.gpa = filters.amountRange[0];
    }

    // Deadline range
    if (filters.deadlineRange !== 'all') {
      const now = new Date();
      let endDate = new Date();
      
      switch (filters.deadlineRange) {
        case 'week':
          endDate.setDate(now.getDate() + 7);
          break;
        case 'month':
          endDate.setMonth(now.getMonth() + 1);
          break;
        case 'quarter':
          endDate.setMonth(now.getMonth() + 3);
          break;
        case 'year':
          endDate.setFullYear(now.getFullYear() + 1);
          break;
      }
      
      f.deadlineBefore = endDate.toISOString().split('T')[0];
    }

    return f;
  }, [debouncedSearchTerm, filters]);

  // Fetch scholarships using React Query hook
  const { data, isLoading, error } = useScholarships(apiFilters, currentPage, itemsPerPage);

  // Use API hook for saved scholarships. The hook itself skips network calls when unauthenticated.
  const { isScholarshipSaved, toggleSaved } = useSavedScholarships();

  // Extract scholarships and metadata from response
  const scholarships = React.useMemo(
    () => (Array.isArray(data?.data) ? data.data : []),
    [data?.data]
  );
  const totalPages = data?.totalPages || 1;
  const totalElements = data?.total || 0;
  const visibleOpportunityIds = React.useMemo(
    () => scholarships.map((s: Scholarship) => s.id.toString()),
    [scholarships]
  );
  const visibleOpportunityKey = React.useMemo(
    () => visibleOpportunityIds.join(','),
    [visibleOpportunityIds]
  );

  // State for matching scores
  const [matchingScores, setMatchingScores] = useState<Map<string, number>>(new Map());
  const [appliedScholarshipIds, setAppliedScholarshipIds] = useState<Set<string>>(new Set());
  const [applicationsLoading, setApplicationsLoading] = useState(true);

  // Fetch applied statuses for only the currently visible scholarships.
  useEffect(() => {
    let cancelled = false;

    const fetchApplicationStatuses = async () => {
      if (authLoading) {
        setApplicationsLoading(true);
        return;
      }

      const opportunityIds = visibleOpportunityKey ? visibleOpportunityKey.split(',') : [];

      if (opportunityIds.length === 0 || !isAuthenticated || !getAuthToken()) {
        setAppliedScholarshipIds((previous) => previous.size === 0 ? previous : new Set());
        setApplicationsLoading(false);
        return;
      }

      try {
        setApplicationsLoading(true);
        const statuses = await scholarshipServiceApi.getMyApplicationStatuses(opportunityIds);
        const appliedIds = new Set(
          Object.entries(statuses)
            .filter(([, hasApplied]) => hasApplied)
            .map(([opportunityId]) => opportunityId)
        );
        if (cancelled) return;
        setAppliedScholarshipIds((previous) => areSetsEqual(previous, appliedIds) ? previous : appliedIds);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to fetch application statuses:', error);
        setAppliedScholarshipIds((previous) => previous.size === 0 ? previous : new Set());
      } finally {
        if (!cancelled) setApplicationsLoading(false);
      }
    };
    fetchApplicationStatuses();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, visibleOpportunityKey]);

  // Fetch matching scores when scholarships change
  useEffect(() => {
    let cancelled = false;

    const fetchMatchingScores = async () => {
      const opportunityIds = visibleOpportunityKey ? visibleOpportunityKey.split(',') : [];

      if (opportunityIds.length === 0 || !isAuthenticated || !user?.id || !getAuthToken()) {
        setMatchingScores((previous) => previous.size === 0 ? previous : new Map());
        return;
      }

      try {
        const scores = await batchGetMatchingScores(user.id.toString(), opportunityIds);
        if (cancelled) return;
        setMatchingScores((previous) => areMapsEqual(previous, scores) ? previous : scores);
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching matching scores:', error);
      }
    };

    fetchMatchingScores();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, visibleOpportunityKey]);

  // Reset to page 1 when filters change (except pagination)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters.categories, filters.educationLevels, filters.locations, filters.deadlineRange]);

  // Get unique values for filter options (from current results)
  const uniqueFields = React.useMemo(() => 
    Array.from(new Set(scholarships.flatMap((s: Scholarship) => s.requiredSkills || []))).sort(),
    [scholarships]
  );
  
  const uniqueLevels = React.useMemo(() => 
    Array.from(new Set(scholarships.map((s: Scholarship) => s.level).filter(Boolean))).sort(),
    [scholarships]
  );

  const uniqueLocations = React.useMemo(() => 
    Array.from(new Set(scholarships.map((s: Scholarship) => s.location).filter(Boolean))).sort(),
    [scholarships]
  );

  // Scroll to top when page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSaved = async (scholarshipId: string) => {
    try {
      await toggleSaved(scholarshipId);
      toast.success(isScholarshipSaved(scholarshipId) ? 'Scholarship unsaved!' : 'Scholarship saved!');
    } catch (error) {
      toast.error('Failed to update saved status');
    }
  };

  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      categories: [],
      amountRange: [0, 0],
      deadlineRange: 'all',
      locations: [],
      educationLevels: []
    });
    setCurrentPage(1);
  };

  return (
    <motion.div
      className="min-h-screen bg-background"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <motion.div
        className="bg-gradient-to-r from-brand-blue-50 to-brand-cyan-50 border-b"
        variants={fadeInUpVariants}
      >
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {t('scholarshipList.hero.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('scholarshipList.hero.subtitle')}
            </p>
          </div>

          {/* Stats - using real data from API */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-blue-600">{totalElements > 0 ? `${totalElements}+` : '0'}</div>
              <div className="text-sm text-gray-600">{t('scholarshipList.stats.active')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{uniqueFields.length}+</div>
              <div className="text-sm text-gray-600">{t('scholarshipList.stats.fields')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {scholarships.length > 0 
                  ? `$${Math.round(scholarships.reduce((sum, s) => sum + (s.amount || 0), 0) / 1000000)}M+`
                  : '$0'
                }
              </div>
              <div className="text-sm text-gray-600">{t('scholarshipList.stats.totalValue')}</div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Advanced Filters */}
        <ScholarshipFilters
          filters={filters}
          onFilterChange={setFilters}
          availableCategories={uniqueFields}
          availableLocations={uniqueLocations}
          availableEducationLevels={uniqueLevels}
          totalResults={totalElements}
        />

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('scholarshipList.results.found').replace('{count}', totalElements.toString())}
            </h2>
            {(debouncedSearchTerm || filters.educationLevels.length > 0 || filters.categories.length > 0) && (
              <p className="text-gray-600 text-sm">
                {debouncedSearchTerm && t('scholarshipList.results.for').replace('{query}', debouncedSearchTerm)}
                {filters.educationLevels.length > 0 && ` • ${filters.educationLevels.join(', ')}`}
                {filters.categories.length > 0 && ` • ${filters.categories.join(', ')}`}
              </p>
            )}
          </div>
        </div>

        {/* Scholarships Grid */}
        {isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue-600 mb-4"></div>
              <p className="text-gray-600">{t('scholarshipList.loading') || 'Loading scholarships...'}</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('scholarshipList.error.title') || 'Error loading scholarships'}
              </h3>
              <p className="text-gray-600 text-center">
                {t('scholarshipList.error.subtitle') || 'Please try again later'}
              </p>
            </CardContent>
          </Card>
        ) : scholarships.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('scholarshipList.noResults.title')}
              </h3>
              <p className="text-gray-600 text-center">
                {t('scholarshipList.noResults.subtitle')}
              </p>
              <Button 
                onClick={handleClearFilters}
                className="mt-4"
                variant="outline"
              >
                {t('scholarshipList.noResults.clearFilters')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 gap-6 grid-equal-height lg:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(3,minmax(0,1fr))]"
              variants={fadeInUpVariants}
              initial="initial"
              animate="animate"
            >
              {scholarships.map((scholarship) => (
                <motion.div
                  key={scholarship.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="min-w-0"
                >
                  <ScholarshipCard
                    scholarship={{
                      ...scholarship,
                      matchScore: matchingScores.get(scholarship.id.toString()) || scholarship.matchScore
                    }}
                    showMatchScore={true}
                    className="w-full h-full"
                    hasApplied={appliedScholarshipIds.has(scholarship.id.toString())}
                    loading={applicationsLoading}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                itemsPerPage={itemsPerPage}
                totalItems={totalElements}
              />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
