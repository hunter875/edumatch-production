'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  DollarSign,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateScholarshipModal } from '@/components/admin/CreateScholarshipModal';
import { EditScholarshipModal } from '@/components/admin/EditScholarshipModal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useLanguage } from '@/contexts/LanguageContext';
import adminService, { AdminScholarship } from '@/services/admin.service';

export default function ScholarshipsManagement() {
  const router = useRouter();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scholarships, setScholarships] = useState<AdminScholarship[]>([]);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 0 });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; scholarship: AdminScholarship | null }>({
    isOpen: false,
    scholarship: null
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; scholarshipId: number; scholarshipTitle: string }>({
    isOpen: false,
    scholarshipId: 0,
    scholarshipTitle: ''
  });
  const itemsPerPage = 8;

  // Fetch scholarships from API
  useEffect(() => {
    const fetchScholarships = async () => {
      try {
        setIsLoading(true);
        const status = selectedStatus === 'all' ? undefined : 
          selectedStatus === 'Active' ? 'APPROVED' :
          selectedStatus === 'Pending' ? 'PENDING' : 'REJECTED';
        
        const response = await adminService.getScholarships({
          page: currentPage - 1,
          size: itemsPerPage,
          status,
          keyword: searchQuery || undefined
        });
        
        setScholarships(response.content);
        setPagination({
          totalItems: response.totalElements,
          totalPages: response.totalPages
        });
      } catch (error: any) {
        console.error('Failed to fetch scholarships:', error);
        toast.error('Không thể tải danh sách học bổng', {
          description: error.message || 'Vui lòng thử lại sau'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchScholarships();
  }, [currentPage, selectedStatus, searchQuery]);

  // Handlers
  const handleCreateScholarship = (scholarshipData: any) => {
    toast.success(t('adminScholarships.scholarshipCreated'), {
      description: t('adminScholarships.scholarshipCreatedDesc').replace('{title}', scholarshipData.title),
    });
    // Refresh list
    setCurrentPage(1);
  };

  const handleViewScholarship = (scholarshipId: number) => {
    router.push(`/admin/scholarships/${scholarshipId}`);
  };

  const handleEditScholarship = (scholarshipId: number, scholarshipTitle: string) => {
    const scholarship = scholarships.find(s => s.id === scholarshipId);
    if (scholarship) {
      setEditModal({ isOpen: true, scholarship });
    }
  };

  const confirmEditScholarship = async (scholarshipData: any) => {
    try {
      if (editModal.scholarship) {
        // TODO: Implement update API when available
        toast.success(t('adminScholarships.scholarshipUpdated'), {
          description: t('adminScholarships.scholarshipUpdatedDesc').replace('{title}', scholarshipData.title),
        });
        setEditModal({ isOpen: false, scholarship: null });
        // Refresh list
        setCurrentPage(1);
      }
    } catch (error: any) {
      toast.error('Không thể cập nhật học bổng', {
        description: error.message || 'Vui lòng thử lại sau'
      });
    }
  };

  const handleDeleteScholarship = (scholarshipId: number, scholarshipTitle: string) => {
    setDeleteModal({ isOpen: true, scholarshipId, scholarshipTitle });
  };

  const confirmDeleteScholarship = async () => {
    try {
      await adminService.deleteScholarship(deleteModal.scholarshipId);
      toast.success(t('adminScholarships.scholarshipDeleted'), {
        description: t('adminScholarships.scholarshipDeletedDesc').replace('{title}', deleteModal.scholarshipTitle),
      });
      setDeleteModal({ isOpen: false, scholarshipId: 0, scholarshipTitle: '' });
      // Refresh list
      setCurrentPage(1);
    } catch (error: any) {
      toast.error('Không thể xóa học bổng', {
        description: error.message || 'Vui lòng thử lại sau'
      });
    }
  };

  const handleModerateScholarship = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await adminService.moderateScholarship(id, status);
      toast.success('Đã cập nhật trạng thái học bổng');
      // Refresh list
      setCurrentPage(1);
    } catch (error: any) {
      toast.error('Không thể cập nhật trạng thái', {
        description: error.message || 'Vui lòng thử lại sau'
      });
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    const upperStatus = status.toUpperCase();
    if (upperStatus === 'APPROVED' || upperStatus === 'PUBLISHED') {
      return 'bg-green-100 text-green-700';
    }
    if (upperStatus === 'PENDING') {
      return 'bg-yellow-100 text-yellow-700';
    }
    if (upperStatus === 'REJECTED' || upperStatus === 'CLOSED') {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return null;
    const upperStatus = status.toUpperCase();
    if (upperStatus === 'APPROVED' || upperStatus === 'PUBLISHED') {
      return <CheckCircle className="w-4 h-4" />;
    }
    if (upperStatus === 'PENDING') {
      return <Clock className="w-4 h-4" />;
    }
    if (upperStatus === 'REJECTED' || upperStatus === 'CLOSED') {
      return <XCircle className="w-4 h-4" />;
    }
    return null;
  };

  const getStatusLabel = (status?: string) => {
    if (!status) return 'Unknown';
    const upperStatus = status.toUpperCase();
    if (upperStatus === 'APPROVED' || upperStatus === 'PUBLISHED') {
      return t('adminScholarships.statusActive');
    }
    if (upperStatus === 'PENDING') {
      return t('adminScholarships.statusPending');
    }
    if (upperStatus === 'REJECTED') {
      return t('adminScholarships.statusRejected');
    }
    if (upperStatus === 'CLOSED') {
      return t('adminScholarships.statusExpired');
    }
    return status;
  };

  const stats = {
    total: pagination.totalItems,
    active: scholarships.filter(s => s.moderationStatus === 'APPROVED' || s.status === 'PUBLISHED').length,
    pending: scholarships.filter(s => s.moderationStatus === 'PENDING' || s.status === 'PENDING').length,
    totalApplicants: 0 // TODO: Get from API when available
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('adminScholarships.title')}</h1>
          <p className="text-gray-500 mt-1">{t('adminScholarships.subtitle')}</p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('adminScholarships.createScholarship')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-minimal">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">{t('adminScholarships.totalScholarships')}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</h3>
          </CardContent>
        </Card>
        <Card className="card-minimal">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">{t('adminScholarships.active')}</p>
            <h3 className="text-2xl font-bold text-green-600 mt-1">{stats.active}</h3>
          </CardContent>
        </Card>
        <Card className="card-minimal">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">{t('adminScholarships.pendingReview')}</p>
            <h3 className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</h3>
          </CardContent>
        </Card>
        <Card className="card-minimal">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">{t('adminScholarships.totalApplicants')}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalApplicants}</h3>
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
                placeholder={t('adminScholarships.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('adminScholarships.allStatus')}</option>
              <option value="Active">{t('adminScholarships.statusActive')}</option>
              <option value="Pending">{t('adminScholarships.statusPending')}</option>
              <option value="Expired">{t('adminScholarships.statusExpired')}</option>
            </select>

          </div>
        </CardContent>
      </Card>

      {/* Scholarships Grid */}
      {isLoading ? (
        <Card className="card-minimal">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Đang tải...</p>
          </CardContent>
        </Card>
      ) : scholarships.length === 0 ? (
        <Card className="card-minimal">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Không có học bổng nào</p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scholarships.map((scholarship) => (
          <Card key={scholarship.id} className="card-minimal card-hover">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {scholarship.title}
                  </h3>
                  <p className="text-sm text-gray-600">{scholarship.provider}</p>
                </div>
                <Badge className={`${getStatusColor(scholarship.moderationStatus || scholarship.status)} flex items-center gap-1`}>
                  {getStatusIcon(scholarship.moderationStatus || scholarship.status)}
                  {getStatusLabel(scholarship.moderationStatus || scholarship.status)}
                </Badge>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-4">
                {scholarship.amount && (
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span className="font-semibold text-gray-900">${scholarship.amount.toLocaleString()}</span>
                    {scholarship.type && (
                      <>
                        <span className="mx-2">•</span>
                        <Badge variant="secondary">{scholarship.type}</Badge>
                      </>
                    )}
                  </div>
                )}
                {scholarship.applicationDeadline && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {t('adminScholarships.deadline')}: {new Date(scholarship.applicationDeadline).toLocaleDateString()}
                  </div>
                )}
                {scholarship.university && (
                  <div className="text-sm text-gray-600">
                    {scholarship.university}
                    {scholarship.department && ` - ${scholarship.department}`}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleViewScholarship(scholarship.id)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {t('adminScholarships.view')}
                </Button>
                {(scholarship.moderationStatus === 'PENDING' || !scholarship.moderationStatus) && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-green-600 hover:text-green-700"
                      onClick={() => handleModerateScholarship(scholarship.id, 'APPROVED')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Duyệt
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleModerateScholarship(scholarship.id, 'REJECTED')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Từ chối
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Pagination */}
      <Card className="card-minimal">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {t('adminScholarships.showingResults')
                .replace('{start}', ((currentPage - 1) * itemsPerPage + 1).toString())
                .replace('{end}', Math.min(currentPage * itemsPerPage, pagination.totalItems).toString())
                .replace('{total}', pagination.totalItems.toString())}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft className="w-4 h-4" />
                {t('adminScholarships.previous')}
              </Button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages || 1, prev + 1))}
                disabled={currentPage >= (pagination.totalPages || 1) || isLoading}
              >
                {t('adminScholarships.next')}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Scholarship Modal */}
      <CreateScholarshipModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateScholarship}
      />

      {/* Edit Scholarship Modal */}
      <EditScholarshipModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, scholarship: null })}
        onSubmit={confirmEditScholarship}
        scholarship={editModal.scholarship}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, scholarshipId: 0, scholarshipTitle: '' })}
        onConfirm={confirmDeleteScholarship}
        title={t('adminScholarships.confirmDelete')}
        description={t('adminScholarships.confirmDeleteDesc')?.replace('{title}', deleteModal.scholarshipTitle) || `Bạn có chắc muốn xóa "${deleteModal.scholarshipTitle}"?`}
        variant="danger"
        confirmText={t('adminScholarships.confirmDeleteBtn')}
      />
    </div>
  );
}
