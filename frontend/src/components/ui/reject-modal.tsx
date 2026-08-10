'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  title: string;
  description?: string;
  placeholder?: string;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export function RejectModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  placeholder,
  submitText = 'Submit',
  cancelText = 'Cancel',
  isLoading = false,
}: RejectModalProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError(t('rejectModal.reasonRequired'));
      return;
    }

    onSubmit(reason);
    setReason('');
    setError('');
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {description && (
              <p className="text-gray-600 mb-4">{description}</p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('rejectModal.reason')} *
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError('');
                }}
                placeholder={placeholder || t('rejectModal.reasonPlaceholder')}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 p-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? t('rejectModal.submitting') : submitText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
