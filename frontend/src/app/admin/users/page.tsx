'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Edit, 
  Trash2,
  Mail,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserRole } from '@/types';
import { AddUserModal } from '@/components/admin/AddUserModal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { adminService, AdminUser, PaginatedResponse } from '@/services/admin.service';
import { useEffect } from 'react';

export default function UsersManagement() {
  const { t } = useLanguage();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId: string; userName: string }>({
    isOpen: false,
    userId: '',
    userName: ''
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<{ totalItems: number; totalPages: number }>({
    totalItems: 0,
    totalPages: 0
  });
  const itemsPerPage = 10;

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const role = selectedRole === 'all' ? undefined : 
          selectedRole === 'Admin' ? 'ROLE_ADMIN' :
          selectedRole === 'Provider' ? 'ROLE_EMPLOYER' : 'ROLE_USER';
        const enabled = selectedStatus === 'all' ? undefined : selectedStatus === 'Active';
        
        const response = await adminService.getUsers({
          page: currentPage - 1,
          size: itemsPerPage,
          role,
          enabled,
          keyword: searchQuery || undefined
        });
        
        setUsers(response.users as AdminUser[]);
        setPagination({
          totalItems: response.totalItems,
          totalPages: response.totalPages
        });
      } catch (error: any) {
        console.error('Failed to fetch users:', error);
        toast.error('Không thể tải danh sách người dùng', {
          description: error.message || 'Vui lòng thử lại sau'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage, selectedRole, selectedStatus, searchQuery]);

  // Handlers
  const handleAddNewUser = async (userData: any) => {
    try {
      const isEmployer = userData.role === UserRole.EMPLOYER;
      if (isEmployer) {
        await adminService.createEmployer({
          username: userData.email,
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          organizationId: userData.organizationId
        });
      } else {
        await adminService.createUser({
          username: userData.email,
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName
        });
      }
      
      toast.success(t('adminUsers.userCreated'), {
        description: t('adminUsers.userCreatedDesc').replace('{name}', userData.name || userData.email).replace('{role}', userData.role),
      });
      
      // Refresh users list
      const response = await adminService.getUsers({
        page: currentPage - 1,
        size: itemsPerPage,
        role: selectedRole === 'all' ? undefined : 
          selectedRole === 'Admin' ? 'ROLE_ADMIN' :
          selectedRole === 'Provider' ? 'ROLE_EMPLOYER' : 'ROLE_USER',
        enabled: selectedStatus === 'all' ? undefined : selectedStatus === 'Active',
        keyword: searchQuery || undefined
      });
      setUsers(response.users as AdminUser[]);
      setPagination({
        totalItems: response.totalItems,
        totalPages: response.totalPages
      });
    } catch (error: any) {
      toast.error('Không thể tạo người dùng', {
        description: error.message || 'Vui lòng thử lại sau'
      });
    }
  };

  const handleEditUser = (userId: string, userName: string) => {
    router.push(`/admin/users/${userId}`);
  };

  const handleSendEmail = (userEmail: string, userName: string) => {
    // In production, this would open an email modal
    toast.success(t('adminUsers.emailSent'), {
      description: t('adminUsers.emailSentDesc').replace('{name}', userName).replace('{email}', userEmail),
    });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setDeleteModal({ isOpen: true, userId, userName });
  };

  const confirmDeleteUser = async () => {
    try {
      await adminService.deleteUser(Number(deleteModal.userId));
      toast.success(t('adminUsers.userDeleted'), {
        description: t('adminUsers.userDeletedDesc').replace('{name}', deleteModal.userName),
      });
      
      // Refresh users list
      const response = await adminService.getUsers({
        page: currentPage - 1,
        size: itemsPerPage,
        role: selectedRole === 'all' ? undefined : 
          selectedRole === 'Admin' ? 'ROLE_ADMIN' :
          selectedRole === 'Provider' ? 'ROLE_EMPLOYER' : 'ROLE_USER',
        enabled: selectedStatus === 'all' ? undefined : selectedStatus === 'Active',
        keyword: searchQuery || undefined
      });
      setUsers(response.users as AdminUser[]);
      setPagination({
        totalItems: response.totalItems,
        totalPages: response.totalPages
      });
      
      setDeleteModal({ isOpen: false, userId: '', userName: '' });
    } catch (error: any) {
      toast.error('Không thể xóa người dùng', {
        description: error.message || 'Vui lòng thử lại sau'
      });
    }
  };

  // Transform API users to display format
  const displayUsers = users.map(user => {
    const initials = ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || user.username || 'U';
    const nameInitials = initials
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    const primaryRole = user.roles?.[0] || 'ROLE_USER';
    const roleName = primaryRole === 'ROLE_ADMIN' ? t('adminUsers.roleAdmin') : 
                     primaryRole === 'ROLE_EMPLOYER' ? t('adminUsers.roleProvider') : 
                     t('adminUsers.roleStudent');

    return {
      id: String(user.id),
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
      email: user.email,
      role: roleName,
      status: user.enabled ? t('adminUsers.statusActive') : t('adminUsers.statusInactive'),
      joinDate: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '',
      avatar: nameInitials,
      rawUser: user
    };
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-700';
      case 'Provider':
        return 'bg-blue-100 text-blue-700';
      case 'Student':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'Active' 
      ? 'bg-green-100 text-green-700' 
      : 'bg-gray-100 text-gray-700';
  };

  // Filtering is done on the backend, but we can do client-side filtering for display
  const filteredUsers = displayUsers;
  const totalPages = pagination.totalPages;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('adminUsers.title')}</h1>
          <p className="text-gray-500 mt-1">{t('adminUsers.subtitle')}</p>
        </div>
        <Button 
          onClick={() => setIsAddUserModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {t('adminUsers.addUser')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-minimal">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">{t('adminUsers.totalUsers')}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {isLoading ? '...' : pagination.totalItems}
            </h3>
          </CardContent>
        </Card>
        <Card className="card-minimal">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">{t('adminUsers.students')}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {isLoading ? '...' : users.filter(u => u.roles?.includes('ROLE_USER')).length}
            </h3>
          </CardContent>
        </Card>
        <Card className="card-minimal">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">{t('adminUsers.providers')}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {isLoading ? '...' : users.filter(u => u.roles?.includes('ROLE_EMPLOYER')).length}
            </h3>
          </CardContent>
        </Card>
        <Card className="card-minimal">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">{t('adminUsers.activeUsers')}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {isLoading ? '...' : users.filter(u => u.enabled).length}
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="card-minimal">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('adminUsers.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('adminUsers.allRoles')}</option>
              <option value="Student">{t('adminUsers.roleStudent')}</option>
              <option value="Provider">{t('adminUsers.roleProvider')}</option>
              <option value="Admin">{t('adminUsers.roleAdmin')}</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('adminUsers.allStatus')}</option>
              <option value="Active">{t('adminUsers.statusActive')}</option>
              <option value="Inactive">{t('adminUsers.statusInactive')}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="card-minimal">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('adminUsers.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('adminUsers.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('adminUsers.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('adminUsers.joinDate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('adminUsers.stats')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('adminUsers.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Đang tải...
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Không có người dùng nào
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                          {user.avatar}
                        </div>
                        <div className="ml-4">
                          <div className="font-semibold text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.joinDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.applications && t('adminUsers.applicationsCount').replace('{count}', user.applications.toString())}
                      {user.scholarships && t('adminUsers.scholarshipsCount').replace('{count}', user.scholarships.toString())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditUser(user.id, user.name)}
                          title={t('adminUsers.editUser')}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSendEmail(user.email, user.name)}
                          title={t('adminUsers.sendEmail')}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          title={t('adminUsers.deleteUser')}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {t('adminUsers.showingResults')
                .replace('{start}', (startIndex + 1).toString())
                .replace('{end}', Math.min(startIndex + itemsPerPage, pagination.totalItems).toString())
                .replace('{total}', pagination.totalItems.toString())}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                {t('adminUsers.previous')}
              </Button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                {t('adminUsers.next')}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSubmit={handleAddNewUser}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, userId: '', userName: '' })}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete "${deleteModal.userName}"? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete User"
      />
    </div>
  );
}
