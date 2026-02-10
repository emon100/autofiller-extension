import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';
import Footer from '@/components/landing/Footer';

export const metadata = {
  title: 'Privacy Policy | 1Fillr',
  description: 'Learn how 1Fillr collects, uses, and protects your personal information.',
};

const THIRD_PARTY_SERVICES = [
  { name: 'Supabase', purpose: 'Authentication & Database', url: 'https://supabase.com/privacy' },
  { name: 'Paddle', purpose: 'Payment Processing', url: 'https://www.paddle.com/legal/privacy' },
  { name: 'Vercel AI Gateway', purpose: 'AI Form Field Classification', url: 'https://vercel.com/legal/privacy-policy' },
  { name: 'Google Analytics', purpose: 'Website Analytics', url: 'https://policies.google.com/privacy' },
  { name: 'Vercel', purpose: 'Website Hosting', url: 'https://vercel.com/legal/privacy-policy' },
];

function ThirdPartyServicesTable() {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2">Service</th>
          <th className="text-left py-2">Purpose</th>
          <th className="text-left py-2">Privacy Policy</th>
        </tr>
      </thead>
      <tbody>
        {THIRD_PARTY_SERVICES.map((service) => (
          <tr key={service.name} className="border-b">
            <td className="py-2">{service.name}</td>
            <td className="py-2">{service.purpose}</td>
            <td className="py-2">
              <a href={service.url} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                View
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold">1Fillr</span>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: February 4, 2025</p>

        <div className="prose prose-gray max-w-none">
          <h2>Introduction</h2>
          <p>
            1Fillr ("we", "our", or "us") is committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your information when you
            use our Chrome extension and website (collectively, the "Service").
          </p>
          <p>
            Please read this Privacy Policy carefully. By using the Service, you agree to the
            collection and use of information in accordance with this policy.
          </p>

          <h2>Information We Collect</h2>

          <h3>Information You Provide</h3>
          <p>We collect information that you voluntarily provide to us:</p>
          <ul>
            <li>
              <strong>Account Information:</strong> When you create an account, we collect your
              email address and any profile information you choose to provide.
            </li>
            <li>
              <strong>Form Data:</strong> The 1Fillr extension stores information you enter
              into job application forms (such as your name, email, phone number, education,
              and work experience) locally on your device to enable auto-filling functionality.
            </li>
            <li>
              <strong>Payment Information:</strong> When you make a purchase, payment information
              is processed by our payment provider (Paddle). We do not store your complete payment
              card details.
            </li>
            <li>
              <strong>Communications:</strong> If you contact us, we may collect information
              contained in your messages.
            </li>
          </ul>

          <h3>Automatically Collected Information</h3>
          <p>When you use our Service, we may automatically collect:</p>
          <ul>
            <li>
              <strong>Usage Data:</strong> Information about how you use the Service, including
              features used, pages visited, and actions taken.
            </li>
            <li>
              <strong>Device Information:</strong> Browser type, operating system, and device
              identifiers.
            </li>
            <li>
              <strong>Log Data:</strong> IP address, access times, and referring URLs.
            </li>
          </ul>

          <h3>Data Stored Locally</h3>
          <p>
            <strong>Important:</strong> The 1Fillr Chrome extension stores your form data
            (personal information for job applications) locally on your device using Chrome's
            storage API. This data is:
          </p>
          <ul>
            <li>Stored only on your device</li>
            <li>Not transmitted to our servers unless you explicitly sync or backup</li>
            <li>Encrypted using Chrome's built-in security</li>
            <li>Deletable at any time through the extension settings</li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>We use the collected information for the following purposes:</p>
          <ul>
            <li>To provide, maintain, and improve the Service</li>
            <li>To process transactions and send related information</li>
            <li>To send administrative information, updates, and security alerts</li>
            <li>To respond to your comments, questions, and support requests</li>
            <li>To monitor and analyze usage patterns and trends</li>
            <li>To detect, prevent, and address technical issues and fraud</li>
            <li>To comply with legal obligations</li>
          </ul>

          <h2>Legal Basis for Processing (GDPR)</h2>
          <p>
            If you are in the European Economic Area (EEA), we process your personal data based on
            the following legal grounds:
          </p>
          <ul>
            <li>
              <strong>Contract Performance:</strong> Processing necessary to provide the Service
              you requested.
            </li>
            <li>
              <strong>Legitimate Interests:</strong> Processing for our legitimate business
              interests, such as fraud prevention, security, and service improvement.
            </li>
            <li>
              <strong>Consent:</strong> Where you have given explicit consent for specific
              processing activities.
            </li>
            <li>
              <strong>Legal Obligation:</strong> Processing required to comply with applicable laws.
            </li>
          </ul>

          <h2>Data Sharing and Disclosure</h2>
          <p>We may share your information in the following circumstances:</p>
          <ul>
            <li>
              <strong>Service Providers:</strong> With third-party vendors who perform services on
              our behalf (payment processing, analytics, hosting).
            </li>
            <li>
              <strong>Legal Requirements:</strong> When required by law or to respond to legal
              process.
            </li>
            <li>
              <strong>Protection of Rights:</strong> To protect our rights, privacy, safety, or
              property.
            </li>
            <li>
              <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
              sale of assets.
            </li>
            <li>
              <strong>With Your Consent:</strong> For any other purpose disclosed to you and with
              your consent.
            </li>
          </ul>
          <p>
            <strong>We do not sell your personal information to third parties.</strong>
          </p>

          <h2>Third-Party Services</h2>
          <p>Our Service uses the following third-party services:</p>
          <ThirdPartyServicesTable />

          <h2>AI-Powered Features</h2>
          <p>
            1Fillr uses artificial intelligence to enhance form field recognition and profile data
            processing. When you use AI-powered features, the following applies:
          </p>

          <h3>Form Field Classification</h3>
          <p>
            When auto-filling forms, our extension may send form field metadata (such as field labels,
            names, and types) to our AI service to better identify complex or non-standard form fields.
            This data:
          </p>
          <ul>
            <li>Does NOT include your personal answers or filled values</li>
            <li>Is processed through Vercel AI Gateway with Zero Data Retention (ZDR)</li>
            <li>Is NOT stored or used for AI model training</li>
            <li>Is transmitted securely via encrypted connections</li>
          </ul>

          <h3>LinkedIn Profile Processing</h3>
          <p>
            When you import your LinkedIn profile, you may choose to use AI-assisted data cleaning
            to normalize and structure your information. If you opt-in to this feature:
          </p>
          <ul>
            <li>Your profile data (name, work history, education) is sent to our AI service</li>
            <li>Processing occurs in real-time with no data retention</li>
            <li>You will be asked for explicit consent before any AI processing</li>
            <li>A local-only processing option is available if you prefer not to use AI</li>
          </ul>

          <h3>Data Processing Locations</h3>
          <p>
            AI processing may occur in data centers located in the United States. Vercel is certified
            under the EU-US Data Privacy Framework (DPF), ensuring adequate protection for data
            transfers from the EU/EEA.
          </p>

          <h2>Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to provide the Service and
            fulfill the purposes described in this policy, unless a longer retention period is
            required by law.
          </p>
          <ul>
            <li>
              <strong>Account Data:</strong> Retained until you delete your account.
            </li>
            <li>
              <strong>Usage Data:</strong> Typically retained for 26 months, then anonymized or
              deleted.
            </li>
            <li>
              <strong>Transaction Records:</strong> Retained for 7 years for legal and accounting
              purposes.
            </li>
            <li>
              <strong>Local Extension Data:</strong> Stored on your device until you delete it.
            </li>
          </ul>

          <h2>Your Rights</h2>
          <p>Depending on your location, you may have the following rights:</p>

          <h3>For All Users</h3>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and associated data</li>
            <li>Export your data</li>
          </ul>

          <h3>For EEA Residents (GDPR)</h3>
          <ul>
            <li>
              <strong>Right of Access:</strong> Request a copy of your personal data.
            </li>
            <li>
              <strong>Right to Rectification:</strong> Request correction of inaccurate data.
            </li>
            <li>
              <strong>Right to Erasure:</strong> Request deletion of your data ("right to be
              forgotten").
            </li>
            <li>
              <strong>Right to Restriction:</strong> Request restriction of processing.
            </li>
            <li>
              <strong>Right to Data Portability:</strong> Receive your data in a portable format.
            </li>
            <li>
              <strong>Right to Object:</strong> Object to processing based on legitimate interests.
            </li>
            <li>
              <strong>Right to Withdraw Consent:</strong> Withdraw consent at any time.
            </li>
            <li>
              <strong>Right to Lodge a Complaint:</strong> File a complaint with a supervisory
              authority.
            </li>
          </ul>

          <h3>For California Residents (CCPA)</h3>
          <ul>
            <li>Right to know what personal information is collected</li>
            <li>Right to know if personal information is sold or disclosed</li>
            <li>Right to opt-out of the sale of personal information</li>
            <li>Right to request deletion of personal information</li>
            <li>Right to non-discrimination for exercising CCPA rights</li>
          </ul>

          <p>
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:privacy@1fillr.co.uk" className="text-blue-600 hover:underline">
              privacy@1fillr.co.uk
            </a>
            .
          </p>

          <h2>Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal
            information, including:
          </p>
          <ul>
            <li>Encryption of data in transit (TLS/SSL)</li>
            <li>Encryption of sensitive data at rest</li>
            <li>Regular security assessments</li>
            <li>Access controls and authentication</li>
            <li>Employee security training</li>
          </ul>
          <p>
            However, no method of transmission over the Internet or electronic storage is 100%
            secure. We cannot guarantee absolute security.
          </p>

          <h2>International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your
            country of residence. These countries may have different data protection laws.
          </p>
          <p>
            When we transfer data from the EEA, we ensure appropriate safeguards are in place, such
            as Standard Contractual Clauses approved by the European Commission.
          </p>

          <h2>Children's Privacy</h2>
          <p>
            Our Service is not intended for children under 16 years of age. We do not knowingly
            collect personal information from children under 16. If you are a parent or guardian
            and believe your child has provided us with personal information, please contact us.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material
            changes by:
          </p>
          <ul>
            <li>Posting the new Privacy Policy on this page</li>
            <li>Updating the "Last updated" date</li>
            <li>Sending you an email notification (for significant changes)</li>
          </ul>
          <p>
            We encourage you to review this Privacy Policy periodically.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our privacy practices, please
            contact us:
          </p>
          <ul>
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:privacy@1fillr.co.uk" className="text-blue-600 hover:underline">
                privacy@1fillr.co.uk
              </a>
            </li>
            <li>
              <strong>Data Protection Officer:</strong>{' '}
              <a href="mailto:dpo@1fillr.co.uk" className="text-blue-600 hover:underline">
                dpo@1fillr.co.uk
              </a>
            </li>
          </ul>

          <h2>Related Policies</h2>
          <ul>
            <li>
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="text-blue-600 hover:underline">
                Cookie Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <Footer />
    </main>
  );
}
