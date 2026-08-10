'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
  onCompleteProfile?: () => void; // Optional custom handler
  isPostRegistration?: boolean; // true nếu modal hiện sau đăng ký, false nếu sau đăng nhập
}

export function ProfileCompletionModal({
  isOpen,
  onClose,
  onSkip,
  onCompleteProfile,
  isPostRegistration = false,
}: ProfileCompletionModalProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const handleCompleteProfile = () => {
    console.log('📝 [ProfileModal] Navigating to profile page...');
    
    if (onCompleteProfile) {
      // Use custom handler if provided
      onCompleteProfile();
    } else {
      // Default: just navigate
      onClose();
      window.location.href = '/user/profile';
    }
  };

  const handleSkip = () => {
    onSkip();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-blue-600" />
            </div>
            <DialogTitle className="text-xl">
              {isPostRegistration
                ? t('profile.completeYourProfile') || 'Hoàn thiện hồ sơ của bạn'
                : t('profile.profileIncomplete') || 'Hồ sơ chưa đầy đủ'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            {isPostRegistration ? (
              <>
                <p className="mb-3">
                  {t('profile.postRegistrationMessage') ||
                    'Chào mừng bạn đến với EduMatch! Để có trải nghiệm tốt nhất và tăng cơ hội được chấp nhận học bổng, vui lòng hoàn thiện thông tin hồ sơ của bạn.'}
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    {t('profile.whyCompleteProfile') || 'Tại sao cần hoàn thiện hồ sơ?'}
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                    <li>{t('profile.betterMatching') || 'Tìm kiếm học bổng phù hợp hơn'}</li>
                    <li>{t('profile.higherAcceptance') || 'Tăng cơ hội được chấp nhận'}</li>
                    <li>{t('profile.fasterApplication') || 'Nộp đơn nhanh chóng hơn'}</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-900 font-medium mb-1">
                      {t('profile.incompleteWarning') ||
                        'Hồ sơ của bạn chưa đầy đủ thông tin'}
                    </p>
                    <p className="text-sm text-amber-800">
                      {t('profile.completeNowMessage') ||
                        'Vui lòng cập nhật đầy đủ thông tin cá nhân để sử dụng đầy đủ tính năng của hệ thống và tăng cơ hội được chấp nhận học bổng.'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            className="text-gray-600 hover:text-gray-900"
          >
            {isPostRegistration
              ? t('common.skipForNow') || 'Bỏ qua'
              : t('common.remindLater') || 'Nhắc lại sau'}
          </Button>
          <Button
            type="button"
            onClick={handleCompleteProfile}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {t('profile.completeNow') || 'Hoàn thiện ngay'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
