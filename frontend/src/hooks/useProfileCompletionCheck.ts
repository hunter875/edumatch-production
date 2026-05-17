'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { isProfileComplete, clearProfileCompletionSkipped } from '@/lib/profile-utils';

/**
 * Hook to manage profile completion prompt
 * Automatically shows modal on dashboard/main pages if profile is incomplete
 */
export function useProfileCompletionCheck() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Don't check until auth is loaded
    if (isLoading || hasChecked) {
      return;
    }

    // Only check for authenticated users
    if (isAuthenticated && user) {
      // Always check if profile is complete (không cần check skip flag)
      const profileComplete = isProfileComplete(user);
      console.log('🔍 Profile check:', { profileComplete, user: user.profile });
      setShouldShowModal(!profileComplete);
      setHasChecked(true);
    }
  }, [user, isAuthenticated, isLoading, hasChecked]);

  const hideModal = () => {
    setShouldShowModal(false);
  };

  const onProfileCompleted = () => {
    clearProfileCompletionSkipped();
    setShouldShowModal(false);
  };

  return {
    shouldShowModal,
    hideModal,
    onProfileCompleted,
  };
}
