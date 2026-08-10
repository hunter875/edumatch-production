'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Eye,
  Edit,
  FileText,
  Award,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { ScholarshipStatus } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProviderAnalyticsResponse, scholarshipServiceApi } from '@/services/scholarship.service';
import { mapOpportunityDtoToScholarship } from '@/lib/scholarship-mapper';
import { Scholarship } from '@/types';
import { toast } from 'react-hot-toast';

const emptyAnalytics: ProviderAnalyticsResponse = {
  stats: {
    totalScholarships: 0,
    activeScholarships: 0,
    pendingScholarships: 0,
    totalApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
    pendingApplications: 0,
    applicationsThisWeek: 0,
    totalFunding: 0,
    averageApplicationsPerScholarship: 0,
    acceptanceRate: 0,
  },
  recentApplications: [],
  upcomingDeadlines: [],
  scholarshipPerformance: [],
  monthlyStats: [],
  topUniversities: [],
  topMajors: [],
};

// Animation variants cho scholarship cards
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  },
  hover: {
    y: -8,
    scale: 1.02,
    transition: { 
      duration: 0.3,
      ease: 'easeInOut'
    }
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

export default function ProviderDashboardPage() {
  const { t } = useLanguage();
  
  // Fetch data from API
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [analytics, setAnalytics] = useState<ProviderAnalyticsResponse>(emptyAnalytics);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [opps, providerAnalytics] = await Promise.all([
          scholarshipServiceApi.getMyOpportunities(),
          scholarshipServiceApi.getProviderAnalytics(),
        ]);
        const mappedScholarships = opps.map((opp: any) => mapOpportunityDtoToScholarship(opp));
        setScholarships(mappedScholarships);
        setAnalytics(providerAnalytics);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      }
    };
    
    fetchData();
  }, []);

  // Dashboard data comes from backend aggregate endpoints, not duplicated FE server-state.
  const dashboardData = React.useMemo(() => {
    // --- Tính toán Logic cho Quick Stats ---
    const recentApplications = analytics.recentApplications.map(app => ({
      id: app.id,
      applicantName: app.studentName || app.studentEmail || 'Unknown Applicant',
      applicantEmail: app.studentEmail || 'No email',
      scholarshipTitle: app.scholarshipTitle || 'Unknown Scholarship',
      appliedDate: app.appliedDate || '',
      status: (app.status || 'PENDING').toLowerCase(),
      gpa: app.gpa || 'N/A',
      university: 'N/A'
    }));

    const appsThisWeek = analytics.stats.applicationsThisWeek || 0;

    // 2. Pending reviews (Trạng thái chờ)
    const pendingReviews = analytics.stats.pendingApplications;

    // 3. Acceptance rate (Tỷ lệ chấp thuận)
    const acceptedCount = analytics.stats.acceptedApplications;
    const acceptanceRate = Math.round(Number(analytics.stats.acceptanceRate || 0));

    // 4. Avg. GPA (Điểm trung bình)
    const avgGpa = 'N/A';

    return {
      stats: {
        totalScholarships: analytics.stats.totalScholarships,
        activeScholarships: analytics.stats.activeScholarships,
        totalApplications: analytics.stats.totalApplications,
        acceptedStudents: acceptedCount
      },
      // Object chứa số liệu thống kê nhanh đã tính toán
      quickStats: {
        appsThisWeek,
        pendingReviews,
        acceptanceRate,
        avgGpa
      },
      recentApplications,
      myScholarships: scholarships.slice(0, 4).map(s => ({
        ...s,
        status: s.status || ScholarshipStatus.PUBLISHED,
        applicationCount: s.applicationCount || 0,
        applicationDeadline: s.applicationDeadline,
        amount: s.amount
      }))
    };
  }, [analytics, scholarships]);

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
        return t('provider.status.accepted');
      case 'rejected':
        return t('provider.status.rejected');
      case 'under_review':
        return t('provider.status.underReview');
      case 'submitted':
        return t('provider.status.newApplication');
      default:
        return t('provider.status.unknown');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-blue-50 to-brand-cyan-50 border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{t('provider.dashboard.title')}</h1>
              <p className="text-gray-600 mt-2">
                {t('provider.dashboard.subtitle')}
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button asChild>
                <Link href="/employer/scholarships/create">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('provider.dashboard.createScholarship')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mr-4 shadow-sm">
                <Award className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{dashboardData.stats.totalScholarships}</p>
                <p className="text-xs text-muted-foreground">{t('provider.stats.totalScholarships')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white to-green-50/30 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-200 rounded-lg mr-4 shadow-sm">
                <Target className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-green-900 bg-clip-text text-transparent">{dashboardData.stats.activeScholarships}</p>
                <p className="text-xs text-muted-foreground">{t('provider.stats.activeScholarships')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white to-cyan-50/30 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-lg mr-4 shadow-sm">
                <FileText className="h-6 w-6 text-cyan-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-cyan-900 bg-clip-text text-transparent">{dashboardData.stats.totalApplications}</p>
                <p className="text-xs text-muted-foreground">{t('provider.stats.totalApplications')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white to-yellow-50/30 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-100 to-amber-200 rounded-lg mr-4 shadow-sm">
                <Users className="h-6 w-6 text-yellow-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-yellow-900 bg-clip-text text-transparent">{dashboardData.stats.acceptedStudents}</p>
                <p className="text-xs text-muted-foreground">{t('provider.stats.acceptedStudents')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Applications */}
          <div className="lg:col-span-2">
            <Card className="border-0 bg-gradient-to-br from-white to-blue-50/20 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{t('provider.recentApplications.title')}</CardTitle>
                <Button variant="outline" size="sm" className="border-blue-300 hover:bg-blue-50" asChild>
                  <Link href="/employer/applications">
                    {t('provider.recentApplications.viewAll')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentApplications.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                          {t('provider.recentApplications.noApplications')}
                      </div>
                  ) : (
                    dashboardData.recentApplications.map((application, index) => (
                        <div
                        key={application.id}
                        className="flex items-center justify-between p-4 border border-blue-100 rounded-lg bg-gradient-to-r from-white to-blue-50/30 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{application.applicantName}</h4>
                            <Badge variant={getStatusVariant(application.status)}>
                                <div className="flex items-center space-x-1">
                                {getStatusIcon(application.status)}
                                <span>{getStatusLabel(application.status)}</span>
                                </div>
                            </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{application.scholarshipTitle}</p>
                            <div className="flex items-center text-xs text-gray-500 space-x-4">
                            <span>{t('provider.recentApplications.gpa')}: {application.gpa}</span>
                            <span>{application.university}</span>
                            <span>{t('provider.recentApplications.applied')}: {formatDate(application.appliedDate)}</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" className="border-blue-300 hover:bg-blue-50" asChild>
                            <Link href={`/employer/applications`}>
                                <Eye className="h-4 w-4" />
                            </Link>
                            </Button>
                        </div>
                        </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats - SỬ DỤNG DỮ LIỆU ĐỘNG */}
          <div>
            <Card className="border-0 bg-gradient-to-br from-white to-cyan-50/20 shadow-lg">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-gray-900 to-cyan-900 bg-clip-text text-transparent">{t('provider.quickStats.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50">
                    <span className="text-sm text-gray-600">{t('provider.quickStats.applicationsWeek')}</span>
                    {/* Dynamic Data */}
                    <span className="font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        {dashboardData.quickStats.appsThisWeek}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50">
                    <span className="text-sm text-gray-600">{t('provider.quickStats.pendingReviews')}</span>
                    {/* Dynamic Data */}
                    <span className="font-semibold text-yellow-700">
                        {dashboardData.quickStats.pendingReviews}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                    <span className="text-sm text-gray-600">{t('provider.quickStats.acceptanceRate')}</span>
                    {/* Dynamic Data */}
                    <span className="font-semibold text-green-700">
                        {dashboardData.quickStats.acceptanceRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                    <span className="text-sm text-gray-600">{t('provider.quickStats.avgGPA')}</span>
                    {/* Dynamic Data */}
                    <span className="font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {dashboardData.quickStats.avgGpa}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* My Scholarships */}
        <Card className="mt-8 border-0 bg-gradient-to-br from-white to-blue-50/20 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{t('provider.scholarships.title')}</CardTitle>
            <Button variant="outline" size="sm" className="border-blue-300 hover:bg-blue-50" asChild>
              <Link href="/employer/scholarships">
                {t('provider.scholarships.manageAll')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {dashboardData.myScholarships.map((scholarship, index) => (
                <motion.div
                  key={scholarship.id}
                  variants={cardVariants}
                  whileHover="hover"
                  whileTap={{ scale: 0.98 }}
                  custom={index}
                >
                  <Card className="border-0 bg-gradient-to-br from-white to-cyan-50/30 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
                    <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={scholarship.status === ScholarshipStatus.PUBLISHED ? 'success' : 'secondary'}>
                        {scholarship.status === ScholarshipStatus.PUBLISHED ? t('provider.scholarships.published') : t('provider.scholarships.draft')}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" className="hover:bg-blue-50" asChild>
                          <Link href={`/employer/scholarships/${scholarship.id}/edit`}>
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="hover:bg-cyan-50" asChild>
                          <Link href={`/employer/scholarships/${scholarship.id}/applications`}>
                            <Eye className="h-4 w-4 text-cyan-600" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg line-clamp-2 bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                      {scholarship.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                      {scholarship.description}
                    </p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2 text-blue-600" />
                        {scholarship.applicationCount} {t('provider.scholarships.applications')}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                        {t('provider.scholarships.deadline')}: {scholarship.applicationDeadline ? formatDate(scholarship.applicationDeadline) : 'TBA'}
                      </div>
                      {scholarship.amount && (
                        <div className="flex items-center text-sm font-medium">
                          <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                          <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {scholarship.amount}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors" asChild>
                      <Link href={`/employer/scholarships/${scholarship.id}/applications`}>
                        {t('provider.scholarships.viewApplications').replace('{count}', scholarship.applicationCount.toString())}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-8 border-0 bg-gradient-to-br from-white to-cyan-50/20 shadow-lg">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-gray-900 to-cyan-900 bg-clip-text text-transparent">{t('provider.quickActions.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col space-y-2 border-blue-200 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 hover:border-blue-400 hover:shadow-md transition-all group" asChild>
                <Link href="/employer/scholarships/create">
                  <Plus className="h-6 w-6 text-blue-600 group-hover:text-blue-700" />
                  <span className="text-gray-700 group-hover:text-blue-900 font-medium">{t('provider.quickActions.createScholarship')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2 border-blue-200 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 hover:border-blue-400 hover:shadow-md transition-all group" asChild>
                <Link href="/employer/applications">
                  <FileText className="h-6 w-6 text-blue-600 group-hover:text-blue-700" />
                  <span className="text-gray-700 group-hover:text-blue-900 font-medium">{t('provider.quickActions.reviewApplications')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2 border-blue-200 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 hover:border-blue-400 hover:shadow-md transition-all group" asChild>
                <Link href="/employer/scholarships">
                  <Award className="h-6 w-6 text-blue-600 group-hover:text-blue-700" />
                  <span className="text-gray-700 group-hover:text-blue-900 font-medium">{t('provider.quickActions.manageScholarships')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2 border-blue-200 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 hover:border-blue-400 hover:shadow-md transition-all group" asChild>
                <Link href="/employer/analytics">
                  <TrendingUp className="h-6 w-6 text-blue-600 group-hover:text-blue-700" />
                  <span className="text-gray-700 group-hover:text-blue-900 font-medium">{t('provider.quickActions.viewAnalytics')}</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
