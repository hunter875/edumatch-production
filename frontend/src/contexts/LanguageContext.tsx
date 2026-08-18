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
const loadingNamespaces = new Map<string, Promise<void>>();
const namespaces: Namespace[] = [
  'common',
  'auth',
  'scholarship',
  'application',
  'message',
  'profile',
  'home',
  'about',
  'pricing',
  'contact',
  'dashboard',
  'provider',
  'admin',
];

async function loadNamespace(lang: Language, ns: Namespace): Promise<boolean> {
  const cacheKey = `${lang}:${ns}`;
  if (loadedTranslations[cacheKey]) return false;

  const pending = loadingNamespaces.get(cacheKey);
  if (pending) {
    await pending;
    return Boolean(loadedTranslations[cacheKey]);
  }

  const loadPromise = import(`@/locales/${lang}/${ns}.json`)
    .then((mod) => {
      loadedTranslations[cacheKey] = mod.default ?? mod;
    });

  loadingNamespaces.set(cacheKey, loadPromise);
  try {
    await loadPromise;
    return true;
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
  const [translationVersion, setTranslationVersion] = useState(0);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  }, []);

  const preloadNamespace = useCallback(async (ns: Namespace) => {
    const loaded = await loadNamespace(language, ns);
    if (loaded) {
      setTranslationVersion((version) => version + 1);
    }
  }, [language]);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'en' || saved === 'vi')) {
      setLanguageState(saved);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all(namespaces.map((ns) => loadNamespace(language, ns)))
      .then((loaded) => {
        if (!cancelled && loaded.some(Boolean)) {
          setTranslationVersion((version) => version + 1);
        }
      });

    return () => {
      cancelled = true;
    };
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
