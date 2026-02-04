import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';
import Footer from '@/components/landing/Footer';

export const metadata = {
  title: 'Terms of Service | OneFillr',
  description: 'Read the terms and conditions for using OneFillr services.',
};

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: February 4, 2025</p>

        <div className="prose prose-gray max-w-none">
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using OneFillr's services, including our Chrome extension and website
            (collectively, the "Service"), you agree to be bound by these Terms of Service
            ("Terms"). If you do not agree to these Terms, please do not use the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and OneFillr ("we",
            "our", or "us"). We may update these Terms from time to time, and your continued use
            of the Service constitutes acceptance of any changes.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            OneFillr is a Chrome browser extension and related services that help users
            automatically fill job application forms. The Service includes:
          </p>
          <ul>
            <li>Chrome extension for auto-filling job application forms</li>
            <li>Web dashboard for managing your profile and settings</li>
            <li>Data storage for your application information</li>
            <li>AI-powered form field detection and matching</li>
          </ul>

          <h2>3. Eligibility</h2>
          <p>To use our Service, you must:</p>
          <ul>
            <li>Be at least 16 years of age</li>
            <li>Have the legal capacity to enter into binding agreements</li>
            <li>Not be prohibited from using the Service under applicable laws</li>
            <li>Provide accurate and complete registration information</li>
          </ul>

          <h2>4. Account Registration</h2>
          <p>
            To access certain features, you may need to create an account. You agree to:
          </p>
          <ul>
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and update your information as needed</li>
            <li>Keep your password secure and confidential</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these Terms.
          </p>

          <h2>5. Subscription and Payments</h2>

          <h3>5.1 Free Tier</h3>
          <p>
            We offer a free tier with limited features and usage credits. Free tier users are
            subject to usage limits that may change at our discretion.
          </p>

          <h3>5.2 Paid Subscriptions</h3>
          <p>
            Paid subscriptions provide additional features and higher usage limits. By purchasing
            a subscription, you agree to:
          </p>
          <ul>
            <li>Pay all applicable fees at the prices in effect at the time of purchase</li>
            <li>Provide valid payment information</li>
            <li>Authorize recurring charges for subscription plans</li>
          </ul>

          <h3>5.3 Billing</h3>
          <p>
            Subscriptions are billed in advance on a monthly or annual basis, depending on the plan
            selected. Payments are processed through our payment provider (Paddle).
          </p>

          <h3>5.4 Refunds</h3>
          <p>
            Refunds are handled in accordance with applicable consumer protection laws and our
            refund policy:
          </p>
          <ul>
            <li>
              <strong>14-day money-back guarantee:</strong> Request a full refund within 14 days
              of your initial purchase if you're not satisfied.
            </li>
            <li>
              <strong>Pro-rated refunds:</strong> Annual subscriptions may be eligible for
              pro-rated refunds after the 14-day period.
            </li>
            <li>
              <strong>No refunds for:</strong> Used credits, partial months, or violations of
              these Terms.
            </li>
          </ul>

          <h3>5.5 Cancellation</h3>
          <p>
            You may cancel your subscription at any time through your account dashboard. Upon
            cancellation:
          </p>
          <ul>
            <li>You retain access until the end of your current billing period</li>
            <li>No further charges will be made</li>
            <li>Unused credits do not roll over and are not refundable</li>
          </ul>

          <h2>6. Acceptable Use</h2>
          <p>You agree not to use the Service to:</p>
          <ul>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on intellectual property or privacy rights of others</li>
            <li>Submit false, misleading, or fraudulent information</li>
            <li>Attempt to gain unauthorized access to systems or data</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Use automated means to access the Service beyond intended functionality</li>
            <li>Reverse engineer, decompile, or disassemble the Service</li>
            <li>Resell or redistribute the Service without authorization</li>
            <li>Use the Service for any illegal or unauthorized purpose</li>
          </ul>

          <h2>7. User Content</h2>

          <h3>7.1 Your Data</h3>
          <p>
            You retain ownership of all data you provide to the Service ("User Content"). By using
            the Service, you grant us a limited license to:
          </p>
          <ul>
            <li>Store and process your data to provide the Service</li>
            <li>Create backups for data protection purposes</li>
            <li>Analyze anonymized data to improve the Service</li>
          </ul>

          <h3>7.2 Accuracy</h3>
          <p>
            You are responsible for the accuracy of information you provide. The Service
            auto-fills forms based on your stored data, and you should verify all information
            before submitting applications.
          </p>

          <h3>7.3 Data Deletion</h3>
          <p>
            You may delete your data at any time through the extension settings or by contacting
            us. Deleted data cannot be recovered.
          </p>

          <h2>8. Intellectual Property</h2>

          <h3>8.1 Our Intellectual Property</h3>
          <p>
            The Service, including its design, features, code, and content, is owned by OneFillr
            and protected by intellectual property laws. You may not copy, modify, or distribute
            any part of the Service without our written permission.
          </p>

          <h3>8.2 Feedback</h3>
          <p>
            If you provide feedback, suggestions, or ideas about the Service, you grant us a
            non-exclusive, royalty-free license to use, modify, and incorporate such feedback.
          </p>

          <h2>9. Third-Party Services</h2>
          <p>
            The Service may integrate with or link to third-party services (e.g., job application
            websites). We are not responsible for:
          </p>
          <ul>
            <li>The content, policies, or practices of third-party services</li>
            <li>Any damage or loss from using third-party services</li>
            <li>Changes to third-party services that affect our Service</li>
          </ul>
          <p>
            Your use of third-party services is subject to their respective terms and policies.
          </p>

          <h2>10. Disclaimers</h2>

          <h3>10.1 Service Availability</h3>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED. We do not guarantee that the Service will be uninterrupted,
            error-free, or secure.
          </p>

          <h3>10.2 No Employment Guarantee</h3>
          <p>
            OneFillr is a tool to assist with job applications. We do not guarantee that using
            our Service will result in job interviews, offers, or employment.
          </p>

          <h3>10.3 Form Compatibility</h3>
          <p>
            While we strive to support a wide range of job application forms, we cannot guarantee
            compatibility with all websites or forms. Some forms may not be supported or may
            require manual input.
          </p>

          <h2>11. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, AUTOFILLER SHALL NOT BE LIABLE FOR:
          </p>
          <ul>
            <li>Any indirect, incidental, special, consequential, or punitive damages</li>
            <li>Loss of profits, data, or business opportunities</li>
            <li>Damages arising from use or inability to use the Service</li>
            <li>Damages exceeding the amount paid by you in the 12 months before the claim</li>
          </ul>
          <p>
            Some jurisdictions do not allow certain limitations, so some limitations may not apply
            to you.
          </p>

          <h2>12. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless OneFillr and its officers, directors,
            employees, and agents from any claims, damages, losses, or expenses (including legal
            fees) arising from:
          </p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Your User Content</li>
          </ul>

          <h2>13. Termination</h2>

          <h3>13.1 Termination by You</h3>
          <p>
            You may stop using the Service and delete your account at any time.
          </p>

          <h3>13.2 Termination by Us</h3>
          <p>
            We may suspend or terminate your access to the Service at any time, with or without
            cause, including for:
          </p>
          <ul>
            <li>Violation of these Terms</li>
            <li>Fraudulent or illegal activity</li>
            <li>Non-payment of fees</li>
            <li>Extended period of inactivity</li>
          </ul>

          <h3>13.3 Effect of Termination</h3>
          <p>
            Upon termination, your right to use the Service ceases immediately. We may delete your
            data after a reasonable period. Provisions that should survive termination (such as
            intellectual property, disclaimers, and limitations of liability) will remain in
            effect.
          </p>

          <h2>14. Dispute Resolution</h2>

          <h3>14.1 Informal Resolution</h3>
          <p>
            Before filing a formal dispute, you agree to contact us at{' '}
            <a href="mailto:legal@onefil.help" className="text-blue-600 hover:underline">
              legal@onefil.help
            </a>{' '}
            to attempt to resolve the dispute informally.
          </p>

          <h3>14.2 Governing Law</h3>
          <p>
            These Terms are governed by the laws of the jurisdiction where OneFillr is
            incorporated, without regard to conflict of law principles.
          </p>

          <h3>14.3 Jurisdiction</h3>
          <p>
            Any disputes arising from these Terms or the Service shall be resolved in the courts
            of the jurisdiction where OneFillr is incorporated, unless otherwise required by
            applicable consumer protection laws.
          </p>

          <h2>15. General Provisions</h2>

          <h3>15.1 Entire Agreement</h3>
          <p>
            These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire
            agreement between you and OneFillr regarding the Service.
          </p>

          <h3>15.2 Severability</h3>
          <p>
            If any provision of these Terms is found to be unenforceable, the remaining provisions
            will continue in full force and effect.
          </p>

          <h3>15.3 Waiver</h3>
          <p>
            Our failure to enforce any right or provision of these Terms does not constitute a
            waiver of such right or provision.
          </p>

          <h3>15.4 Assignment</h3>
          <p>
            You may not assign or transfer these Terms without our written consent. We may assign
            our rights and obligations without restriction.
          </p>

          <h3>15.5 Notices</h3>
          <p>
            We may provide notices to you via email, in-app notifications, or by posting on the
            Service. You may contact us at the addresses provided below.
          </p>

          <h2>16. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. Material changes will be notified via:
          </p>
          <ul>
            <li>Email to registered users</li>
            <li>Prominent notice on the Service</li>
            <li>Update to the "Last updated" date</li>
          </ul>
          <p>
            Your continued use of the Service after changes constitutes acceptance of the new
            Terms.
          </p>

          <h2>17. Contact Information</h2>
          <p>For questions about these Terms, please contact us:</p>
          <ul>
            <li>
              <strong>General Inquiries:</strong>{' '}
              <a href="mailto:support@onefil.help" className="text-blue-600 hover:underline">
                support@onefil.help
              </a>
            </li>
            <li>
              <strong>Legal Matters:</strong>{' '}
              <a href="mailto:legal@onefil.help" className="text-blue-600 hover:underline">
                legal@onefil.help
              </a>
            </li>
            <li>
              <strong>Privacy Concerns:</strong>{' '}
              <a href="mailto:privacy@onefil.help" className="text-blue-600 hover:underline">
                privacy@onefil.help
              </a>
            </li>
          </ul>

          <h2>Related Policies</h2>
          <ul>
            <li>
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
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
