import Link from 'next/link';
import { Zap } from 'lucide-react';
import { CookiePreferencesButton } from '@/components/CookieConsent';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-bold">AutoFiller</span>
            </div>
            <p className="mt-4 max-w-md text-gray-600">
              Save hours on job applications. Fill any application form in
              seconds with AutoFiller.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-gray-900">Product</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="#features" className="text-gray-600 hover:text-gray-900">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-gray-600 hover:text-gray-900">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/demo" className="text-gray-600 hover:text-gray-900">
                  Try Demo
                </Link>
              </li>
              <li>
                <a
                  href="https://chrome.google.com/webstore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Chrome Web Store
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-gray-900">Legal</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-gray-900">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-gray-600 hover:text-gray-900">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <CookiePreferencesButton className="text-gray-600 hover:text-gray-900" />
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} AutoFiller. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
