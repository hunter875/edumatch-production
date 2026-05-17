'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';

interface RequestChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { subject: string; message: string }) => void;
  title?: string;
  isLoading?: boolean;
}

export function RequestChangesModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  isLoading = false,
}: RequestChangesModalProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = t('requestChangesModal.error.subjectRequired');
    }

    if (!formData.message.trim()) {
      newErrors.message = t('requestChangesModal.error.messageRequired');
    } else if (formData.message.length < 10) {
      newErrors.message = t('requestChangesModal.error.messageTooShort');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
      setFormData({ subject: '', message: '' });
      setErrors({});
    }
  };

  const handleClose = () => {
    setFormData({ subject: '', message: '' });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900">{title || t('requestChangesModal.defaultTitle')}</h3>
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
          <div className="p-6 space-y-4">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('requestChangesModal.subject')} *
              </label>
              <Input
                type="text"
                value={formData.subject}
                onChange={(e) => {
                  setFormData({ ...formData, subject: e.target.value });
                  setErrors({ ...errors, subject: '' });
                }}
                placeholder={t('requestChangesModal.subjectPlaceholder')}
                className={errors.subject ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.subject && (
                <p className="text-sm text-red-600 mt-1">{errors.subject}</p>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('requestChangesModal.message')} *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => {
                  setFormData({ ...formData, message: e.target.value });
                  setErrors({ ...errors, message: '' });
                }}
                placeholder={t('requestChangesModal.messagePlaceholder')}
                rows={5}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.message ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.message && (
                <p className="text-sm text-red-600 mt-1">{errors.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {t('requestChangesModal.charactersCount').replace('{count}', formData.message.length.toString())}
              </p>
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
              {t('requestChangesModal.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? t('requestChangesModal.sending') : t('requestChangesModal.send')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
