'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Award,
  FileText,
  Shield,
  Edit,
  Ban,
  UserX,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuditTrail from '@/components/admin/AuditTrail';
import ModalConfirm from '@/components/admin/ModalConfirm';
import { adminService, AdminUser } from '@/services/admin.service';
import { formatDistanceToNow } from 'date-fns';

export default function AdminUserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const userData = await adminService.getUserById(parseInt(userId));
        setUser(userData);
      } catch (error: any) {
        console.error('Failed to fetch user:', error);
        toast.error('Không thể tải thông tin người dùng', {
          description: error.message || 'Vui lòng thử lại sau'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const handleImpersonate = () => {
    console.log('Impersonating user:', userId);
    // TODO: Implement impersonation logic
    setShowImpersonateModal(false);
  };

  const handleBanUser = async () => {
    try {
      await adminService.toggleUserStatus(parseInt(userId));
      toast.success('Đã cập nhật trạng thái người dùng');
      setShowBanModal(false);
      // Refresh user data
      const userData = await adminService.getUserById(parseInt(userId));
      setUser(userData);
    } catch (error: any) {
      toast.error('Không thể cập nhật trạng thái', {
        description: error.message || 'Vui lòng thử lại sau'
      });
    }
  };

  const handleDeleteUser = async () => {
    try {
      await adminService.deleteUser(parseInt(userId));
      toast.success('Đã xóa người dùng');
      setShowDeleteModal(false);
      router.push('/admin/users');
    } catch (error: any) {
      toast.error('Không thể xóa người dùng', {
        description: error.message || 'Vui lòng thử lại sau'
      });
    }
  };

  const getRoleColor = (roles: string[]) => {
    if (roles.includes('ROLE_ADMIN')) return 'bg-purple-100 text-purple-700';
    if (roles.includes('ROLE_EMPLOYER')) return 'bg-blue-100 text-blue-700';
    if (roles.includes('ROLE_USER')) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getRoleLabel = (roles: string[]) => {
    if (roles.includes('ROLE_ADMIN')) return 'Admin';
    if (roles.includes('ROLE_EMPLOYER')) return 'Provider';
    if (roles.includes('ROLE_USER')) return 'Student';
    return 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
            <p className="text-gray-500 mt-1">View and manage user details</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImpersonateModal(true)}>
            <UserX className="w-4 h-4 mr-2" />
            Impersonate
          </Button>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <Button variant="outline" onClick={() => setShowBanModal(true)}>
            <Ban className="w-4 h-4 mr-2" />
            {user.enabled ? 'Lock User' : 'Unlock User'}
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete User
          </Button>
        </div>
      </div>

      {/* User Overview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
              {(user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || 'U')
                .split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                </h2>
                <Badge className={getRoleColor(user.roles || [])}>
                  {getRoleLabel(user.roles || [])}
                </Badge>
                <Badge variant={user.enabled ? 'default' : 'secondary'}>
                  {user.enabled ? 'ACTIVE' : 'LOCKED'}
                </Badge>
                {user.status && (
                  <Badge variant="outline">
                    {user.status}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'Unknown'}</span>
                </div>
                {user.subscriptionType && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Shield className="w-4 h-4" />
                    <span>Subscription: {user.subscriptionType}</span>
                  </div>
                )}
                {user.organizationId && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Award className="w-4 h-4" />
                    <span>Organization ID: {user.organizationId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile Details</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="activity">Activity & Audit Logs</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Username</p>
                  <p className="font-medium">{user.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">
                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                {user.sex && (
                  <div>
                    <p className="text-sm text-gray-500">Gender</p>
                    <p className="font-medium">{user.sex}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{user.enabled ? 'Active' : 'Locked'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Roles</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {user.roles?.map((role, index) => (
                      <Badge key={index} className={getRoleColor([role])}>
                        {getRoleLabel([role])}
                      </Badge>
                    ))}
                  </div>
                </div>
                {user.organizationId && (
                  <div>
                    <p className="text-sm text-gray-500">Organization ID</p>
                    <p className="font-medium">{user.organizationId}</p>
                  </div>
                )}
                {user.subscriptionType && (
                  <div>
                    <p className="text-sm text-gray-500">Subscription</p>
                    <p className="font-medium">{user.subscriptionType}</p>
                  </div>
                )}
                {user.createdAt && (
                  <div>
                    <p className="text-sm text-gray-500">Created At</p>
                    <p className="font-medium">{new Date(user.createdAt).toLocaleString()}</p>
                  </div>
                )}
                {user.updatedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Updated At</p>
                    <p className="font-medium">{new Date(user.updatedAt).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Scholarship Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                Applications will be loaded from scholarship service
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity & Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                Audit logs will be loaded from audit service
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Impersonate Modal */}
      <ModalConfirm
        isOpen={showImpersonateModal}
        onClose={() => setShowImpersonateModal(false)}
        onConfirm={handleImpersonate}
        title="Impersonate User"
        description={`You are about to impersonate ${user.username}. You will see the application from their perspective. This action will be logged for security purposes.`}
        variant="warning"
        confirmText="Start Impersonation"
      />

      {/* Ban/Lock User Modal */}
      <ModalConfirm
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        onConfirm={handleBanUser}
        title={user.enabled ? "Lock User" : "Unlock User"}
        description={`Are you sure you want to ${user.enabled ? 'lock' : 'unlock'} ${user.username}? ${user.enabled ? 'They will be unable to access the platform.' : 'They will be able to access the platform again.'} This action can be reversed later.`}
        variant="warning"
        confirmText={user.enabled ? "Lock User" : "Unlock User"}
      />

      {/* Delete User Modal */}
      <ModalConfirm
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete ${user.username}? This action cannot be undone. All associated data will be permanently removed.`}
        variant="danger"
        confirmText="Delete User"
      />
    </div>
  );
}
