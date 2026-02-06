'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';
import { CookiePreferencesButton } from '@/components/CookieConsent';
import { useI18n } from '@/lib/i18n';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-bold">OneFillr</span>
            </div>
            <p className="mt-4 max-w-md text-gray-600">
              {t('hero.subtitle')}
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-gray-900">{t('footer.product')}</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="#features" className="text-gray-600 hover:text-gray-900">
                  {t('nav.features')}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
                  {t('nav.pricing')}
                </Link>
              </li>
              <li>
                <Link href="/demo" className="text-gray-600 hover:text-gray-900">
                  {t('footer.tryDemo')}
                </Link>
              </li>
              <li>
                <Link href="/download" className="text-gray-600 hover:text-gray-900">
                  {t('nav.download')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-gray-900">{t('footer.legal')}</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-gray-900">
                  {t('footer.termsOfService')}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-gray-600 hover:text-gray-900">
                  {t('footer.cookiePolicy')}
                </Link>
              </li>
              <li>
                <CookiePreferencesButton className="text-gray-600 hover:text-gray-900" />
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
          <p>{t('footer.copyright', { year: new Date().getFullYear().toString() })}</p>
        </div>
      </div>
    </footer>
  );
}
