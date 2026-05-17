'use client';

import React, { useState } from 'react';
import { DollarSign, CreditCard, RefreshCw, TrendingUp, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable, { Column } from '@/components/admin/DataTable';
import FilterPanel, { FilterConfig } from '@/components/admin/FilterPanel';
import ModalConfirm from '@/components/admin/ModalConfirm';
import StatCard from '@/components/admin/StatCard';
import CSVExportButton from '@/components/admin/CSVExportButton';
import { Transaction } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminTransactionsPage() {
  const { t } = useLanguage();
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Transaction[]>([]);
  const transactions: Transaction[] = [];

  const filters: FilterConfig[] = [
    {
      key: 'status',
      label: t('adminTransactions.filters.status'),
      type: 'multi-select',
      options: [
        { label: t('adminTransactions.status.pending'), value: 'PENDING' },
        { label: t('adminTransactions.status.completed'), value: 'COMPLETED' },
        { label: t('adminTransactions.status.failed'), value: 'FAILED' },
        // No 'REFUNDED' status in Transaction type
      ]
    },
    {
      key: 'type',
      label: t('adminTransactions.filters.type'),
      type: 'multi-select',
      options: [
        { label: t('adminTransactions.type.subscription'), value: 'SUBSCRIPTION' },
        { label: t('adminTransactions.type.applicationFee'), value: 'APPLICATION_FEE' },
        // No 'REFUND' or 'CREDIT' type in Transaction type
      ]
    },
    {
      key: 'paymentMethod',
      label: t('adminTransactions.filters.paymentMethod'),
      type: 'select',
      options: [
        // No paymentMethod in Transaction type
      ]
    },
    {
      key: 'dateRange',
      label: t('adminTransactions.filters.dateRange'),
      type: 'date-range'
    }
  ];

  const filteredTransactions = transactions.filter((tx: Transaction) => {
    const matchesStatus = !filterValues.status?.length || filterValues.status.includes(tx.status);
    const matchesType = !filterValues.type?.length || filterValues.type.includes(tx.type);

    if (filterValues.dateRange?.from || filterValues.dateRange?.to) {
      const txDate = new Date(tx.createdAt);
      if (filterValues.dateRange.from && txDate < new Date(filterValues.dateRange.from)) return false;
      if (filterValues.dateRange.to && txDate > new Date(filterValues.dateRange.to)) return false;
    }

    return matchesStatus && matchesType;
  });

  const stats = {
    totalRevenue: transactions
      .filter((t: Transaction) => t.status === 'COMPLETED')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0),
    pendingCount: transactions.filter((t: Transaction) => t.status === 'PENDING').length,
    completedCount: transactions.filter((t: Transaction) => t.status === 'COMPLETED').length
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge className="bg-yellow-100 text-yellow-700">{t('adminTransactions.status.pending')}</Badge>;
      case 'COMPLETED': return <Badge className="bg-green-100 text-green-700">{t('adminTransactions.status.completed')}</Badge>;
      case 'FAILED': return <Badge variant="destructive">{t('adminTransactions.status.failed')}</Badge>;
      case 'REFUNDED': return <Badge variant="secondary">{t('adminTransactions.status.refunded')}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'SUBSCRIPTION': return <Badge variant="default">{t('adminTransactions.type.subscription')}</Badge>;
      case 'APPLICATION_FEE': return <Badge className="bg-blue-100 text-blue-700">{t('adminTransactions.type.applicationFee')}</Badge>;
      case 'REFUND': return <Badge className="bg-red-100 text-red-700">{t('adminTransactions.type.refund')}</Badge>;
      case 'CREDIT': return <Badge className="bg-purple-100 text-purple-700">{t('adminTransactions.type.credit')}</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'id',
      label: t('adminTransactions.table.transactionId'),
      sortable: true,
      render: (tx) => <span className="font-mono text-sm">{tx.id}</span>
    },
    {
      key: 'user',
      label: t('adminTransactions.table.user'),
      sortable: true,
      render: (tx) => {
        return (
          <div>
            <div className="font-medium text-gray-900">{tx.userId}</div>
            <div className="text-sm text-gray-500">-</div>
          </div>
        );
      }
    },
    {
      key: 'type',
      label: t('adminTransactions.table.type'),
      sortable: true,
      render: (tx) => getTypeBadge(tx.type)
    },
    {
      key: 'amount',
      label: t('adminTransactions.table.amount'),
      sortable: true,
      render: (tx) => (
        <span className={`font-semibold ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
          ${Math.abs(tx.amount).toFixed(2)}
        </span>
      )
    },
    {
      key: 'status',
      label: t('adminTransactions.table.status'),
      sortable: true,
      render: (tx) => getStatusBadge(tx.status)
    },
    {
      key: 'createdAt',
      label: t('adminTransactions.table.date'),
      sortable: true,
      render: (tx) => (
        <div className="text-sm">
          <div>{new Date(tx.createdAt).toLocaleDateString()}</div>
          <div className="text-gray-500">{new Date(tx.createdAt).toLocaleTimeString()}</div>
        </div>
      )
    },
    {
      key: 'actions',
      label: t('adminTransactions.table.actions'),
      render: (tx) => (
        <div className="flex gap-2">
          {/* Refund logic removed, not supported by Transaction type */}
        </div>
      )
    }
  ];

  const handleRefund = () => {
    console.log('Processing refund for transaction:', selectedTransaction?.id);
    // TODO: API call to process refund
    setShowRefundModal(false);
    toast.success(t('adminTransactions.toast.refundSuccess'), {
      description: t('adminTransactions.toast.refundDescription'),
    });
    setSelectedTransaction(null);
  };

  const exportData = filteredTransactions.map((tx: Transaction) => ({
    'Transaction ID': tx.id,
    'User': tx.userId,
    'Email': '',
    'Type': tx.type,
    'Amount': tx.amount,
    'Status': tx.status,
    'Date': new Date(tx.createdAt).toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('adminTransactions.title')}</h1>
          <p className="text-gray-500 mt-1">{t('adminTransactions.subtitle')}</p>
        </div>
        <CSVExportButton
          data={exportData}
          filename="transactions"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title={t('adminTransactions.stats.totalRevenue')}
          value={`$${stats.totalRevenue.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          trend="up"
          change={12.5}
          changeLabel={t('adminTransactions.stats.vsLastMonth')}
        />
        <StatCard
          title={t('adminTransactions.stats.pending')}
          value={stats.pendingCount}
          icon={<CreditCard className="w-6 h-6 text-yellow-600" />}
        />
        <StatCard
          title={t('adminTransactions.stats.completed')}
          value={stats.completedCount}
          icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
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
        data={filteredTransactions}
        selectable
        onSelectionChange={setSelectedRows}
        pagination
        pageSize={15}
        emptyMessage={t('adminTransactions.emptyMessage')}
      />

      {/* Refund Modal */}
      <ModalConfirm
        isOpen={showRefundModal}
        onClose={() => {
          setShowRefundModal(false);
          setSelectedTransaction(null);
        }}
        onConfirm={handleRefund}
        title={t('adminTransactions.modal.refundTitle')}
        description={t('adminTransactions.modal.refundDescription')}
        confirmText={t('adminTransactions.modal.processRefund')}
        cancelText={t('adminTransactions.modal.cancel')}
        variant="warning"
      />
    </div>
  );
}
