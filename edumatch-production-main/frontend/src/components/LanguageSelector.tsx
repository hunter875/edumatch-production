'use client';

import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en' as const, name: 'English', flag: '🇬🇧' },
    { code: 'vi' as const, name: 'Tiếng Việt', flag: '🇻🇳' },
  ];

  const currentLang = languages.find(l => l.code === language);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:bg-gray-100"
        title={t('common.selectLanguage')}
      >
        <Globe className="h-5 w-5 text-gray-700" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase">
                {t('common.selectLanguage')}
              </p>
            </div>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center w-full px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors",
                  language === lang.code && "bg-blue-50 text-blue-700"
                )}
              >
                <span className="text-xl mr-3">{lang.flag}</span>
                <span className="flex-1 text-left font-medium">{lang.name}</span>
                {language === lang.code && (
                  <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
