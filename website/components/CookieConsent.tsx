'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { X, Settings, Shield, BarChart3, Target, Cookie } from 'lucide-react';

/**
 * GDPR-compliant Cookie Consent Banner
 *
 * Features:
 * - Granular consent per cookie category
 * - Equal prominence for Accept/Reject options
 * - Detailed information about each cookie type
 * - Ability to change preferences anytime
 * - Consent stored with timestamp
 */

export interface CookiePreferences {
  necessary: boolean;    // Always true, cannot be disabled
  functional: boolean;   // Remember user preferences
  analytics: boolean;    // Usage statistics (e.g., Google Analytics)
  marketing: boolean;    // Advertising and tracking
  timestamp: number;     // When consent was given
  version: string;       // Consent version for audit trail
}

const CONSENT_VERSION = '1.0';
const STORAGE_KEY = 'cookie_consent_preferences';

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
  timestamp: 0,
  version: CONSENT_VERSION,
};

// Cookie categories with descriptions
const COOKIE_CATEGORIES = [
  {
    id: 'necessary',
    name: 'Strictly Necessary',
    description: 'Essential for the website to function properly. These cookies enable core functionality such as security, authentication, and accessibility. They cannot be disabled.',
    icon: Shield,
    required: true,
  },
  {
    id: 'functional',
    name: 'Functional',
    description: 'Enable enhanced functionality and personalization, such as remembering your preferences, language settings, and login status.',
    icon: Settings,
    required: false,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Help us understand how visitors interact with our website by collecting anonymous usage data. This helps us improve our services.',
    icon: BarChart3,
    required: false,
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Used to track visitors across websites for advertising purposes. These cookies help deliver relevant advertisements based on your interests.',
    icon: Target,
    required: false,
  },
] as const;

type CookieCategoryId = typeof COOKIE_CATEGORIES[number]['id'];

export function getCookiePreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const prefs = JSON.parse(stored) as CookiePreferences;
    // Check if consent version matches
    if (prefs.version !== CONSENT_VERSION) return null;
    return prefs;
  } catch {
    return null;
  }
}

export function hasConsented(): boolean {
  const prefs = getCookiePreferences();
  return prefs !== null && prefs.timestamp > 0;
}

export function isCategoryAllowed(category: CookieCategoryId): boolean {
  const prefs = getCookiePreferences();
  if (!prefs) return category === 'necessary';
  return prefs[category as keyof CookiePreferences] as boolean;
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const stored = getCookiePreferences();
    if (!stored) {
      setShow(true);
    } else {
      setPreferences(stored);
    }
  }, []);

  const savePreferences = useCallback((prefs: CookiePreferences) => {
    const finalPrefs = {
      ...prefs,
      necessary: true, // Always required
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPrefs));
    setPreferences(finalPrefs);
    setShow(false);
    setShowDetails(false);

    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('cookieConsentUpdate', { detail: finalPrefs }));
  }, []);

  const handleAcceptAll = () => {
    savePreferences({
      ...preferences,
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    });
  };

  const handleRejectAll = () => {
    savePreferences({
      ...DEFAULT_PREFERENCES,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    });
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  const toggleCategory = (categoryId: CookieCategoryId) => {
    if (categoryId === 'necessary') return; // Cannot toggle necessary cookies
    setPreferences(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId as keyof CookiePreferences],
    }));
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" aria-hidden="true" />

      {/* Banner */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-2xl border-t border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
      >
        <div className="mx-auto max-w-7xl p-4 md:p-6">
          {!showDetails ? (
            // Simple view
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Cookie className="h-5 w-5 text-blue-600" />
                  <h2 id="cookie-consent-title" className="text-lg font-semibold text-gray-900">
                    We value your privacy
                  </h2>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  We use cookies to enhance your browsing experience, provide personalized content,
                  and analyze our traffic. You can choose to accept all cookies, reject non-essential
                  cookies, or customize your preferences.
                </p>
                <button
                  onClick={() => setShowDetails(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Customize settings
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 shrink-0">
                <button
                  onClick={handleRejectAll}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Reject All
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Accept All
                </button>
              </div>
            </div>
          ) : (
            // Detailed view
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Cookie className="h-5 w-5 text-blue-600" />
                  <h2 id="cookie-consent-title" className="text-lg font-semibold text-gray-900">
                    Cookie Preferences
                  </h2>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  aria-label="Close details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Manage your cookie preferences below. Strictly necessary cookies cannot be disabled
                as they are essential for the website to function. For more information, please read our{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                {' '}and{' '}
                <Link href="/cookies" className="text-blue-600 hover:underline">
                  Cookie Policy
                </Link>.
              </p>

              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {COOKIE_CATEGORIES.map(category => {
                  const Icon = category.icon;
                  const isEnabled = preferences[category.id as keyof CookiePreferences] as boolean;

                  return (
                    <div
                      key={category.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <Icon className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium text-gray-900 text-sm">
                            {category.name}
                            {category.required && (
                              <span className="ml-2 text-xs text-gray-500">(Required)</span>
                            )}
                          </h3>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              disabled={category.required}
                              onChange={() => toggleCategory(category.id)}
                              className="sr-only peer"
                              aria-label={`${category.name} cookies`}
                            />
                            <div className={`
                              w-9 h-5 rounded-full transition-colors
                              ${category.required
                                ? 'bg-blue-600 cursor-not-allowed'
                                : isEnabled
                                  ? 'bg-blue-600'
                                  : 'bg-gray-300'
                              }
                              peer-focus:ring-2 peer-focus:ring-blue-300
                            `}>
                              <div className={`
                                absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                                ${isEnabled ? 'translate-x-4' : 'translate-x-0'}
                              `} />
                            </div>
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={handleRejectAll}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Reject All
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Save Preferences
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Accept All
                </button>
              </div>
            </div>
          )}

          {/* Links */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
            <Link href="/privacy" className="hover:text-gray-700 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/cookies" className="hover:text-gray-700 hover:underline">
              Cookie Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-700 hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Button to reopen cookie preferences (for footer or settings page)
 */
export function CookiePreferencesButton({ className = '' }: { className?: string }) {
  const [, setForceUpdate] = useState(0);

  const handleClick = () => {
    localStorage.removeItem(STORAGE_KEY);
    setForceUpdate(n => n + 1);
    window.location.reload();
  };

  return (
    <button
      onClick={handleClick}
      className={className || 'text-gray-600 hover:text-gray-900'}
    >
      Cookie Settings
    </button>
  );
}
