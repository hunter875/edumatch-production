'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApplicationStore } from '@/stores/realtimeStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApplicationStatus } from '@/types/realtime';
import { Application } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Clock, CheckCircle, XCircle, AlertCircle, Users } from 'lucide-react';

interface ApplicationStatusCardProps {
  application: Application;
  providerName?: string; // Optional, can be passed if available from scholarship data
}

export function ApplicationStatusCard({
  application,
  providerName
}: ApplicationStatusCardProps) {
  const { t } = useLanguage();
  const { applicationStatuses } = useApplicationStore();
  const status = applicationStatuses[application.id];
  
  // Use opportunityTitle from Application object (from backend ApplicationDto)
  const scholarshipTitle = application.opportunityTitle || 'Unknown Scholarship';
  
  // Parse submittedAt - can be Date or string
  const submittedAtDate = application.submittedAt 
    ? (application.submittedAt instanceof Date 
       ? application.submittedAt 
       : new Date(application.submittedAt))
    : application.createdAt || new Date();
  
  const submittedAtString = submittedAtDate.toISOString();
  
  // Use providerName from prop or fallback
  const displayProviderName = providerName || 'Provider';

  const getStatusConfig = (status?: ApplicationStatus['status']) => {
    switch (status) {
      case 'pending':
        return {
          label: t('applicationStatus.pending'),
          color: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-300',
          icon: <Clock className="h-4 w-4" />,
          description: t('applicationStatus.pendingDesc')
        };
      case 'interview':
        return {
          label: t('applicationStatus.interview'),
          color: 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-300',
          icon: <Users className="h-4 w-4" />,
          description: t('applicationStatus.interviewDesc')
        };
      case 'accepted':
        return {
          label: t('applicationStatus.accepted'),
          color: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300',
          icon: <CheckCircle className="h-4 w-4" />,
          description: t('applicationStatus.acceptedDesc')
        };
      case 'rejected':
        return {
          label: t('applicationStatus.rejected'),
          color: 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-300',
          icon: <XCircle className="h-4 w-4" />,
          description: t('applicationStatus.rejectedDesc')
        };
      case 'waitlist':
        return {
          label: t('applicationStatus.waitlist'),
          color: 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border-orange-300',
          icon: <AlertCircle className="h-4 w-4" />,
          description: t('applicationStatus.waitlistDesc')
        };
      default:
        return {
          label: t('applicationStatus.pending'),
          color: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-300',
          icon: <Clock className="h-4 w-4" />,
          description: t('applicationStatus.processing')
        };
    }
  };

  const statusConfig = getStatusConfig(status?.status);
  const lastUpdated = status?.updatedAt || submittedAt;

  return (
    <Card className="w-full border-0 bg-gradient-to-br from-white to-blue-50/20 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight mb-1 bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
              {scholarshipTitle}
            </CardTitle>
            <p className="text-sm text-gray-600">{t('applicationStatus.by')} {displayProviderName}</p>
          </div>
          <Badge 
            variant="outline" 
            className={`ml-3 flex-shrink-0 ${statusConfig.color} shadow-sm`}
          >
            <span className="flex items-center gap-1">
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{statusConfig.description}</p>
          
          {status?.notes && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-1">{t('applicationStatus.notesFrom')}</p>
              <p className="text-sm text-gray-600">{status.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
            <span>
              {t('applicationStatus.submitted')} {formatDistanceToNow(submittedAtDate, { addSuffix: true })}
            </span>
            <span>
              {t('applicationStatus.updated')} {formatDistanceToNow(new Date(status?.updatedAt || submittedAtString), { addSuffix: true })}
            </span>
          </div>
          
          {/* Show additional info if available from ApplicationDto */}
          {application.motivation && (
            <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-xs font-medium text-blue-700 mb-1">{t('applicationStatus.motivation') || 'Motivation'}</p>
              <p className="text-xs text-blue-600 line-clamp-2">{application.motivation}</p>
            </div>
          )}
        </div>
        
        {/* Progress bar for pending applications */}
        {status?.status === 'pending' && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('applicationStatus.reviewProgress')}</span>
              <span>{t('applicationStatus.stepOf').replace('{current}', '1').replace('{total}', '3')}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500 shadow-sm" 
                style={{ width: '33%' }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{t('applicationStatus.step1')}</span>
              <span>{t('applicationStatus.step2')}</span>
              <span>{t('applicationStatus.step3')}</span>
            </div>
          </div>
        )}

        {/* Interview progress */}
        {status?.status === 'interview' && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('applicationStatus.reviewProgress')}</span>
              <span>{t('applicationStatus.stepOf').replace('{current}', '2').replace('{total}', '3')}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500 shadow-sm" 
                style={{ width: '66%' }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span className="text-green-600">✓ {t('applicationStatus.step1')}</span>
              <span className="text-blue-600 font-medium">{t('applicationStatus.step2')}</span>
              <span>{t('applicationStatus.step3')}</span>
            </div>
          </div>
        )}

        {/* Success state */}
        {status?.status === 'accepted' && (
          <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-md border border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{t('applicationStatus.successful')}</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              {t('applicationStatus.checkEmail')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}