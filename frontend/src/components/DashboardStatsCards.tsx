'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStore } from '@/stores/realtimeStore';
import { formatDistanceToNow } from 'date-fns';
import { 
  Eye, 
  FileText, 
  Sparkles, 
  Users, 
  Clock, 
  CheckCircle,
  TrendingUp,
  Activity
} from 'lucide-react';

export function DashboardStatsCards() {
  const { stats } = useDashboardStore();

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Views',
      value: stats.totalViews.toLocaleString(),
      icon: <Eye className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+12% from last week'
    },
    {
      title: 'Applications',
      value: stats.totalApplications.toLocaleString(),
      icon: <FileText className="h-5 w-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: '+8% from last week'
    },
    {
      title: 'AI Matches',
      value: stats.totalMatches.toLocaleString(),
      icon: <Sparkles className="h-5 w-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: '+23% from last week'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      icon: <Users className="h-5 w-5" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: '+5% from last week'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 animate-pulse">
                    {stat.value}
                  </p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    {stat.change}
                  </p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-full`}>
                  <span className={stat.color}>{stat.icon}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Application Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Application Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold animate-pulse">
                    {stats.pendingApplications.toLocaleString()}
                  </span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-700" 
                      style={{ width: `${(stats.pendingApplications / stats.totalApplications) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Accepted</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold animate-pulse">
                    {stats.acceptedApplications.toLocaleString()}
                  </span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-700" 
                      style={{ width: `${(stats.acceptedApplications / stats.totalApplications) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">
                  Acceptance Rate: {((stats.acceptedApplications / stats.totalApplications) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Live Activity
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-auto"></div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-md">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-800">New application submitted</span>
                <span className="text-xs text-blue-600 ml-auto">Just now</span>
              </div>
              
              <div className="flex items-center gap-3 p-2 bg-green-50 rounded-md">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-800">Application accepted</span>
                <span className="text-xs text-green-600 ml-auto">2m ago</span>
              </div>
              
              <div className="flex items-center gap-3 p-2 bg-purple-50 rounded-md">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-purple-800">AI match generated</span>
                <span className="text-xs text-purple-600 ml-auto">5m ago</span>
              </div>
            </div>
            
            <div className="pt-3 border-t mt-4">
              <p className="text-xs text-gray-500">
                Last updated: {formatDistanceToNow(new Date(stats.lastUpdated), { addSuffix: true })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}