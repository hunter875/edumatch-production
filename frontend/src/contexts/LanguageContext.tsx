'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Language = 'en' | 'vi';
type Namespace = 'common' | 'auth' | 'scholarship' | 'application' | 'message'
  | 'profile' | 'home' | 'about' | 'pricing' | 'contact'
  | 'dashboard' | 'provider' | 'admin';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number | undefined>) => string;
  /** Preload a namespace — call early to avoid flicker. Safe to call multiple times. */
  preloadNamespace: (ns: Namespace) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// ---- Lazy-loaded translation store ----
const loadedTranslations: Record<string, Record<string, string>> = {};
const loadingNamespaces = new Set<string>();

async function loadNamespace(lang: Language, ns: Namespace): Promise<void> {
  const cacheKey = `${lang}:${ns}`;
  if (loadedTranslations[cacheKey] || loadingNamespaces.has(cacheKey)) return;
  loadingNamespaces.add(cacheKey);
  try {
    const mod = await import(`@/locales/${lang}/${ns}.json`);
    loadedTranslations[cacheKey] = mod.default ?? mod;
  } finally {
    loadingNamespaces.delete(cacheKey);
  }
}

// ---- Key → namespace mapping (extracted from original translations) ----
const namespacePrefixes: [RegExp, Namespace][] = [
  [/^(nav\.|common\.|footer\.|notifications\.|userMenu\.|toast\.)/, 'common'],
  [/^(auth\.|login\.|register\.|forgotPassword\.|roles\.)/, 'auth'],
  [/^scholarship/, 'scholarship'],
  [/^(application|apply)/, 'application'],
  [/^(message|chat)/, 'message'],
  [/^(profile\.|settings\.)/, 'profile'],
  [/^home\./, 'home'],
  [/^about\./, 'about'],
  [/^pricing\./, 'pricing'],
  [/^contact\./, 'contact'],
  [/^(dashboard\.|analytics\.|report)/, 'dashboard'],
  [/^(provider\.|employer)/, 'provider'],
  [/^(admin|modal)/, 'admin'],
];

function namespaceForKey(key: string): Namespace {
  for (const [regex, ns] of namespacePrefixes) {
    if (regex.test(key)) return ns;
  }
  return 'common';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'en' || saved === 'vi')) {
      setLanguageState(saved);
    }
    // Preload the common namespace so it's available immediately
    preloadNamespace('common');
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  }, []);

  const preloadNamespace = useCallback(async (ns: Namespace) => {
    await loadNamespace(language, ns);
  }, [language]);

  const t = useCallback((key: string, params?: Record<string, string | number | undefined>): string => {
    const ns = namespaceForKey(key);
    const cacheKey = `${language}:${ns}`;
    let translation = loadedTranslations[cacheKey]?.[key] || key;

    // Replace parameters if provided
    if (params) {
      for (const [paramKey, value] of Object.entries(params)) {
        if (value !== undefined) {
          translation = translation.replace(`{${paramKey}}`, String(value));
        }
      }
    }

    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, preloadNamespace }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
