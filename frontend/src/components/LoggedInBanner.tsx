'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { X } from 'lucide-react';

export function LoggedInBanner() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Only show when authenticated and not previously dismissed in this session
    if (isAuthenticated) {
      const hidden = sessionStorage.getItem('logged_in_banner_hidden');
      setDismissed(hidden === '1');
      if (hidden === null) {
        // default to visible on first auth session
        setDismissed(false);
      }
    } else {
      setDismissed(true);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated || dismissed) return null;

  return (
    <div className="w-full bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2 text-sm">
          <div className="flex items-center gap-2 text-blue-800">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              {t('auth.loggedIn')}
            </span>
            <span>
              {t('auth.loggedInAs')}: <strong>{user?.name}</strong>{user?.email ? ` (${user.email})` : ''}
            </span>
          </div>
          <button
            aria-label="Dismiss logged in banner"
            className="p-1 rounded hover:bg-blue-100 text-blue-700"
            onClick={() => {
              setDismissed(true);
              sessionStorage.setItem('logged_in_banner_hidden', '1');
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
