'use client';

import React from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface ModalConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'success' | 'info';
  loading?: boolean;
}

export default function ModalConfirm({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false
}: ModalConfirmProps) {
  const { t } = useLanguage();
  
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: <AlertTriangle className="w-12 h-12 text-red-600" />,
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      icon: <AlertTriangle className="w-12 h-12 text-yellow-600" />,
      confirmClass: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    success: {
      icon: <CheckCircle className="w-12 h-12 text-green-600" />,
      confirmClass: 'bg-green-600 hover:bg-green-700 text-white'
    },
    info: {
      icon: <Info className="w-12 h-12 text-blue-600" />,
      confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  };

  const config = variantConfig[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            {config.icon}
            <h3 className="mt-4 text-xl font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{description}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 ${config.confirmClass}`}
            >
              {loading ? t('modalForm.processing') : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
