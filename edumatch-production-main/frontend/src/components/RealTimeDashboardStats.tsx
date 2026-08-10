'use client';

import React from 'react';
import { Application, ApplicationStatus, Scholarship } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, Heart, TrendingUp, Users, Award, AlertTriangle } from 'lucide-react';
import { useDashboardStore } from '@/stores/realtimeStore';

interface DashboardStatsProps {
  userRole?: 'applicant' | 'provider' | 'admin';
  applications?: Application[];
  savedScholarships?: string[];
  scholarships?: Scholarship[];
}

export function RealTimeDashboardStats({
  userRole = 'applicant',
  applications = [],
  savedScholarships = [],
  scholarships = []
}: DashboardStatsProps) {
  const { stats } = useDashboardStore();

  const getApplicantStats = () => [
    {
      id: 'applications',
      title: 'Total Applications',
      value: applications.length,
      change: stats?.applicationsChange || '+2',
      icon: FileText,
      color: 'bg-gradient-to-br from-blue-100 to-blue-200',
      iconColor: 'text-blue-700',
      changeColor: 'text-green-600'
    },
    {
      id: 'review',
      title: 'In Review',
      value: applications.filter(a => a.status === ApplicationStatus.PENDING).length,
      change: stats?.reviewChange || '+1',
      icon: Clock,
      color: 'bg-gradient-to-br from-yellow-100 to-amber-200',
      iconColor: 'text-yellow-700',
      changeColor: 'text-green-600'
    },
    {
      id: 'accepted',
      title: 'Accepted',
      value: applications.filter(a => a.status === 'ACCEPTED').length,
      change: stats?.acceptedChange || '0',
      icon: CheckCircle,
      color: 'bg-gradient-to-br from-green-100 to-emerald-200',
      iconColor: 'text-green-700',
      changeColor: 'text-green-600'
    },
    {
      id: 'saved',
      title: 'Saved',
      value: savedScholarships.length,
      change: stats?.savedChange || '+3',
      icon: Heart,
      color: 'bg-gradient-to-br from-purple-100 to-purple-200',
      iconColor: 'text-purple-700',
      changeColor: 'text-green-600'
    }
  ];

  const getProviderStats = () => [
    {
      id: 'scholarships',
      title: 'Active Scholarships',
      value: stats?.activeScholarships || scholarships.length,
      change: stats?.scholarshipsChange || '+1',
      icon: Award,
      color: 'bg-gradient-to-br from-blue-100 to-blue-200',
      iconColor: 'text-blue-700',
      changeColor: 'text-green-600'
    },
    {
      id: 'applications',
      title: 'Total Applications',
      value: stats?.totalApplications || applications.length,
      change: stats?.applicationsChange || '+7',
      icon: FileText,
      color: 'bg-gradient-to-br from-green-100 to-emerald-200',
      iconColor: 'text-green-700',
      changeColor: 'text-green-600'
    },
    {
      id: 'pending',
      title: 'Pending Review',
      value: stats?.pendingReview || applications.filter(a => a.status === ApplicationStatus.PENDING).length,
      change: stats?.pendingChange || '+3',
      icon: Clock,
      color: 'bg-gradient-to-br from-yellow-100 to-amber-200',
      iconColor: 'text-yellow-700',
      changeColor: 'text-orange-600'
    },
    {
      id: 'views',
      title: 'Profile Views',
      value: stats?.profileViews || 0,
      change: stats?.viewsChange || '+18',
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-purple-100 to-purple-200',
      iconColor: 'text-purple-700',
      changeColor: 'text-green-600'
    }
  ];

  const getAdminStats = () => [
    {
      id: 'users',
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      change: stats?.usersChange || '+23',
      icon: Users,
      color: 'bg-gradient-to-br from-blue-100 to-blue-200',
      iconColor: 'text-blue-700',
      changeColor: 'text-green-600'
    },
    {
      id: 'scholarships',
      title: 'Active Scholarships',
      value: stats?.activeScholarships || 0,
      change: stats?.scholarshipsChange || '+5',
      icon: Award,
      color: 'bg-gradient-to-br from-green-100 to-emerald-200',
      iconColor: 'text-green-700',
      changeColor: 'text-green-600'
    },
    {
      id: 'applications',
      title: 'Total Applications',
      value: stats?.totalApplications || 0,
      change: stats?.applicationsChange || '+34',
      icon: FileText,
      color: 'bg-gradient-to-br from-cyan-100 to-cyan-200',
      iconColor: 'text-cyan-700',
      changeColor: 'text-green-600'
    },
    {
      id: 'issues',
      title: 'Open Issues',
      value: stats?.openIssues || 0,
      change: stats?.issuesChange || '-2',
      icon: AlertTriangle,
      color: 'bg-gradient-to-br from-orange-100 to-orange-200',
      iconColor: 'text-orange-700',
      changeColor: 'text-green-600'
    }
  ];

  const getStatsByRole = () => {
    switch (userRole) {
      case 'provider':
        return getProviderStats();
      case 'admin':
        return getAdminStats();
      default:
        return getApplicantStats();
    }
  };

  const statsData = getStatsByRole();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        
        return (
          <Card key={stat.id} className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300 h-full relative overflow-hidden">
            <CardContent className="flex items-center p-6">
              <div className={`flex items-center justify-center w-12 h-12 rounded-lg mr-4 shadow-sm ${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{stat.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
            
            {/* Real-time indicator */}
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
