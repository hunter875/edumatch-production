'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  GraduationCap,
  Award,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProviderAnalyticsResponse, scholarshipServiceApi } from '@/services/scholarship.service';

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

export default function ProviderAnalyticsPage() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState('last-6-months');
  const [analyticsData, setAnalyticsData] = useState<ProviderAnalyticsResponse>(emptyAnalytics);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await scholarshipServiceApi.getProviderAnalytics();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Failed to load provider analytics:', error);
        setAnalyticsData(emptyAnalytics);
      }
    };

    fetchAnalytics();
  }, [timeRange]);
  
  const overview = {
    totalScholarships: analyticsData.stats.totalScholarships,
    totalApplications: analyticsData.stats.totalApplications,
    acceptedApplications: analyticsData.stats.acceptedApplications,
    rejectedApplications: analyticsData.stats.rejectedApplications,
    pendingApplications: analyticsData.stats.pendingApplications,
    activeScholarships: analyticsData.stats.activeScholarships,
    acceptanceRate: Number(analyticsData.stats.acceptanceRate || 0),
    averageApplicationsPerScholarship: Number(analyticsData.stats.averageApplicationsPerScholarship || 0),
  };
  const { monthlyStats, scholarshipPerformance, topUniversities, topMajors } = analyticsData;

  // Export functions
  const generateReportCSV = () => {
    const headers = ['Metric', 'Value', 'Period'];
    const data = [
      ['Total Scholarships', overview.totalScholarships, timeRange],
      ['Total Applications', overview.totalApplications, timeRange],
      ['Accepted Applications', overview.acceptedApplications, timeRange],
      ['Acceptance Rate', `${overview.acceptanceRate}%`, timeRange],
      ['Average Applications per Scholarship', overview.averageApplicationsPerScholarship, timeRange],
    ];
    
    const csvContent = [headers, ...data]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    return csvContent;
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    change, 
    changeType = 'positive',
    description 
  }: {
    title: string;
    value: string | number;
    icon: any;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    description?: string;
  }) => (
    <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {change && (
              <p className={`text-xs mt-1 ${
                changeType === 'positive' ? 'text-green-600' : 
                changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {change}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${
            changeType === 'positive' ? 'bg-gradient-to-br from-green-100 to-emerald-200' : 
            changeType === 'negative' ? 'bg-gradient-to-br from-red-100 to-red-200' : 'bg-gradient-to-br from-blue-100 to-blue-200'
          }`}>
            <Icon className={`h-6 w-6 ${
              changeType === 'positive' ? 'text-green-700' : 
              changeType === 'negative' ? 'text-red-700' : 'text-blue-700'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const SimpleChart = ({ data, type = 'bar' }: { data: any[]; type?: 'bar' | 'line' }) => (
    <div className="h-64 flex items-end justify-center space-x-2">
      {data.slice(-6).map((item, index) => (
        <div key={index} className="flex flex-col items-center space-y-2">
          <div 
            className="bg-brand-blue-500 rounded-t"
            style={{ 
              height: `${(item.applications / Math.max(...data.map(d => d.applications), 1)) * 200}px`,
              width: '32px'
            }}
          />
          <span className="text-xs text-gray-600">{item.month}</span>
        </div>
      ))}
    </div>
  );

  const SimpleDonutChart = ({ data, title }: { data: any[]; title: string }) => (
    <div className="space-y-4">
      <h4 className="font-semibold text-center">{title}</h4>
      <div className="space-y-2">
        {data.slice(0, 5).map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
              />
              <span className="text-sm">{item.name}</span>
            </div>
            <div className="text-right">
              <span className="font-semibold">{item.applications}</span>
              <span className="text-xs text-gray-500 ml-1">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-blue-50 to-brand-cyan-50 border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{t('providerAnalytics.title')}</h1>
              <p className="text-gray-600 mt-2">
                {t('providerAnalytics.subtitle')}
              </p>
            </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-48">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-30-days">{t('providerAnalytics.timeRange.last30days')}</SelectItem>
                  <SelectItem value="last-3-months">{t('providerAnalytics.timeRange.last3months')}</SelectItem>
                  <SelectItem value="last-6-months">{t('providerAnalytics.timeRange.last6months')}</SelectItem>
                  <SelectItem value="last-year">{t('providerAnalytics.timeRange.lastYear')}</SelectItem>
                  <SelectItem value="all-time">{t('providerAnalytics.timeRange.allTime')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline"
                onClick={() => {
                  // Export functionality
                  console.log('Exporting report...');
                  const csvContent = generateReportCSV();
                  downloadCSV(csvContent, `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('providerAnalytics.exportReport')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={t('providerAnalytics.stats.totalApplications')}
            value={overview.totalApplications}
            icon={Users}
            change={`+12% ${t('providerAnalytics.stats.fromLastMonth')}`}
            changeType="positive"
          />
          
          <StatCard
            title={t('providerAnalytics.stats.acceptanceRate')}
            value={`${overview.acceptanceRate}%`}
            icon={CheckCircle}
            change={`+2.3% ${t('providerAnalytics.stats.fromLastMonth')}`}
            changeType="positive"
          />
          
          <StatCard
            title={t('providerAnalytics.stats.activeScholarships')}
            value={overview.activeScholarships}
            icon={Award}
            change={`2 ${t('providerAnalytics.stats.endingSoon')}`}
            changeType="neutral"
          />
          
          <StatCard
            title={t('providerAnalytics.stats.avgApplications')}
            value={overview.averageApplicationsPerScholarship}
            icon={TrendingUp}
            change={`+5.2 ${t('providerAnalytics.stats.fromLastMonth')}`}
            changeType="positive"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Applications Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-5 w-5 mr-2" />
                {t('providerAnalytics.charts.applicationsTrend')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleChart data={monthlyStats} type="line" />
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2" />
                {t('providerAnalytics.charts.statusDistribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-2">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{overview.acceptedApplications}</p>
                    <p className="text-sm text-gray-600">{t('providerAnalytics.statusLabels.accepted')}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-2">
                      <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {overview.pendingApplications}
                    </p>
                    <p className="text-sm text-gray-600">{t('providerAnalytics.statusLabels.pending')}</p>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-2">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-600">{overview.rejectedApplications}</p>
                  <p className="text-sm text-gray-600">{t('providerAnalytics.statusLabels.rejected')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scholarship Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              {t('providerAnalytics.charts.scholarshipPerformance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">{t('providerAnalytics.table.scholarship')}</th>
                    <th className="text-center py-3 px-2">{t('providerAnalytics.table.applications')}</th>
                    <th className="text-center py-3 px-2">{t('providerAnalytics.table.accepted')}</th>
                    <th className="text-center py-3 px-2">{t('providerAnalytics.table.acceptanceRate')}</th>
                    <th className="text-center py-3 px-2">{t('providerAnalytics.statusLabels.pending')}</th>
                    <th className="text-center py-3 px-2">{t('providerAnalytics.table.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {scholarshipPerformance.map((scholarship, index) => (
                    <tr key={scholarship.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-2">
                        <div>
                          <h4 className="font-semibold">{scholarship.title}</h4>
                          <p className="text-sm text-gray-600">ID: {scholarship.id}</p>
                        </div>
                      </td>
                      <td className="text-center py-4 px-2">
                        <span className="font-semibold">{scholarship.applications}</span>
                      </td>
                      <td className="text-center py-4 px-2">
                        <span className="font-semibold text-green-600">{scholarship.accepted}</span>
                      </td>
                      <td className="text-center py-4 px-2">
                        <Badge variant={scholarship.acceptanceRate > 15 ? 'default' : 'secondary'}>
                          {scholarship.acceptanceRate}%
                        </Badge>
                      </td>
                      <td className="text-center py-4 px-2">
                        <span className="font-semibold text-yellow-600">{scholarship.pending}</span>
                      </td>
                      <td className="text-center py-4 px-2">
                        <Badge variant="default">{t('providerAnalytics.table.active')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Demographics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Universities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                {t('providerAnalytics.charts.topUniversities')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleDonutChart data={topUniversities} title="" />
            </CardContent>
          </Card>

          {/* Top Majors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                {t('providerAnalytics.charts.popularMajors')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleDonutChart data={topMajors} title="" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Insights */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              {t('providerAnalytics.charts.keyInsights')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">{t('providerAnalytics.insights.volumeTitle')}</h4>
                  <p className="text-blue-700 text-sm">
                    {t('providerAnalytics.insights.volumeDesc')
                      .replace('{total}', overview.totalApplications.toString())
                      .replace('{avg}', overview.averageApplicationsPerScholarship.toString())}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900">{t('providerAnalytics.insights.acceptanceTitle')}</h4>
                  <p className="text-green-700 text-sm">
                    {t('providerAnalytics.insights.acceptanceDesc')
                      .replace('{rate}', overview.acceptanceRate.toString())
                      .replace('{accepted}', overview.acceptedApplications.toString())
                      .replace('{total}', overview.totalApplications.toString())}
                  </p>
                </div>
              </div>

              {overview.pendingApplications > 0 && (
                <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-900">{t('providerAnalytics.insights.actionTitle')}</h4>
                    <p className="text-yellow-700 text-sm">
                      {t('providerAnalytics.insights.actionDesc')
                        .replace('{pending}', overview.pendingApplications.toString())}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
