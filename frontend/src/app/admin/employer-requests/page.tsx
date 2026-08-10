'use client';

import { useState, useEffect } from 'react';
import { Check, X, Building, Mail, Phone, Calendar, User, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import adminService, { AdminEmployerRequest } from '@/services/admin.service';

type OrganizationRequest = AdminEmployerRequest;

export default function EmployerRequestsPage() {
  const [requests, setRequests] = useState<OrganizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<OrganizationRequest | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalItems: 0,
    pageSize: 10,
  });

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await adminService.getEmployerRequests({
        status: statusFilter,
        page: 0,
        size: 100,
      });
      setRequests(data.requests || []);
      setPagination({
        currentPage: data.currentPage || 0,
        totalPages: data.totalPages || 0,
        totalItems: data.totalItems || 0,
        pageSize: data.pageSize || 10,
      });
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Không thể tải danh sách yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    setProcessing(true);
    const toastId = toast.loading('Đang duyệt yêu cầu...');

    try {
      await adminService.approveEmployerRequest(requestId);

      toast.success('Yêu cầu đã được duyệt thành công!', { id: toastId });
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error instanceof Error ? error.message : 'Duyệt yêu cầu thất bại', { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }

    setProcessing(true);
    const toastId = toast.loading('Đang từ chối yêu cầu...');

    try {
      await adminService.rejectEmployerRequest(selectedRequest.id, rejectionReason);

      toast.success('Yêu cầu đã bị từ chối', { id: toastId });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error instanceof Error ? error.message : 'Từ chối yêu cầu thất bại', { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Chờ duyệt</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Đã duyệt</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Đã từ chối</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Quản lý yêu cầu Employer</h1>
          <p className="text-muted-foreground">Duyệt hoặc từ chối các yêu cầu đăng ký trở thành nhà tuyển dụng</p>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="PENDING">Chờ duyệt</SelectItem>
              <SelectItem value="APPROVED">Đã duyệt</SelectItem>
              <SelectItem value="REJECTED">Đã từ chối</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests List */}
        <div className="grid gap-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Không có yêu cầu nào</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header: Organization Name + Status */}
                      <div className="flex items-center gap-3 mb-3">
                        <Building className="h-5 w-5 text-brand-blue-600 flex-shrink-0" />
                        <h3 className="text-lg font-semibold truncate">{request.organizationName}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      {/* User Info */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{request.userName || request.userEmail}</span>
                        <span className="mx-1">•</span>
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>{new Date(request.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>

                      {/* Essential Info - Compact Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        {request.organizationType && (
                          <div>
                            <span className="text-muted-foreground">Loại: </span>
                            <span className="font-medium">{request.organizationType}</span>
                          </div>
                        )}
                        {request.country && (
                          <div>
                            <span className="text-muted-foreground">Quốc gia: </span>
                            <span className="font-medium">{request.country}</span>
                          </div>
                        )}
                        {request.city && (
                          <div>
                            <span className="text-muted-foreground">Thành phố: </span>
                            <span className="font-medium">{request.city}</span>
                          </div>
                        )}
                        {request.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Email: </span>
                            <span className="font-medium truncate">{request.email}</span>
                          </div>
                        )}
                        {request.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">ĐT: </span>
                            <span className="font-medium">{request.phone}</span>
                          </div>
                        )}
                        {request.website && (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Website: </span>
                            <span className="font-medium truncate">{request.website}</span>
                          </div>
                        )}
                      </div>

                      {/* Address - if exists */}
                      {request.address && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Địa chỉ: </span>
                          <span className="font-medium">{request.address}</span>
                        </div>
                      )}

                      {/* Rejection Reason - if rejected */}
                      {request.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <span className="font-semibold text-red-600">Lý do từ chối: </span>
                          <span className="text-red-700">{request.rejectionReason}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Only for PENDING */}
                    {request.status === 'PENDING' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                          onClick={() => {
                            setSelectedRequest(request);
                            setApproveDialogOpen(true);
                          }}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Duyệt
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={() => {
                            setSelectedRequest(request);
                            setRejectDialogOpen(true);
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Từ chối
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination Info */}
        {pagination.totalItems > 0 && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Hiển thị {requests.length} / {pagination.totalItems} yêu cầu
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xác nhận duyệt yêu cầu</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn duyệt yêu cầu này? User sẽ được chuyển thành EMPLOYER và tổ chức sẽ được tạo.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">Tên tổ chức:</p>
                <p className="text-muted-foreground">{selectedRequest.organizationName}</p>
              </div>
              <div>
                <p className="font-semibold">Người yêu cầu:</p>
                <p className="text-muted-foreground">{selectedRequest.userName || selectedRequest.userEmail}</p>
              </div>
              <div>
                <p className="font-semibold">Email tổ chức:</p>
                <p className="text-muted-foreground">{selectedRequest.email || 'N/A'}</p>
              </div>
              <div>
                <p className="font-semibold">Mô tả:</p>
                <p className="text-muted-foreground">{selectedRequest.description || 'N/A'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={processing}>
              Hủy
            </Button>
            <Button
              onClick={() => selectedRequest && handleApprove(selectedRequest.id)}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Đang xử lý...' : 'Xác nhận duyệt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do từ chối yêu cầu này.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Lý do từ chối <span className="text-red-500">*</span></Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="mt-2"
                placeholder="Nhập lý do từ chối..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialogOpen(false);
              setRejectionReason('');
            }} disabled={processing}>
              Hủy
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
              variant="destructive"
            >
              {processing ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
