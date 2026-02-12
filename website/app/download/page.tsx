'use client';

import Link from 'next/link';
import { Zap, Download, ChevronRight, Shield, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function DownloadPage() {
  const { t } = useI18n();

  const steps = [
    {
      number: 1,
      title: t('download.steps.s1.title'),
      description: t('download.steps.s1.description'),
    },
    {
      number: 2,
      title: t('download.steps.s2.title'),
      description: t('download.steps.s2.description'),
    },
    {
      number: 3,
      title: t('download.steps.s3.title'),
      description: t('download.steps.s3.description'),
    },
    {
      number: 4,
      title: t('download.steps.s4.title'),
      description: t('download.steps.s4.description'),
    },
    {
      number: 5,
      title: t('download.steps.s5.title'),
      description: t('download.steps.s5.description'),
    },
    {
      number: 6,
      title: t('download.steps.s6.title'),
      description: t('download.steps.s6.description'),
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold">1Fillr</span>
        </Link>
        <Link href="/" className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          {t('nav.backToHome')}
        </Link>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm text-blue-700 mb-6">
            <Shield className="h-4 w-4" />
            {t('download.badge')}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {t('download.title')}
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            {t('download.subtitle')}
          </p>

          <div className="mt-8">
            <a
              href="/1fillr-extension.zip"
              download
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-5 w-5" />
              {t('download.downloadBtn')}
            </a>
            <p className="mt-3 text-sm text-gray-500">
              {t('download.browserSupport')}
            </p>
          </div>
        </div>
      </section>

      {/* Installation Steps */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            {t('download.stepsTitle')}
          </h2>

          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div className="absolute left-6 top-14 h-full w-0.5 bg-blue-100" />
                )}
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                    {step.number}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-gray-600">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="font-semibold text-amber-900 mb-3">{t('download.notes.title')}</h3>
            <ul className="space-y-2 text-amber-800 text-sm">
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t('download.notes.n1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t('download.notes.n2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t('download.notes.n3')}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('download.help.title')}
          </h2>
          <p className="mt-4 text-gray-600">
            {t('download.help.description')}
          </p>
          <a
            href="mailto:support@1fillr.co.uk"
            className="mt-6 inline-flex items-center gap-2 text-blue-600 hover:underline"
          >
            support@1fillr.co.uk
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </section>

    </main>
  );
}
