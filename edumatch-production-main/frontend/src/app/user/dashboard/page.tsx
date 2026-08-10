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
  TrendingUp,
  Bell,
  User,
  FileText,
  Award,
  Target,
  Plus,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDate, getDaysUntilDeadline } from '@/lib/utils';
import { RealTimeDashboardStats } from '@/components/RealTimeDashboardStats';
import { RealTimeApplicationStatus } from '@/components/RealTimeApplicationStatus';
import { MatchToast } from '@/components/MatchToast';
import { ScholarshipCard } from '@/components/ScholarshipCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { parseNotification } from '@/lib/notification-templates';
import { scholarshipServiceApi } from '@/services/scholarship.service';
import { mapPaginatedOpportunities } from '@/lib/scholarship-mapper';
import { Scholarship } from '@/types';
import { useApplications, useSavedScholarships } from '@/hooks/api';
import { useAuth } from '@/lib/auth';
import { batchGetMatchingScores } from '@/services/matching.service';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';
import { useProfileCompletionCheck } from '@/hooks/useProfileCompletionCheck';
import { markProfileCompletionSkipped } from '@/lib/profile-utils';
import { getAuthToken } from '@/lib/api-config';
import { useNotificationStore } from '@/stores/realtimeStore';
import accountService from '@/services/account.service';

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  },
  hover: { 
    y: -8,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const areSetsEqual = <T,>(left: Set<T>, right: Set<T>) =>
  left.size === right.size && Array.from(left).every((value) => right.has(value));

const areMapsEqual = <K, V>(left: Map<K, V>, right: Map<K, V>) =>
  left.size === right.size && Array.from(left).every(([key, value]) => right.get(key) === value);

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const queryClient = useQueryClient();
  
  // Profile completion check
  const { shouldShowModal, hideModal, onProfileCompleted } = useProfileCompletionCheck();
  
  // Auto-close modal after 3 seconds
  useEffect(() => {
    if (shouldShowModal) {
      const timer = setTimeout(() => {
        hideModal();
        markProfileCompletionSkipped();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [shouldShowModal, hideModal]);
  
  const { applications, fetchApplications } = useApplications();
  const { notifications } = useNotificationStore();
  
  // Fetch scholarships and saved scholarships from API
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setMatchingScores] = useState<Map<string, number>>(new Map());
  const [appliedScholarshipIds, setAppliedScholarshipIds] = useState<Set<string>>(new Set());
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const { savedScholarships } = useSavedScholarships();

  useEffect(() => {
    if (authLoading || !isAuthenticated || !getAuthToken()) return;
    fetchApplications();
  }, [authLoading, isAuthenticated, fetchApplications]);

  // Check employer request status and refresh user data if role changed
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) return;
    
    // Only check for USER role
    if (user.role !== 'USER') return;

    const checkEmployerRequestStatus = async () => {
      try {
        const token = getAuthToken();

        if (!token) return;

        const data = await accountService.getMyEmployerRequest();
          // If request is approved, refresh user data
          if (data.status === 'APPROVED') {
            // Invalidate and refetch user data immediately
            await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
            await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            
            // Force refetch user data from backend
            try {
              const userData = await accountService.getCurrentUser();
              const newRole = userData.data?.role || userData.role;
              
              // If role changed to EMPLOYER, redirect
              if (newRole === 'EMPLOYER' || newRole === 'ROLE_EMPLOYER') {
                toast.success('Yêu cầu của bạn đã được duyệt! Đang chuyển đến trang employer...', {
                  duration: 3000,
                });
                // Small delay to show toast
                setTimeout(() => {
                  // Force page reload to get new JWT with updated role
                  window.location.href = '/employer/dashboard';
                }, 1500);
              } else {
                // Role vẫn là USER (JWT token vẫn cũ) → logout và yêu cầu đăng nhập lại
                toast('Yêu cầu của bạn đã được duyệt! Vui lòng đăng nhập lại để cập nhật quyền truy cập.', {
                  duration: 5000,
                });
                setTimeout(() => {
                  logout();
                  // Redirect to login with message
                  window.location.href = '/auth/login?message=Yêu cầu của bạn đã được duyệt. Vui lòng đăng nhập lại.';
                }, 2000);
              }
            } catch {
              // Không thể fetch user data → logout và yêu cầu đăng nhập lại
              toast('Yêu cầu của bạn đã được duyệt! Vui lòng đăng nhập lại để cập nhật quyền truy cập.', {
                duration: 5000,
              });
              setTimeout(() => {
                logout();
                window.location.href = '/auth/login?message=Yêu cầu của bạn đã được duyệt. Vui lòng đăng nhập lại.';
              }, 2000);
            }
          }
      } catch (error) {
        // Silently fail - user might not have a request
        console.debug('No employer request found or error checking status:', error);
      }
    };

    // Check immediately
    checkEmployerRequestStatus();

    // Poll every 30 seconds to check for role change
    const interval = setInterval(checkEmployerRequestStatus, 30000);

    return () => clearInterval(interval);
  }, [authLoading, isAuthenticated, user, queryClient, logout]);
  
  useEffect(() => {
    let cancelled = false;

    const fetchScholarships = async () => {
      if (authLoading) {
        setLoading(true);
        setApplicationsLoading(true);
        return;
      }

      if (!isAuthenticated || !getAuthToken()) {
        setScholarships([]);
        setAppliedScholarshipIds((previous) => previous.size === 0 ? previous : new Set());
        setMatchingScores((previous) => previous.size === 0 ? previous : new Map());
        setApplicationsLoading(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await scholarshipServiceApi.getScholarships({
          page: 0,
          size: 3,
          isPublic: true,
          currentDate: new Date().toISOString().split('T')[0]
        });
        const mapped = mapPaginatedOpportunities(response);
        if (cancelled) return;
        setScholarships(mapped.scholarships);

        setApplicationsLoading(true);
        const opportunityIds = mapped.scholarships.map((scholarship) => scholarship.id.toString());
        if (opportunityIds.length > 0) {
          try {
            const statuses = await scholarshipServiceApi.getMyApplicationStatuses(opportunityIds);
            if (cancelled) return;
            const appliedIds = new Set(
              Object.entries(statuses)
                .filter(([, hasApplied]) => hasApplied)
                .map(([opportunityId]) => opportunityId)
            );
            setAppliedScholarshipIds((previous) => areSetsEqual(previous, appliedIds) ? previous : appliedIds);
          } catch (statusError) {
            if (cancelled) return;
            console.debug('Application status lookup failed; keeping recommendations visible:', statusError);
            setAppliedScholarshipIds((previous) => previous.size === 0 ? previous : new Set());
          }
        } else {
          setAppliedScholarshipIds((previous) => previous.size === 0 ? previous : new Set());
        }
        setApplicationsLoading(false);

        // Fetch matching scores for recommended scholarships
        try {
          if (user?.id) {
            await fetchMatchingScores(mapped.scholarships, user.id.toString());
          }
        } catch (err) {
          console.debug('Failed to fetch matching scores on dashboard:', err);
        }
      } catch (error) {
        console.error('Error fetching recommended scholarships:', error);
        toast.error('Failed to load recommended scholarships');
      } finally {
        setApplicationsLoading(false);
        setLoading(false);
      }
    };

    fetchScholarships();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, user?.id]);

  // Fetch matching scores for current user and scholarships
  async function fetchMatchingScores(scholarshipList: Scholarship[], applicantId: string) {
    try {
      const opportunityIds = scholarshipList.map(s => s.id.toString());
      if (opportunityIds.length === 0) return;

      const scores = await batchGetMatchingScores(applicantId, opportunityIds);
      setMatchingScores((previous) => areMapsEqual(previous, scores) ? previous : scores);

      // Merge scores into scholarships state so ScholarshipCard can read scholarship.matchScore
      setScholarships(prev => prev.map(s => ({
        ...s,
        matchScore: scores.get(s.id.toString()) || undefined
      })));
    } catch (error) {
      console.debug('Error fetching dashboard matching scores:', error);
    }
  }

  // Dashboard data from API
  const dashboardData = React.useMemo(() => ({
    stats: {
      applications: applications.length,
      inReview: applications.filter(a => a.status === 'PENDING' || a.status === 'VIEWED').length,
      accepted: applications.filter(a => a.status === 'ACCEPTED').length,
      saved: savedScholarships.length
    },
    recentApplications: applications.slice(0, 3).map(app => {
      const scholarship = scholarships.find(s => s.id === app.scholarshipId);
      return {
        id: app.id,
        scholarshipTitle: scholarship?.title || 'Unknown Scholarship',
        provider: scholarship?.providerName || 'Unknown Provider',
        status: app.status.toLowerCase(),
        appliedDate: app.createdAt ? app.createdAt.toISOString().split('T')[0] : '',
        deadline: scholarship?.applicationDeadline || ''
      };
    }),
    notifications: notifications.slice(0, 5),
    recommendedScholarships: scholarships.slice(0, 3)
  }), [scholarships, applications, notifications, savedScholarships]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'under_review':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'submitted':
        return <FileText className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'under_review':
        return 'warning';
      case 'submitted':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted':
        return t('dashboard.status.accepted');
      case 'rejected':
        return t('dashboard.status.rejected');
      case 'under_review':
        return t('dashboard.status.underReview');
      case 'submitted':
        return t('dashboard.status.submitted');
      default:
        return t('dashboard.status.unknown');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-blue-50 to-brand-cyan-50 border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
             <h1 className="text-4xl font-bold text-gray-900">
                {t('dashboard.welcomeUser').replace('{name}', user?.name || user?.email?.split('@')[0] || 'User')}
              </h1>
              <p className="text-gray-600 mt-2">
                {t('dashboard.subtitle')}
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button asChild>
                <Link href="/user/scholarships">
                  <Search className="h-4 w-4 mr-2" />
                  {t('dashboard.findScholarships')}
                </Link>
              </Button>
            </div>
        </div>

        {/* Match Toast Notifications */}
        <MatchToast />
      </div>
    </div>      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Real-time Stats Overview */}
        <RealTimeDashboardStats
          userRole="applicant"
          applications={applications}
          savedScholarships={savedScholarships}
          scholarships={scholarships}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Real-time Applications */}
          <div className="lg:col-span-2">
            <RealTimeApplicationStatus applications={applications} scholarships={scholarships} />
          </div>

          {/* Notifications */}
          <div>
            <Card className="border-0 bg-gradient-to-br from-white to-blue-50/20 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{t('dashboard.notifications.title')}</CardTitle>
                <Button variant="outline" size="sm" className="border-blue-300 hover:bg-blue-50">
                  <Bell className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.notifications.slice(0, 5).map((notification) => {
                    const { templateKey, params } = parseNotification(notification);
                    return (
                      <div key={notification.id} className={`p-3 rounded-lg border ${!notification.read ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-sm' : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'}`}>
                        <h5 className="font-medium text-sm text-gray-900">{t(templateKey + '.title', params || {})}</h5>
                        <p className="text-xs text-gray-600 mt-1">{t(templateKey, params || {})}</p>
                        <p className="text-xs text-gray-500 mt-2">{formatDate(notification.createdAt.toString())}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recommended Scholarships */}
        <Card className="mt-8 border-0 bg-gradient-to-br from-white to-cyan-50/20 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{t('dashboard.recommended.title')}</CardTitle>
            <Button variant="outline" size="sm" className="border-blue-300 hover:bg-blue-50" asChild>
              <Link href="/user/scholarships">
                {t('dashboard.recommended.viewAll')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="grid grid-cols-1 gap-6 grid-equal-height md:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(3,minmax(0,1fr))]"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {dashboardData.recommendedScholarships.map((scholarship, index) => (
                <motion.div
                  key={scholarship.id}
                  variants={cardVariants}
                  whileHover="hover"
                  custom={index}
                  className="min-w-0"
                >
                  <ScholarshipCard
                    scholarship={scholarship}
                    showMatchScore={true}
                    className="w-full h-full"
                    hasApplied={appliedScholarshipIds.has(scholarship.id.toString())}
                    loading={applicationsLoading}
                  />
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-8 border-0 bg-gradient-to-br from-white to-blue-50/20 shadow-lg">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{t('dashboard.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={cardVariants} whileHover="hover">
                <Button variant="outline" className="h-20 flex-col space-y-2 border-blue-200 w-full hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 hover:border-blue-400 hover:shadow-md transition-all group" asChild>
                <Link href="/user/profile">
                  <User className="h-6 w-6 text-blue-600 group-hover:text-blue-700" />
                  <span className="text-gray-700 group-hover:text-blue-900 font-medium">{t('dashboard.quickAction.updateProfile')}</span>
                </Link>
              </Button>
              </motion.div>
              <motion.div variants={cardVariants} whileHover="hover">
                <Button variant="outline" className="h-20 flex-col space-y-2 border-blue-200 w-full hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 hover:border-blue-400 hover:shadow-md transition-all group" asChild>
                <Link href="/user/scholarships">
                  <Search className="h-6 w-6 text-blue-600 group-hover:text-blue-700" />
                  <span className="text-gray-700 group-hover:text-blue-900 font-medium">{t('dashboard.quickAction.browseScholarships')}</span>
                </Link>
              </Button>
              </motion.div>
              <motion.div variants={cardVariants} whileHover="hover">
                <Button variant="outline" className="h-20 flex-col space-y-2 border-blue-200 w-full hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 hover:border-blue-400 hover:shadow-md transition-all group" asChild>
                <Link href="/user/applications">
                  <FileText className="h-6 w-6 text-blue-600 group-hover:text-blue-700" />
                  <span className="text-gray-700 group-hover:text-blue-900 font-medium">{t('dashboard.quickAction.myApplications')}</span>
                </Link>
              </Button>
              </motion.div>
              <motion.div variants={cardVariants} whileHover="hover">
                <Button variant="outline" className="h-20 flex-col space-y-2 border-blue-200 w-full hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 hover:border-blue-400 hover:shadow-md transition-all group" asChild>
                <Link href="/user/settings">
                  <Target className="h-6 w-6 text-blue-600 group-hover:text-blue-700" />
                  <span className="text-gray-700 group-hover:text-blue-900 font-medium">{t('dashboard.quickAction.settings')}</span>
                </Link>
              </Button>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Completion Modal - Auto close after 3s */}
      <ProfileCompletionModal
        isOpen={shouldShowModal}
        onClose={() => {
          hideModal();
        }}
        onSkip={() => {
          markProfileCompletionSkipped();
          hideModal();
        }}
        onCompleteProfile={() => {
          onProfileCompleted();
          hideModal();
          router.push('/user/profile');
        }}
        isPostRegistration={false}
      />
    </div>
  );
}
