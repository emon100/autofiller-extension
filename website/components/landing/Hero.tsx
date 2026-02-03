'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, User, Menu, X, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Hero() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(false); // 改为false，立即渲染
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);

  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDashboardMenuOpen(false);
    window.location.href = '/';
  };

  useEffect(() => {
    const supabase = createClient();

    // 异步检查登录状态，不阻塞渲染
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({ email: user.email || '' });
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
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
          <span className="text-xl font-bold">AutoFiller</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-gray-600 hover:text-gray-900">
            Features
          </Link>
          <Link href="#pricing" className="text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
          <Link href="#faq" className="text-gray-600 hover:text-gray-900">
            FAQ
          </Link>
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
                Dashboard
              </Link>

              {/* Dropdown Menu - pt-2 creates invisible hover bridge */}
              {dashboardMenuOpen && (
                <div className="absolute right-0 top-full w-48 pt-2">
                  <div className="rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="p-2">
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
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
                Login
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Get Started
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
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="#faq"
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQ
            </Link>
            {loading ? (
              <span className="text-gray-400">Loading...</span>
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-left text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
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
            <Zap className="mr-2 h-4 w-4" />
            Trusted by 10,000+ job seekers
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 md:text-6xl">
            Fill Job Applications{' '}
            <span className="text-blue-600">10x Faster</span>
          </h1>

          <p className="mb-10 text-xl text-gray-600">
            Stop typing the same information over and over. AutoFiller learns your
            profile once and fills any job application form in seconds.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-blue-700"
            >
              Add to Chrome - It&apos;s Free
              <ArrowRight className="h-5 w-5" />
            </a>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-8 py-4 text-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              See How It Works
            </Link>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            20 free fills included. No credit card required.
          </p>
        </div>

        {/* Demo Image Placeholder */}
        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="aspect-video rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 shadow-2xl">
            <div className="flex h-full items-center justify-center text-gray-400">
              <span className="text-lg">Demo Video / Screenshot</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
