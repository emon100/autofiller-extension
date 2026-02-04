'use client';

import {
  Zap,
  Shield,
  Globe,
  RefreshCw,
  Eye,
  Lock,
  Database,
  Cpu,
  FileText,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function Features() {
  const { t } = useI18n();

  const features = [
    {
      icon: Zap,
      title: t('features.lightningFast.title'),
      description: t('features.lightningFast.description'),
    },
    {
      icon: Globe,
      title: t('features.worksEverywhere.title'),
      description: t('features.worksEverywhere.description'),
    },
    {
      icon: Shield,
      title: t('features.privacyFirst.title'),
      description: t('features.privacyFirst.description'),
    },
    {
      icon: RefreshCw,
      title: t('features.learnsOnce.title'),
      description: t('features.learnsOnce.description'),
    },
    {
      icon: Eye,
      title: t('features.fullTransparency.title'),
      description: t('features.fullTransparency.description'),
    },
    {
      icon: Lock,
      title: t('features.sensitiveProtection.title'),
      description: t('features.sensitiveProtection.description'),
    },
  ];

  const privacyFeatures = [
    {
      icon: Database,
      title: t('hero.privacy.localStorage'),
      description: t('hero.privacy.localStorageDesc'),
    },
    {
      icon: Cpu,
      title: t('hero.privacy.aiLogic'),
      description: t('hero.privacy.aiLogicDesc'),
    },
    {
      icon: FileText,
      title: t('hero.privacy.smartImport'),
      description: t('hero.privacy.smartImportDesc'),
    },
  ];

  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t('features.title')}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 p-6 transition hover:border-blue-200 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3">
                <feature.icon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Privacy Section */}
        <div className="mx-auto mt-20 max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm text-green-700 mb-4">
              <Shield className="h-4 w-4" />
              Privacy by Design
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {t('hero.privacy.title')}
            </h3>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {privacyFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-gray-200 p-6 transition hover:border-blue-200 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex rounded-lg bg-green-100 p-3">
                  <feature.icon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
