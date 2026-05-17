'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScholarshipType} from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface CreateScholarshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (scholarshipData: {
    title: string;
    amount: number;
    type: ScholarshipType;
    deadline: string;
    university: string;
    location: string;
    description: string;
  }) => void;
}

export function CreateScholarshipModal({ isOpen, onClose, onSubmit }: CreateScholarshipModalProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: ScholarshipType.UNDERGRADUATE,
    deadline: '',
    university: '',
    location: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t('createScholarshipModal.error.titleRequired');
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = t('createScholarshipModal.error.amountRequired');
    }

    if (!formData.deadline) {
      newErrors.deadline = t('createScholarshipModal.error.deadlineRequired');
    }

    if (!formData.university.trim()) {
      newErrors.university = t('createScholarshipModal.error.universityRequired');
    }

    if (!formData.location.trim()) {
      newErrors.location = t('createScholarshipModal.error.locationRequired');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('createScholarshipModal.error.descriptionRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      amount: '',
      type: ScholarshipType.UNDERGRADUATE,
      deadline: '',
      university: '',
      location: '',
      description: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{t('createScholarshipModal.title')}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('createScholarshipModal.scholarshipTitle')} *
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('createScholarshipModal.scholarshipTitlePlaceholder')}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Amount & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('createScholarshipModal.amount')} *
              </label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder={t('createScholarshipModal.amountPlaceholder')}
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && (
                <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('createScholarshipModal.type')} *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ScholarshipType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={ScholarshipType.UNDERGRADUATE}>{t('createScholarshipModal.typeUndergraduate')}</option>
                <option value={ScholarshipType.MASTER}>{t('createScholarshipModal.typeMaster')}</option>
                <option value={ScholarshipType.RESEARCH}>{t('createScholarshipModal.typeResearch')}</option>
              </select>
            </div>
          </div>

          {/* University & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('createScholarshipModal.university')} *
              </label>
              <Input
                type="text"
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                placeholder={t('createScholarshipModal.universityPlaceholder')}
                className={errors.university ? 'border-red-500' : ''}
              />
              {errors.university && (
                <p className="text-sm text-red-600 mt-1">{errors.university}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('createScholarshipModal.location')} *
              </label>
              <Input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder={t('createScholarshipModal.locationPlaceholder')}
                className={errors.location ? 'border-red-500' : ''}
              />
              {errors.location && (
                <p className="text-sm text-red-600 mt-1">{errors.location}</p>
              )}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('createScholarshipModal.deadline')} *
            </label>
            <Input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className={errors.deadline ? 'border-red-500' : ''}
            />
            {errors.deadline && (
              <p className="text-sm text-red-600 mt-1">{errors.deadline}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('createScholarshipModal.description')} *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('createScholarshipModal.descriptionPlaceholder')}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              {t('createScholarshipModal.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {t('createScholarshipModal.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
