'use client';

import { useI18n, Locale } from '@/lib/i18n';
import { Globe } from 'lucide-react';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'zh' : 'en');
  };

  return (
    <button
      onClick={toggleLocale}
      className={`flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors ${className}`}
      title={locale === 'en' ? 'Switch to Chinese' : '切换到英文'}
    >
      <Globe className="h-4 w-4" />
      <span>{locale === 'en' ? '中文' : 'EN'}</span>
    </button>
  );
}
