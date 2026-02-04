'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Locale = 'en' | 'zh';

// Nested translation object type
type TranslationValue = string | string[] | { [key: string]: TranslationValue };
type Translations = { [key: string]: TranslationValue };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

// Load translations
import en from './locales/en.json';
import zh from './locales/zh.json';

const translations: Record<Locale, Translations> = { en, zh };

// Get nested value from object using dot notation
function getNestedValue(obj: Translations, path: string): string {
  const keys = path.split('.');
  let value: TranslationValue = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && !Array.isArray(value) && key in value) {
      value = value[key];
    } else {
      return path; // Return key if not found
    }
  }

  return typeof value === 'string' ? value : path;
}

// Get nested array from object using dot notation
function getNestedArray(obj: Translations, path: string): string[] {
  const keys = path.split('.');
  let value: TranslationValue = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && !Array.isArray(value) && key in value) {
      value = value[key];
    } else {
      return []; // Return empty array if not found
    }
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

// Replace parameters in string
function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [isClient, setIsClient] = useState(false);

  // Initialize locale from URL or localStorage on client
  useEffect(() => {
    setIsClient(true);

    // Check URL query parameter first
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');

    if (langParam === 'zh' || langParam === 'en') {
      setLocaleState(langParam);
      localStorage.setItem('locale', langParam);
      return;
    }

    // Fall back to localStorage
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved === 'zh' || saved === 'en') {
      setLocaleState(saved);
    }
  }, []);

  // Watch for URL changes
  useEffect(() => {
    if (!isClient) return;

    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const langParam = params.get('lang');
      if (langParam === 'zh' || langParam === 'en') {
        setLocaleState(langParam);
        localStorage.setItem('locale', langParam);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [isClient]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);

    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLocale);
    window.history.pushState({}, '', url.toString());
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(translations[locale], key);
    return interpolate(value, params);
  };

  const tArray = (key: string): string[] => {
    return getNestedArray(translations[locale], key);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, tArray }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useLocale() {
  const { locale } = useI18n();
  return locale;
}

export function useTranslation() {
  const { t } = useI18n();
  return t;
}
