import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';
import Footer from '@/components/landing/Footer';

export const metadata = {
  title: 'Cookie Policy | OneFillr',
  description: 'Learn about how OneFillr uses cookies and similar technologies.',
};

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold">OneFillr</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: February 4, 2025</p>

        <div className="prose prose-gray max-w-none">
          <h2>What Are Cookies</h2>
          <p>
            Cookies are small text files that are stored on your device (computer, tablet, or mobile)
            when you visit a website. They are widely used to make websites work more efficiently,
            provide a better user experience, and give website owners information about how visitors
            use their site.
          </p>

          <h2>How We Use Cookies</h2>
          <p>
            OneFillr uses cookies and similar technologies for the following purposes:
          </p>

          <h3>Strictly Necessary Cookies</h3>
          <p>
            These cookies are essential for the website to function properly. They enable core
            functionality such as:
          </p>
          <ul>
            <li>User authentication and session management</li>
            <li>Security features to protect your account</li>
            <li>Remembering your cookie consent preferences</li>
            <li>Load balancing and server optimization</li>
          </ul>
          <p>
            <strong>These cookies cannot be disabled</strong> as they are necessary for the website
            to operate.
          </p>

          <h3>Functional Cookies</h3>
          <p>
            These cookies enable enhanced functionality and personalization:
          </p>
          <ul>
            <li>Remembering your login status</li>
            <li>Storing your language and region preferences</li>
            <li>Remembering your display settings</li>
            <li>Providing personalized features</li>
          </ul>

          <h3>Analytics Cookies</h3>
          <p>
            We use analytics cookies to understand how visitors interact with our website:
          </p>
          <ul>
            <li>Counting visitors and understanding traffic sources</li>
            <li>Measuring the effectiveness of our content</li>
            <li>Identifying which pages are most popular</li>
            <li>Understanding how visitors navigate through the site</li>
          </ul>
          <p>
            This data is collected anonymously and helps us improve our services. We may use
            third-party analytics services such as Google Analytics.
          </p>

          <h3>Marketing Cookies</h3>
          <p>
            Marketing cookies are used to track visitors across websites for advertising purposes:
          </p>
          <ul>
            <li>Delivering relevant advertisements based on your interests</li>
            <li>Limiting the number of times you see an ad</li>
            <li>Measuring the effectiveness of advertising campaigns</li>
            <li>Enabling social media sharing features</li>
          </ul>

          <h2>Third-Party Cookies</h2>
          <p>
            Some cookies on our website are set by third-party services. These include:
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Provider</th>
                <th className="text-left py-2">Purpose</th>
                <th className="text-left py-2">Category</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Supabase</td>
                <td className="py-2">Authentication</td>
                <td className="py-2">Necessary</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Paddle</td>
                <td className="py-2">Payment processing</td>
                <td className="py-2">Necessary</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Google Analytics</td>
                <td className="py-2">Website analytics</td>
                <td className="py-2">Analytics</td>
              </tr>
            </tbody>
          </table>

          <h2>Managing Your Cookie Preferences</h2>
          <p>
            You can manage your cookie preferences in several ways:
          </p>
          <ul>
            <li>
              <strong>Cookie Consent Banner:</strong> When you first visit our website, you can
              choose which categories of cookies to accept.
            </li>
            <li>
              <strong>Cookie Settings:</strong> You can change your preferences at any time by
              clicking the "Cookie Settings" link in the footer.
            </li>
            <li>
              <strong>Browser Settings:</strong> Most browsers allow you to control cookies through
              their settings. You can block or delete cookies, though this may affect website
              functionality.
            </li>
          </ul>

          <h2>Your Rights Under GDPR</h2>
          <p>
            If you are located in the European Economic Area (EEA), you have certain rights under
            the General Data Protection Regulation (GDPR):
          </p>
          <ul>
            <li>The right to access your personal data</li>
            <li>The right to rectify inaccurate data</li>
            <li>The right to erasure ("right to be forgotten")</li>
            <li>The right to restrict processing</li>
            <li>The right to data portability</li>
            <li>The right to object to processing</li>
            <li>The right to withdraw consent at any time</li>
          </ul>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in our practices
            or for other operational, legal, or regulatory reasons. We will notify you of any
            material changes by updating the "Last updated" date at the top of this policy.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have any questions about our use of cookies or this Cookie Policy, please
            contact us at:
          </p>
          <ul>
            <li>Email: privacy@onefil.help</li>
          </ul>

          <h2>Related Policies</h2>
          <ul>
            <li>
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <Footer />
    </main>
  );
}
