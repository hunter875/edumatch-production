'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Eye, CheckCircle, XCircle, MessageSquare, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable, { Column } from '@/components/admin/DataTable';
import FilterPanel, { FilterConfig } from '@/components/admin/FilterPanel';
import ModalForm, { FormField } from '@/components/admin/ModalForm';
import StatCard from '@/components/admin/StatCard';
import { Report } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminReportsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const reports: Report[] = [];

  const filters: FilterConfig[] = [
    {
      key: 'status',
      label: t('adminReports.filters.status'),
      type: 'multi-select',
      options: [
        { label: t('adminReports.status.new'), value: 'PENDING' },
        { label: t('adminReports.status.resolved'), value: 'RESOLVED' },
        { label: t('adminReports.status.dismissed'), value: 'DISMISSED' }
      ]
    },
    {
      key: 'priority',
      label: t('adminReports.filters.priority'),
      type: 'multi-select',
      options: [
        { label: t('adminReports.priority.low'), value: 'LOW' },
        { label: t('adminReports.priority.medium'), value: 'MEDIUM' },
        { label: t('adminReports.priority.high'), value: 'HIGH' },
        { label: t('adminReports.priority.critical'), value: 'CRITICAL' }
      ]
    },
    {
      key: 'category',
      label: t('adminReports.filters.category'),
      type: 'select',
      options: [
        { label: t('adminReports.category.spam'), value: 'Spam' },
        { label: t('adminReports.category.harassment'), value: 'Harassment' },
        { label: t('adminReports.category.fakeInfo'), value: 'Misleading Information' },
        { label: t('adminReports.category.inappropriate'), value: 'Inappropriate' },
        { label: t('adminReports.category.other'), value: 'Other' }
      ]
    },
    {
      key: 'targetType',
      label: t('adminReports.filters.targetType'),
      type: 'select',
      options: [
        { label: t('adminReports.targetType.user'), value: 'USER' },
        { label: t('adminReports.targetType.scholarship'), value: 'SCHOLARSHIP' }
      ]
    }
  ];

  const filteredReports = reports.filter((report) => {
    const matchesStatus = !filterValues.status?.length || filterValues.status.includes(report.status);
    const matchesPriority = !filterValues.priority?.length || filterValues.priority.includes(report.priority);
    const matchesCategory = !filterValues.category || report.category === filterValues.category;
    const matchesTargetType = !filterValues.targetType || report.targetType === filterValues.targetType;

    return matchesStatus && matchesPriority && matchesCategory && matchesTargetType;
  });

  const stats = {
    total: reports.length,
    new: reports.filter((r) => r.status === 'PENDING').length,
    inReview: 0,
    resolved: reports.filter((r) => r.status === 'RESOLVED').length
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW': return <Badge variant="default">{t('adminReports.status.new')}</Badge>;
      case 'IN_REVIEW': return <Badge className="bg-blue-100 text-blue-700">{t('adminReports.status.inReview')}</Badge>;
      case 'RESOLVED': return <Badge className="bg-green-100 text-green-700">{t('adminReports.status.resolved')}</Badge>;
      case 'DISMISSED': return <Badge variant="secondary">{t('adminReports.status.dismissed')}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const resolveFields: FormField[] = [
    {
      name: 'action',
      label: t('adminReports.modal.actionTaken'),
      type: 'select',
      required: true,
      options: [
        { label: t('adminReports.modal.actionRemoved'), value: 'removed' },
        { label: t('adminReports.modal.actionWarned'), value: 'warned' },
        { label: t('adminReports.modal.actionBanned'), value: 'banned' },
        { label: t('adminReports.modal.actionDismissed'), value: 'dismissed' },
        { label: t('adminReports.modal.actionInsufficient'), value: 'insufficient' }
      ]
    },
    {
      name: 'note',
      label: t('adminReports.modal.adminNote'),
      type: 'textarea',
      required: true,
      placeholder: t('adminReports.modal.notePlaceholder'),
      rows: 4
    }
  ];

  const columns: Column<Report>[] = [
    {
      key: 'priority',
      label: t('adminReports.table.priority'),
      sortable: true,
      render: (report) => (
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-5 h-5 ${getPriorityColor(report.priority ?? 'LOW')}`} />
          <span className={`font-medium ${getPriorityColor(report.priority ?? 'LOW')}`}>
            {report.priority ? t(`adminReports.priority.${report.priority.toLowerCase()}`) : t('adminReports.priority.low')}
          </span>
        </div>
      )
    },
    {
      key: 'reporter',
      label: t('adminReports.table.reporter'),
      sortable: true,
      render: (report) => (
        <div>
          <div className="font-medium text-gray-900">{report.reporterName}</div>
          <div className="text-sm text-gray-500">{report.reporterEmail}</div>
        </div>
      )
    },
    {
      key: 'target',
      label: t('adminReports.table.target'),
      render: (report) => (
        <div>
          <Badge variant="outline" className="mb-1">{t(`adminReports.targetType.${report.targetType.toLowerCase()}`)}</Badge>
        </div>
      )
    },
    {
      key: 'reason',
      label: t('adminReports.table.reason'),
      sortable: true,
      render: (report) => (
        <div>
          <div className="font-medium text-gray-900">{report.category}</div>
          <div className="text-sm text-gray-500">{report.description}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: t('adminReports.table.status'),
      sortable: true,
      render: (report) => getStatusBadge(report.status)
    },
    {
      key: 'createdAt',
      label: t('adminReports.table.reported'),
      sortable: true,
      render: (report) => new Date(report.createdAt).toLocaleDateString()
    },
    {
      key: 'actions',
      label: t('adminReports.table.actions'),
      render: (report) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedReport(report);
              // Show detail modal or navigate
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {report.status !== 'RESOLVED' && report.status !== 'DISMISSED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedReport(report);
                setShowResolveModal(true);
              }}
            >
              <CheckCircle className="w-4 h-4 text-green-600" />
            </Button>
          )}
        </div>
      )
    }
  ];

  const handleResolve = (data: Record<string, any>) => {
    console.log('Resolving report:', selectedReport?.id, data);
    // TODO: API call
    setShowResolveModal(false);
    setSelectedReport(null);
    toast.success(t('adminReports.toast.success'), {
      description: t('adminReports.toast.description'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('adminReports.title')}</h1>
          <p className="text-gray-500 mt-1">{t('adminReports.subtitle')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title={t('adminReports.stats.total')}
          value={stats.total}
          icon={<Flag className="w-6 h-6 text-blue-600" />}
        />
        <StatCard
          title={t('adminReports.stats.new')}
          value={stats.new}
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
          trend="up"
          change={3}
        />
        <StatCard
          title={t('adminReports.stats.inReview')}
          value={stats.inReview}
          icon={<Eye className="w-6 h-6 text-yellow-600" />}
        />
        <StatCard
          title={t('adminReports.stats.resolved')}
          value={stats.resolved}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <FilterPanel
            filters={filters}
            values={filterValues}
            onChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
            onClear={() => setFilterValues({})}
          />
        </CardContent>
      </Card>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredReports}
        pagination
        pageSize={10}
        emptyMessage={t('adminReports.emptyMessage')}
      />

      {/* Resolve Modal */}
      <ModalForm
        isOpen={showResolveModal}
        onClose={() => {
          setShowResolveModal(false);
          setSelectedReport(null);
        }}
        onSubmit={handleResolve}
        title={`${t('adminReports.modal.resolveTitle')}: ${selectedReport?.category}`}
        fields={resolveFields}
        submitText={t('adminReports.modal.resolve')}
        cancelText={t('adminReports.modal.cancel')}
      />
    </div>
  );
}
