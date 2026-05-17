'use client';

import React from 'react';
import { Clock, User, CheckCircle, XCircle, Edit, Trash2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface AuditLogEntry {
  id: string;
  action: string;
  actionType: string;
  adminName: string;
  details: string;
  entityType?: string;
  entityName?: string;
  createdAt: Date;
  success?: boolean;
}

interface AuditTrailProps {
  logs: AuditLogEntry[];
  maxHeight?: string;
}

export default function AuditTrail({ logs, maxHeight = '600px' }: AuditTrailProps) {
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'UPDATE':
      case 'APPROVE':
        return <Edit className="w-5 h-5 text-blue-600" />;
      case 'DELETE':
      case 'REJECT':
        return <Trash2 className="w-5 h-5 text-red-600" />;
      case 'VIEW':
        return <Eye className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
      case 'APPROVE':
        return 'bg-green-50 border-green-200';
      case 'UPDATE':
        return 'bg-blue-50 border-blue-200';
      case 'DELETE':
      case 'REJECT':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No audit logs available</p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ maxHeight, overflowY: 'auto' }}>
      {/* Timeline Line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {logs.map((log, index) => (
          <div key={log.id} className="relative pl-14">
            {/* Timeline Dot */}
            <div className={`absolute left-3 p-2 rounded-full border-2 ${getActionColor(log.actionType)} bg-white`}>
              {getActionIcon(log.actionType)}
            </div>

            {/* Log Card */}
            <div className={`border rounded-lg p-4 ${getActionColor(log.actionType)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{log.action}</span>
                    {log.success === false && (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                        Failed
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">{log.details}</p>
                  
                  {log.entityType && log.entityName && (
                    <div className="text-xs text-gray-600 mb-2">
                      <span className="font-medium">{log.entityType}:</span> {log.entityName}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{log.adminName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
