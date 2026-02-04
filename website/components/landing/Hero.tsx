'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, User, Menu, X, LogOut, Shield, Database, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import HeroDemo from './HeroDemo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Hero() {
  const { t } = useI18n();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);
  const [currentFormTypeIndex, setCurrentFormTypeIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Form types from translation
  const FORM_TYPES = [
    t('hero.formTypes.jobApplications'),
    t('hero.formTypes.internshipForms'),
    t('hero.formTypes.graduatePrograms'),
    t('hero.formTypes.visaApplications'),
    t('hero.formTypes.scholarshipForms'),
    t('hero.formTypes.universityAdmissions'),
    t('hero.formTypes.companyProfiles'),
    t('hero.formTypes.backgroundChecks'),
  ];

  const supabase = createClient();

  // 表单类型滚动动画
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentFormTypeIndex((prev) => (prev + 1) % FORM_TYPES.length);
        setIsAnimating(false);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDashboardMenuOpen(false);
    window.location.href = '/';
  };

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({ email: user.email || '' });
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser({ email: session.user.email || '' });
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Zap className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold">OneFillr</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-gray-600 hover:text-gray-900">
            {t('nav.features')}
          </Link>
          <Link href="#pricing" className="text-gray-600 hover:text-gray-900">
            {t('nav.pricing')}
          </Link>
          <Link href="#faq" className="text-gray-600 hover:text-gray-900">
            {t('nav.faq')}
          </Link>
          <LanguageSwitcher />
          {loading ? (
            <span className="text-gray-400">...</span>
          ) : user ? (
            <div
              className="relative"
              onMouseEnter={() => setDashboardMenuOpen(true)}
              onMouseLeave={() => setDashboardMenuOpen(false)}
            >
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <User className="h-4 w-4" />
                {t('nav.dashboard')}
              </Link>

              {dashboardMenuOpen && (
                <div className="absolute right-0 top-full w-48 pt-2">
                  <div className="rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="p-2">
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="h-4 w-4" />
                        {t('common.logout')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900"
              >
                {t('common.login')}
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                {t('nav.getStarted')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-gray-600 hover:text-gray-900"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-gray-200 bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col space-y-4">
            <Link
              href="#features"
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.features')}
            </Link>
            <Link
              href="#pricing"
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.pricing')}
            </Link>
            <Link
              href="#faq"
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.faq')}
            </Link>
            <LanguageSwitcher />
            {loading ? (
              <span className="text-gray-400">{t('common.loading')}</span>
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  {t('nav.dashboard')}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-left text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4" />
                  {t('common.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('common.login')}
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.getStarted')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero Content */}
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm text-blue-700">
            <Shield className="mr-2 h-4 w-4" />
            {t('hero.badge')}
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 md:text-6xl">
            {t('hero.titleFill')}{' '}
            <span className="relative inline-block min-w-[280px] md:min-w-[360px]">
              <span
                className={`inline-block transition-all duration-300 ${
                  isAnimating
                    ? 'opacity-0 translate-y-4'
                    : 'opacity-100 translate-y-0'
                }`}
              >
                {FORM_TYPES[currentFormTypeIndex]}
              </span>
            </span>
            <br />
            <span className="text-blue-600">{t('hero.title10x')}</span>
          </h1>

          <p className="mb-8 text-xl text-gray-600">
            {t('hero.subtitle')}
          </p>

          {/* Privacy Trust Badges */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-green-700">
              <Database className="h-4 w-4" />
              <span>{t('hero.trustBadges.localStorage')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-purple-50 px-4 py-2 text-purple-700">
              <Lock className="h-4 w-4" />
              <span>{t('hero.trustBadges.aiPrivacy')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-blue-700">
              <Zap className="h-4 w-4" />
              <span>{t('hero.trustBadges.import')}</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/download"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-blue-700"
            >
              {t('hero.ctaChrome')}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <button
              onClick={() => {
                document.getElementById('hero-demo')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-8 py-4 text-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t('hero.ctaHowItWorks')}
            </button>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            {t('hero.freeCredits')}
          </p>
        </div>

        {/* Animated Demo */}
        <div id="hero-demo" className="relative mx-auto mt-16 max-w-4xl">
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}
