'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  MessageSquare,
  Edit,
  Eye,
  DollarSign,
  Calendar,
  MapPin,
  Building,
  Users,
  Flag,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { RejectModal } from '@/components/ui/reject-modal';
import { RequestChangesModal } from '@/components/ui/request-changes-modal';
import { toast } from 'sonner';
import adminService from '@/services/admin.service';
import { mapOpportunityDtoToScholarship } from '@/lib/scholarship-mapper';

interface ScholarshipData {
  id: number;
  title: string;
  description?: string;
  amount?: number;
  applicationDeadline?: string;
  location?: string;
  university?: string;
  department?: string;
  moderationStatus?: string;
  status?: string;
  minGpa?: number;
  studyMode?: string;
  level?: string;
  isPublic?: boolean;
  requiredSkills?: string[];
  tags?: string[];
  viewsCnt?: number;
  creatorUserId?: number;
  organizationId?: number;
  contactEmail?: string;
  website?: string;
  startDate?: string;
  endDate?: string;
  scholarshipAmount?: number;
}

export default function AdminScholarshipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scholarshipId = params.id as string;

  const [scholarship, setScholarship] = useState<ScholarshipData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch scholarship data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const id = parseInt(scholarshipId);
        if (isNaN(id)) {
          toast.error('Invalid scholarship ID');
          router.push('/admin/scholarships');
          return;
        }

        // Fetch scholarship details
        const response = await adminService.getScholarshipById(id);
        const opp = response.opportunity || response;
        setScholarship(opp);

        // Fetch applications for this scholarship
        try {
          const appsResponse = await adminService.getApplications({
            opportunityId: id,
            page: 0,
            size: 100
          });
          setApplications(appsResponse.content || []);
        } catch (error) {
          console.error('Error fetching applications:', error);
          setApplications([]);
        }
      } catch (error: any) {
        console.error('Error fetching scholarship:', error);
        toast.error('Không thể tải thông tin học bổng', {
          description: error.message || 'Vui lòng thử lại sau'
        });
        router.push('/admin/scholarships');
      } finally {
        setIsLoading(false);
      }
    };

    if (scholarshipId) {
      fetchData();
    }
  }, [scholarshipId, router]);

  const handleApprove = async () => {
    try {
      const id = parseInt(scholarshipId);
      await adminService.moderateScholarship(id, 'APPROVED');
      setShowApproveModal(false);
      toast.success('Học bổng đã được duyệt!', {
        description: `${scholarship?.title} đã được xuất bản và nhà cung cấp đã được thông báo.`,
      });
      // Refresh data
      const response = await adminService.getScholarshipById(id);
      const opp = response.opportunity || response;
      setScholarship(opp);
    } catch (error: any) {
      toast.error('Không thể duyệt học bổng', {
        description: error.message || 'Vui lòng thử lại sau'
      });
    }
  };

  const handleReject = async (reason: string) => {
    try {
      const id = parseInt(scholarshipId);
      await adminService.moderateScholarship(id, 'REJECTED');
      setShowRejectModal(false);
      toast.error('Học bổng đã bị từ chối', {
        description: `Nhà cung cấp sẽ được thông báo với lý do: ${reason}`,
      });
      // Refresh data
      const response = await adminService.getScholarshipById(id);
      const opp = response.opportunity || response;
      setScholarship(opp);
    } catch (error: any) {
      toast.error('Không thể từ chối học bổng', {
        description: error.message || 'Vui lòng thử lại sau'
      });
    }
  };

  const handleRequestChanges = (data: { subject: string; message: string }) => {
    console.log('Requesting changes:', scholarshipId, data);
    // TODO: Implement API call when available
    setShowRequestChangesModal(false);
    toast.info('Yêu cầu thay đổi đã được gửi', {
      description: `Nhà cung cấp sẽ được thông báo để cập nhật học bổng.`,
    });
  };

  const handleDelete = async () => {
    try {
      const id = parseInt(scholarshipId);
      await adminService.deleteScholarship(id);
      setShowDeleteModal(false);
      toast.success('Học bổng đã bị xóa', {
        description: `${scholarship?.title} đã được xóa vĩnh viễn.`,
      });
      setTimeout(() => router.push('/admin/scholarships'), 1500);
    } catch (error: any) {
      toast.error('Không thể xóa học bổng', {
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

  const getStatusLabel = (status?: string) => {
    if (!status) return 'Unknown';
    const upperStatus = status.toUpperCase();
    if (upperStatus === 'APPROVED' || upperStatus === 'PUBLISHED') {
      return 'Đã duyệt';
    }
    if (upperStatus === 'PENDING') {
      return 'Chờ duyệt';
    }
    if (upperStatus === 'REJECTED') {
      return 'Đã từ chối';
    }
    return status;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!scholarship) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Không tìm thấy học bổng</h2>
          <Button onClick={() => router.back()} className="mt-4">
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  const status = scholarship.moderationStatus || scholarship.status || 'PENDING';
  const canModerate = status === 'PENDING';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chi tiết học bổng</h1>
            <p className="text-gray-500 mt-1">Xem và quản lý học bổng</p>
          </div>
        </div>

        <div className="flex gap-2">
          {canModerate && (
            <>
              <Button variant="outline" onClick={() => setShowRequestChangesModal(true)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Yêu cầu sửa đổi
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectModal(true)}>
                <XCircle className="w-4 h-4 mr-2" />
                Từ chối
              </Button>
              <Button onClick={() => setShowApproveModal(true)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Duyệt
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Xóa
          </Button>
        </div>
      </div>

      {/* Scholarship Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{scholarship.title}</h2>
                <Badge className={getStatusColor(status)}>
                  {getStatusLabel(status)}
                </Badge>
              </div>
              <p className="text-gray-700 mb-4">{scholarship.description || 'Không có mô tả'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {scholarship.scholarshipAmount && (
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign className="w-5 h-5" />
                <div>
                  <p className="text-sm text-gray-500">Số tiền</p>
                  <p className="font-semibold">${scholarship.scholarshipAmount.toLocaleString()}</p>
                </div>
              </div>
            )}
            {scholarship.applicationDeadline && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-5 h-5" />
                <div>
                  <p className="text-sm text-gray-500">Hạn nộp</p>
                  <p className="font-semibold">
                    {new Date(scholarship.applicationDeadline).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            )}
            {scholarship.location && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-5 h-5" />
                <div>
                  <p className="text-sm text-gray-500">Địa điểm</p>
                  <p className="font-semibold">{scholarship.location}</p>
                </div>
              </div>
            )}
            {scholarship.university && (
              <div className="flex items-center gap-2 text-gray-600">
                <Building className="w-5 h-5" />
                <div>
                  <p className="text-sm text-gray-500">Trường đại học</p>
                  <p className="font-semibold">{scholarship.university}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Chi tiết</TabsTrigger>
          <TabsTrigger value="applications">Đơn ứng tuyển ({applications.length})</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Yêu cầu</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {scholarship.minGpa && (
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">GPA tối thiểu: {scholarship.minGpa}</span>
                    </li>
                  )}
                  {scholarship.level && (
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Cấp độ: {scholarship.level}</span>
                    </li>
                  )}
                  {scholarship.studyMode && (
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Chế độ học: {scholarship.studyMode}</span>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kỹ năng yêu cầu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scholarship.requiredSkills && scholarship.requiredSkills.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Kỹ năng bắt buộc</p>
                      <div className="flex flex-wrap gap-2">
                        {scholarship.requiredSkills.map((skill, index) => (
                          <Badge key={index} variant="default">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Không có kỹ năng yêu cầu cụ thể</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thông tin chương trình</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {scholarship.department && (
                  <div>
                    <p className="text-sm text-gray-500">Khoa</p>
                    <p className="font-medium">{scholarship.department}</p>
                  </div>
                )}
                {scholarship.studyMode && (
                  <div>
                    <p className="text-sm text-gray-500">Chế độ học</p>
                    <p className="font-medium">{scholarship.studyMode}</p>
                  </div>
                )}
                {scholarship.startDate && scholarship.endDate && (
                  <div>
                    <p className="text-sm text-gray-500">Thời gian</p>
                    <p className="font-medium">
                      {new Date(scholarship.startDate).toLocaleDateString('vi-VN')} - {new Date(scholarship.endDate).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                )}
                {scholarship.minGpa && (
                  <div>
                    <p className="text-sm text-gray-500">GPA tối thiểu</p>
                    <p className="font-medium">{scholarship.minGpa}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thống kê</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Lượt xem</p>
                  <p className="font-medium">{scholarship.viewsCnt || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Đơn ứng tuyển</p>
                  <p className="font-medium">{applications.length}</p>
                </div>
                {scholarship.contactEmail && (
                  <div>
                    <p className="text-sm text-gray-500">Email liên hệ</p>
                    <p className="font-medium">{scholarship.contactEmail}</p>
                  </div>
                )}
                {scholarship.website && (
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <a href={scholarship.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                      {scholarship.website}
                    </a>
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
              <CardTitle>Đơn ứng tuyển ({applications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {applications.length > 0 ? (
                <div className="space-y-3">
                  {applications.map(app => (
                    <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{app.applicantUserName || 'Unknown'}</h4>
                        <p className="text-sm text-gray-500">{app.applicantEmail || app.phone || 'N/A'}</p>
                        {app.gpa && (
                          <p className="text-sm text-gray-500">GPA: {app.gpa}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          app.status === 'ACCEPTED' ? 'default' :
                          app.status === 'REJECTED' ? 'destructive' :
                          'secondary'
                        }>
                          {app.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Chưa có đơn ứng tuyển nào</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Modal */}
      <ConfirmModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        onConfirm={handleApprove}
        title="Duyệt học bổng"
        description={`Bạn có chắc muốn duyệt "${scholarship.title}"? Học bổng này sẽ được xuất bản và nhà cung cấp sẽ được thông báo.`}
        variant="success"
        confirmText="Duyệt và xuất bản"
      />

      {/* Reject Modal */}
      <RejectModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onSubmit={handleReject}
        title="Từ chối học bổng"
        placeholder="Giải thích lý do từ chối học bổng này (tối thiểu 10 ký tự)..."
      />

      {/* Request Changes Modal */}
      <RequestChangesModal
        isOpen={showRequestChangesModal}
        onClose={() => setShowRequestChangesModal(false)}
        onSubmit={handleRequestChanges}
        title="Yêu cầu sửa đổi"
      />

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Xóa học bổng"
        description={`Bạn có chắc muốn xóa vĩnh viễn "${scholarship.title}"? Hành động này không thể hoàn tác.`}
        variant="danger"
        confirmText="Xóa vĩnh viễn"
      />
    </div>
  );
}
