'use client';

import React from 'react';
import { X, User, GraduationCap, DollarSign, Calendar, FileText, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminApplication } from '@/services/admin.service';

interface ViewApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: AdminApplication | null;
}

export function ViewApplicationModal({
  isOpen,
  onClose,
  application,
}: ViewApplicationModalProps) {
  const { t } = useLanguage();
  
  if (!isOpen || !application) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Under Review':
        return 'bg-blue-100 text-blue-700';
      case 'Rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('viewApplicationModal.title')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('viewApplicationModal.idLabel')}: #{application.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge className={getStatusColor(application.status)}>
              {application.status}
            </Badge>
            <span className="text-sm text-gray-500">
              {t('viewApplicationModal.submitted')}: {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>

          {/* Student Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              {t('viewApplicationModal.studentInfo')}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">{t('viewApplicationModal.name')}</p>
                <p className="font-medium text-gray-900">{application.applicantUserName || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('viewApplicationModal.email')}</p>
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {application.applicantEmail || 'N/A'}
                </p>
              </div>
              {application.gpa && (
                <div>
                  <p className="text-gray-500">{t('viewApplicationModal.gpa')}</p>
                  <p className="font-medium text-gray-900">{application.gpa.toFixed(2)}</p>
                </div>
              )}
              {application.phone && (
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{application.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Scholarship Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              {t('viewApplicationModal.scholarshipInfo')}
            </h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <p className="text-gray-500">{t('viewApplicationModal.scholarshipTitle')}</p>
                <p className="font-medium text-gray-900">{application.opportunityTitle || `Opportunity #${application.opportunityId}`}</p>
              </div>
              {application.coverLetter && (
                <div>
                  <p className="text-gray-500">Cover Letter</p>
                  <p className="font-medium text-gray-900 whitespace-pre-wrap">{application.coverLetter}</p>
                </div>
              )}
              {application.motivation && (
                <div>
                  <p className="text-gray-500">Motivation</p>
                  <p className="font-medium text-gray-900 whitespace-pre-wrap">{application.motivation}</p>
                </div>
              )}
            </div>
          </div>

          {/* Application Timeline */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              {t('viewApplicationModal.timeline')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-gray-900">{t('viewApplicationModal.applicationSubmitted')}</p>
                  <p className="text-gray-500">{application.submittedAt ? new Date(application.submittedAt).toLocaleString() : application.createdAt ? new Date(application.createdAt).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-1 border-l-2 border-gray-300 pl-2 py-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-gray-900">{t('viewApplicationModal.currentStatus')}</p>
                  <p className="text-gray-500">{application.status}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{t('viewApplicationModal.noteTitle')}:</strong> {t('viewApplicationModal.noteText')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <Button onClick={onClose} variant="outline">
            {t('viewApplicationModal.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
