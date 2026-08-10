'use client';

import React from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'success' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  isLoading = false,
}: ConfirmModalProps) {
  const { t } = useLanguage();
  
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-red-600" />,
          bgColor: 'bg-red-50',
          buttonColor: 'bg-red-600 hover:bg-red-700',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-12 h-12 text-green-600" />,
          bgColor: 'bg-green-50',
          buttonColor: 'bg-green-600 hover:bg-green-700',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-yellow-600" />,
          bgColor: 'bg-yellow-50',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
        };
      default:
        return {
          icon: <Info className="w-12 h-12 text-blue-600" />,
          bgColor: 'bg-blue-50',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Icon */}
          <div className={`mx-auto w-16 h-16 rounded-full ${styles.bgColor} flex items-center justify-center mb-4`}>
            {styles.icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

          {/* Description */}
          <p className="text-gray-600 mb-6">{description}</p>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              className={`flex-1 ${styles.buttonColor}`}
              disabled={isLoading}
            >
              {isLoading ? t('modalForm.processing') : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
