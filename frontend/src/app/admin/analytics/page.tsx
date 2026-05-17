'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, Users, DollarSign, FileText, Award, 
  Calendar, ArrowUp, ArrowDown, Download, Eye 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from '@/components/admin/StatCard';
import CSVExportButton from '@/components/admin/CSVExportButton';
import { useLanguage } from '@/contexts/LanguageContext';
import adminService, {
  AdminAnalyticsResponse,
  AdminStats,
} from '@/services/admin.service';

const emptyStats: AdminStats = {
  totalUsers: 0,
  totalStudents: 0,
  totalEmployers: 0,
  totalAdmins: 0,
  activeUsers: 0,
  inactiveUsers: 0,
  totalScholarships: 0,
  activeScholarships: 0,
  pendingScholarships: 0,
  totalApplications: 0,
  pendingApplications: 0,
  acceptedApplications: 0,
  rejectedApplications: 0,
};

const emptyAnalytics: AdminAnalyticsResponse = {
  stats: emptyStats,
  userGrowth: [],
  subscriptionBreakdown: {
    premium: 0,
    free: 0,
    premiumPercentage: 0,
    freePercentage: 0,
  },
  scholarshipBreakdown: {
    active: 0,
    pending: 0,
    expired: 0,
  },
  applicationStats: {
    pending: 0,
    accepted: 0,
    rejected: 0,
    averageApplicationsPerScholarship: 0,
    acceptanceRate: 0,
  },
  topScholarships: [],
};

export default function AdminAnalyticsPage() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse>(emptyAnalytics);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const response = await adminService.getAnalytics();
        setAnalytics(response);
      } catch (error) {
        console.error('Failed to fetch admin analytics:', error);
        setAnalytics(emptyAnalytics);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const totalRevenue = 0;
  const stats = analytics.stats;
  const userGrowth = analytics.userGrowth.length ? analytics.userGrowth : [
    { month: 'N/A', users: 0, applicants: 0, providers: 0 },
  ];
  const topScholarships = analytics.topScholarships;

  const overviewStats = {
    totalUsers: { value: stats.totalUsers, change: 0, trend: 'up' as const },
    totalScholarships: { value: stats.totalScholarships, change: 0, trend: 'up' as const },
    totalApplications: { value: stats.totalApplications, change: 0, trend: 'up' as const },
    totalRevenue: { value: totalRevenue, change: 0, trend: 'up' as const }
  };

  const activeScholarships = analytics.scholarshipBreakdown.active;
  const pendingScholarships = analytics.scholarshipBreakdown.pending;
  const expiredScholarships = analytics.scholarshipBreakdown.expired;
  const avgApplications = analytics.applicationStats.averageApplicationsPerScholarship.toFixed(1);
  const acceptanceRate = analytics.applicationStats.acceptanceRate.toFixed(1);
  const applicantPercentage = stats.totalUsers ? Math.round((stats.totalStudents / stats.totalUsers) * 100) : 0;
  const providerPercentage = stats.totalUsers ? Math.round((stats.totalEmployers / stats.totalUsers) * 100) : 0;
  const premiumPercentage = analytics.subscriptionBreakdown.premiumPercentage;
  const freePercentage = analytics.subscriptionBreakdown.freePercentage;
  const userSparkline = userGrowth.map((item) => item.users);
  const scholarshipSparkline = [0, 0, 0, 0, 0, stats.totalScholarships];
  const applicationSparkline = [0, 0, 0, 0, 0, stats.totalApplications];
  const revenueSparkline = [0, 0, 0, 0, 0, totalRevenue];
  const maxUserGrowth = Math.max(...userGrowth.map((item) => item.users), 1);

  const revenueByCategory = [
    { category: t('adminAnalytics.premiumSubscriptions'), amount: 0, percentage: 0 },
    { category: t('adminAnalytics.applicationFees'), amount: 0, percentage: 0 },
    { category: t('adminAnalytics.featuredListings'), amount: 0, percentage: 0 },
    { category: t('adminAnalytics.otherServices'), amount: 0, percentage: 0 }
  ];

  const userEngagement = {
    avgSessionDuration: '0m 00s',
    avgPagesPerSession: 0,
    bounceRate: 0,
    returnUserRate: 0
  };

  const exportData = {
    overview: [
      { Metric: 'Total Users', Value: overviewStats.totalUsers.value, Change: `${overviewStats.totalUsers.change}%` },
      { Metric: 'Total Scholarships', Value: overviewStats.totalScholarships.value, Change: `${overviewStats.totalScholarships.change}%` },
      { Metric: 'Total Applications', Value: overviewStats.totalApplications.value, Change: `${overviewStats.totalApplications.change}%` },
      { Metric: 'Total Revenue', Value: overviewStats.totalRevenue.value, Change: `${overviewStats.totalRevenue.change}%` }
    ],
    topScholarships: topScholarships.map(s => ({
      Title: s.title,
      Applications: s.applications,
      Views: s.views,
      'Conversion Rate': `${Number(s.conversionRate).toFixed(1)}%`
    }))
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('adminAnalytics.title')}</h1>
          <p className="text-gray-500 mt-1">{t('adminAnalytics.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 border rounded-lg p-1">
            {(['7d', '30d', '90d', '1y'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range === '7d' ? t('adminAnalytics.7days') : range === '30d' ? t('adminAnalytics.30days') : range === '90d' ? t('adminAnalytics.90days') : t('adminAnalytics.1year')}
              </Button>
            ))}
          </div>
          <CSVExportButton
            data={exportData.overview}
            filename="analytics-overview"
          />
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title={t('adminAnalytics.totalUsers')}
          value={isLoading ? '...' : overviewStats.totalUsers.value.toLocaleString()}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          trend={overviewStats.totalUsers.trend}
          change={overviewStats.totalUsers.change}
          changeLabel={t('adminAnalytics.vsLastPeriod')}
          sparklineData={userSparkline}
        />
        <StatCard
          title={t('adminAnalytics.scholarships')}
          value={isLoading ? '...' : overviewStats.totalScholarships.value.toLocaleString()}
          icon={<Award className="w-6 h-6 text-purple-600" />}
          trend={overviewStats.totalScholarships.trend}
          change={overviewStats.totalScholarships.change}
          changeLabel={t('adminAnalytics.vsLastPeriod')}
          sparklineData={scholarshipSparkline}
        />
        <StatCard
          title={t('adminAnalytics.applications')}
          value={isLoading ? '...' : overviewStats.totalApplications.value.toLocaleString()}
          icon={<FileText className="w-6 h-6 text-green-600" />}
          trend={overviewStats.totalApplications.trend}
          change={overviewStats.totalApplications.change}
          changeLabel={t('adminAnalytics.vsLastPeriod')}
          sparklineData={applicationSparkline}
        />
        <StatCard
          title={t('adminAnalytics.revenue')}
          value={isLoading ? '...' : `$${overviewStats.totalRevenue.value.toLocaleString()}`}
          icon={<DollarSign className="w-6 h-6 text-orange-600" />}
          trend={overviewStats.totalRevenue.trend}
          change={Math.abs(overviewStats.totalRevenue.change)}
          changeLabel={t('adminAnalytics.vsLastPeriod')}
          sparklineData={revenueSparkline}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">{t('adminAnalytics.tabOverview')}</TabsTrigger>
          <TabsTrigger value="users">{t('adminAnalytics.tabUsers')}</TabsTrigger>
          <TabsTrigger value="scholarships">{t('adminAnalytics.tabScholarships')}</TabsTrigger>
          <TabsTrigger value="revenue">{t('adminAnalytics.tabRevenue')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t('adminAnalytics.userGrowthTrend')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userGrowth.slice(-3).map((data, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{data.month}</span>
                        <span className="text-sm font-bold text-gray-900">{data.users} {t('adminAnalytics.users')}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((data.users / maxUserGrowth) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>{t('adminAnalytics.applicants')}: {data.applicants}</span>
                        <span>{t('adminAnalytics.providers')}: {data.providers}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User Engagement */}
            <Card>
              <CardHeader>
                <CardTitle>{t('adminAnalytics.userEngagement')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{t('adminAnalytics.avgSessionDuration')}</span>
                    <span className="text-lg font-bold text-blue-600">{userEngagement.avgSessionDuration}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{t('adminAnalytics.avgPagesSession')}</span>
                    <span className="text-lg font-bold text-green-600">{userEngagement.avgPagesPerSession}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{t('adminAnalytics.bounceRate')}</span>
                    <span className="text-lg font-bold text-orange-600">{userEngagement.bounceRate}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{t('adminAnalytics.returnUserRate')}</span>
                    <span className="text-lg font-bold text-purple-600">{userEngagement.returnUserRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Scholarships */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('adminAnalytics.topScholarships')}</CardTitle>
                <CSVExportButton
                  data={exportData.topScholarships}
                  filename="top-scholarships"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topScholarships.map((sch, idx) => (
                  <div key={sch.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{sch.title}</h4>
                      <div className="flex gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {t('adminAnalytics.applicationsCount').replace('{count}', sch.applications.toString())}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {t('adminAnalytics.viewsCount').replace('{count}', sch.views.toString())}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">{Number(sch.conversionRate).toFixed(1)}%</div>
                      <div className="text-xs text-gray-500">{t('adminAnalytics.conversion')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('adminAnalytics.userDistribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">{t('adminAnalytics.applicants')}</span>
                      <span className="font-bold">{applicantPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${applicantPercentage}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">{t('adminAnalytics.providers')}</span>
                      <span className="font-bold">{providerPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${providerPercentage}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('adminAnalytics.subscriptionStatus')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('adminAnalytics.premium')}</span>
                    <Badge className="bg-yellow-100 text-yellow-700">{premiumPercentage}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('adminAnalytics.free')}</span>
                    <Badge variant="secondary">{freePercentage}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('adminAnalytics.userActivity')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('adminAnalytics.activeToday')}</span>
                    <span className="font-bold text-green-600">{stats.activeUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('adminAnalytics.activeThisWeek')}</span>
                    <span className="font-bold text-blue-600">{stats.totalUsers.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scholarships Tab */}
        <TabsContent value="scholarships" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('adminAnalytics.scholarshipStatus')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">{t('adminAnalytics.active')}</span>
                    <span className="text-lg font-bold text-green-600">{activeScholarships.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium">{t('adminAnalytics.pendingReview')}</span>
                    <span className="text-lg font-bold text-yellow-600">{pendingScholarships.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">{t('adminAnalytics.expired')}</span>
                    <span className="text-lg font-bold text-gray-600">{expiredScholarships.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('adminAnalytics.applicationStats')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">{t('adminAnalytics.avgApplications')}</span>
                    <span className="text-lg font-bold text-blue-600">{avgApplications}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">{t('adminAnalytics.acceptanceRate')}</span>
                    <span className="text-lg font-bold text-purple-600">{acceptanceRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('adminAnalytics.revenueBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueByCategory.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{item.category}</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">${item.amount.toLocaleString()}</span>
                        <span className="text-sm text-gray-500 ml-2">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-600 to-blue-400 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">{t('adminAnalytics.totalRevenue')}</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${revenueByCategory.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
