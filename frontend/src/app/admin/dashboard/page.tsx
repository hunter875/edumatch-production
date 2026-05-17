'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Award, FileText, TrendingUp } from 'lucide-react';
import { adminService, AdminStats } from '@/services/admin.service';
import { toast } from 'sonner';

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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const data = await adminService.getStats();
        setStats(data);
      } catch (error: any) {
        console.error('Failed to fetch admin stats:', error);
        toast.error('Không thể tải thống kê', {
          description: error.message || 'Vui lòng thử lại sau'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-100 border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Quản lý toàn bộ hệ thống học bổng
          </p>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* StatCards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
              <CardContent className="flex items-center p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mr-4 shadow-sm">
                  <Users className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                    {isLoading ? '...' : stats?.totalUsers?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="border-0 bg-gradient-to-br from-white to-green-50/30 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
              <CardContent className="flex items-center p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-200 rounded-lg mr-4 shadow-sm">
                  <Award className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-green-900 bg-clip-text text-transparent">
                    {isLoading ? '...' : stats?.totalScholarships?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-muted-foreground">Scholarships</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="border-0 bg-gradient-to-br from-white to-cyan-50/30 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
              <CardContent className="flex items-center p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-lg mr-4 shadow-sm">
                  <FileText className="h-6 w-6 text-cyan-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-cyan-900 bg-clip-text text-transparent">
                    {isLoading ? '...' : stats?.totalApplications?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-muted-foreground">Applications</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="border-0 bg-gradient-to-br from-white to-yellow-50/30 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
              <CardContent className="flex items-center p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-100 to-amber-200 rounded-lg mr-4 shadow-sm">
                  <TrendingUp className="h-6 w-6 text-yellow-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-yellow-900 bg-clip-text text-transparent">
                    {isLoading ? '...' : stats?.activeUsers?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/20 shadow-lg">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                User Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Students</span>
                  <span className="font-semibold">{isLoading ? '...' : stats?.totalStudents?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Providers</span>
                  <span className="font-semibold">{isLoading ? '...' : stats?.totalEmployers?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Admins</span>
                  <span className="font-semibold">{isLoading ? '...' : stats?.totalAdmins?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white to-cyan-50/20 shadow-lg">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-gray-900 to-cyan-900 bg-clip-text text-transparent">
                Application Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending</span>
                  <span className="font-semibold">{isLoading ? '...' : stats?.pendingApplications?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accepted</span>
                  <span className="font-semibold">{isLoading ? '...' : stats?.acceptedApplications?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rejected</span>
                  <span className="font-semibold">{isLoading ? '...' : stats?.rejectedApplications?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/20 shadow-lg">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                System Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active scholarships</span>
                  <span className="font-semibold">{isLoading ? '...' : stats?.activeScholarships?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending scholarships</span>
                  <span className="font-semibold">{isLoading ? '...' : stats?.pendingScholarships?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Inactive users</span>
                  <span className="font-semibold">{isLoading ? '...' : stats?.inactiveUsers?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
