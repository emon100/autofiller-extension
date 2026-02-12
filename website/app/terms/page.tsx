import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | 1Fillr',
  description: 'Read the terms and conditions for using 1Fillr services.',
};

const TOC_ITEMS = [
  { id: 'agreement', label: '1. Agreement to Terms' },
  { id: 'description', label: '2. Description of Service' },
  { id: 'eligibility', label: '3. Eligibility' },
  { id: 'account', label: '4. Account Registration' },
  { id: 'payments', label: '5. Subscription, Payments and Refunds' },
  { id: 'acceptable-use', label: '6. Acceptable Use' },
  { id: 'user-content', label: '7. User Content' },
  { id: 'ip', label: '8. Intellectual Property' },
  { id: 'third-party', label: '9. Third-Party Services' },
  { id: 'disclaimers', label: '10. Disclaimers' },
  { id: 'liability', label: '11. Limitation of Liability' },
  { id: 'indemnification', label: '12. Indemnification' },
  { id: 'termination', label: '13. Termination' },
  { id: 'disputes', label: '14. Dispute Resolution' },
  { id: 'general', label: '15. General Provisions' },
  { id: 'changes', label: '16. Changes to Terms' },
  { id: 'contact', label: '17. Contact Information' },
];

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: February 8, 2026</p>

        {/* Table of Contents */}
        <div className="legal-toc">
          <p className="legal-toc-title">Table of Contents</p>
          <nav className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {TOC_ITEMS.map((item) => (
              <a key={item.id} href={`#${item.id}`}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="legal-prose">
          <h2 id="agreement">1. Agreement to Terms</h2>
          <p>
            By accessing or using 1Fillr&apos;s services, including our Chrome extension and website
            (collectively, the &quot;Service&quot;), you agree to be bound by these Terms of Service
            (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and 1Fillr (&quot;we&quot;,
            &quot;our&quot;, or &quot;us&quot;). We may update these Terms from time to time, and your continued use
            of the Service constitutes acceptance of any changes.
          </p>

          <h2 id="description">2. Description of Service</h2>
          <p>
            1Fillr is a Chrome browser extension and related services that help users
            automatically fill job application forms. The Service includes:
          </p>
          <ul>
            <li>Chrome extension for auto-filling job application forms</li>
            <li>Web dashboard for managing your profile and settings</li>
            <li>Data storage for your application information</li>
            <li>AI-powered form field detection and matching</li>
          </ul>

          <h2 id="eligibility">3. Eligibility</h2>
          <p>To use our Service, you must:</p>
          <ul>
            <li>Be at least 16 years of age</li>
            <li>Have the legal capacity to enter into binding agreements</li>
            <li>Not be prohibited from using the Service under applicable laws</li>
            <li>Provide accurate and complete registration information</li>
          </ul>

          <h2 id="account">4. Account Registration</h2>
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

          <h2 id="payments">5. Subscription, Payments and Refunds</h2>

          <h3>5.1 Merchant of Record</h3>
          <p>
            All payments for 1Fillr are processed by our Merchant of Record,{' '}
            <a
              href="https://www.paddle.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Paddle.com
            </a>
            , who acts as the authorised reseller of our products. When you make a purchase,
            you are purchasing from Paddle, and the product is licensed to you by 1Fillr.
            By placing an order, you agree to{' '}
            <a
              href="https://www.paddle.com/legal/invoiced-consumer-terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Paddle&apos;s Consumer Terms and Conditions
            </a>
            .
          </p>
          <p>
            If you are a Consumer, you will benefit from any mandatory provisions of the law
            of the country in which you are resident. Nothing in these Terms affects your
            rights as a Consumer to rely on such mandatory provisions of local law.
          </p>

          <h3>5.2 Free Tier</h3>
          <p>
            We offer a free tier with limited features and usage credits. Free tier users are
            subject to usage limits that may change at our discretion.
          </p>

          <h3>5.3 Payment and Taxes</h3>
          <p>
            Paddle will charge your chosen payment method for any paid transactions, including
            any applicable taxes according to the tax jurisdiction in which the transaction
            takes place. You agree to receipt of all invoices and receipts in electronic
            format, including email. Product prices may change at any time.
          </p>
          <p>
            When providing payment information, you must ensure that it is up-to-date and
            accurate. 1Fillr and Paddle will not be responsible for non-receipt of the
            product due to incorrect information provided by you.
          </p>

          <h3>5.4 Paid Subscriptions</h3>
          <p>
            Paid subscriptions provide additional features and higher usage limits. Paid
            subscriptions automatically renew until cancelled. We will notify you if the
            price of a paid subscription increases and, if required, seek your consent to
            continue.
          </p>
          <p>
            If you wish to cancel your subscription, please do so through your account
            dashboard or by contacting Paddle at least 48 hours before the end of the
            current billing period. Your cancellation will take effect at the next payment
            date.
          </p>
          <p>
            If Paddle cannot charge your payment method for any reason (such as expiration or
            insufficient funds), and you have not cancelled your paid subscription, you remain
            responsible for any uncollected amounts.
          </p>

          <h3>5.5 Consumer Right to Cancel</h3>
          <p>
            If you are a Consumer, you have the right to cancel your purchase and receive a
            refund within 14 days without giving any reason. The cancellation period will
            expire after 14 days from the day after completion of the transaction.
          </p>
          <p>
            To cancel your order, you must inform Paddle of your decision by
            contacting{' '}
            <a
              href="https://paddle.net"
              target="_blank"
              rel="noopener noreferrer"
            >
              Paddle Support
            </a>
            . To meet the cancellation deadline, it is sufficient that you send your
            communication concerning your exercise of the cancellation right before the
            expiration of the 14-day period. Please note that in respect of subscription
            services, your right to cancel is only present following the initial subscription
            and not upon each automatic renewal.
          </p>

          <h3>5.6 Effect of Cancellation</h3>
          <p>
            If you cancel as permitted above, Paddle will reimburse to you all payments
            received from you. The reimbursement will be made without undue delay, and not
            later than 14 days after the day on which Paddle is informed about your decision
            to cancel. The reimbursement will be made using the same means of payment as
            you used for the initial transaction and you will not incur any fees as a result
            of the reimbursement.
          </p>

          <h3>5.7 Exception to the Right to Cancel</h3>
          <p>
            Your right as a Consumer to cancel your order does not apply to the supply of
            Digital Content that you have started to download, stream or otherwise acquire,
            and to products which you have had the benefit of.
          </p>

          <h3>5.8 Refund Policy</h3>
          <div className="legal-callout">
            <p>
              All refund requests are handled by our Merchant of Record, Paddle. You may
              request a refund at any time by contacting{' '}
              <a
                href="https://paddle.net"
                target="_blank"
                rel="noopener noreferrer"
              >
                Paddle Support
              </a>
              .
            </p>
            <p>
              For full details, please refer to{' '}
              <a
                href="https://www.paddle.com/legal/invoiced-consumer-terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                Paddle&apos;s Consumer Terms
              </a>
              .
            </p>
          </div>

          <h2 id="acceptable-use">6. Acceptable Use</h2>
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

          <h2 id="user-content">7. User Content</h2>

          <h3>7.1 Your Data</h3>
          <p>
            You retain ownership of all data you provide to the Service (&quot;User Content&quot;). By using
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

          <h2 id="ip">8. Intellectual Property</h2>

          <h3>8.1 Our Intellectual Property</h3>
          <p>
            The Service, including its design, features, code, and content, is owned by 1Fillr
            and protected by intellectual property laws. You may not copy, modify, or distribute
            any part of the Service without our written permission.
          </p>

          <h3>8.2 Feedback</h3>
          <p>
            If you provide feedback, suggestions, or ideas about the Service, you grant us a
            non-exclusive, royalty-free license to use, modify, and incorporate such feedback.
          </p>

          <h2 id="third-party">9. Third-Party Services</h2>
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

          <h2 id="disclaimers">10. Disclaimers</h2>

          <h3>10.1 Service Availability</h3>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED. We do not guarantee that the Service will be uninterrupted,
            error-free, or secure.
          </p>

          <h3>10.2 No Employment Guarantee</h3>
          <p>
            1Fillr is a tool to assist with job applications. We do not guarantee that using
            our Service will result in job interviews, offers, or employment.
          </p>

          <h3>10.3 Form Compatibility</h3>
          <p>
            While we strive to support a wide range of job application forms, we cannot guarantee
            compatibility with all websites or forms. Some forms may not be supported or may
            require manual input.
          </p>

          <h2 id="liability">11. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, 1FILLR SHALL NOT BE LIABLE FOR:
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

          <h2 id="indemnification">12. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless 1Fillr and its officers, directors,
            employees, and agents from any claims, damages, losses, or expenses (including legal
            fees) arising from:
          </p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Your User Content</li>
          </ul>

          <h2 id="termination">13. Termination</h2>

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

          <h2 id="disputes">14. Dispute Resolution</h2>

          <h3>14.1 Informal Resolution</h3>
          <p>
            Before filing a formal dispute, you agree to contact us at{' '}
            <a href="mailto:legal@1fillr.co.uk">
              legal@1fillr.co.uk
            </a>{' '}
            to attempt to resolve the dispute informally.
          </p>

          <h3>14.2 Governing Law</h3>
          <p>
            These Terms are governed by the laws of the jurisdiction where 1Fillr is
            incorporated, without regard to conflict of law principles.
          </p>

          <h3>14.3 Jurisdiction</h3>
          <p>
            Any disputes arising from these Terms or the Service shall be resolved in the courts
            of the jurisdiction where 1Fillr is incorporated, unless otherwise required by
            applicable consumer protection laws.
          </p>

          <h2 id="general">15. General Provisions</h2>

          <h3>15.1 Entire Agreement</h3>
          <p>
            These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire
            agreement between you and 1Fillr regarding the Service.
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

          <h2 id="changes">16. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. Material changes will be notified via:
          </p>
          <ul>
            <li>Email to registered users</li>
            <li>Prominent notice on the Service</li>
            <li>Update to the &quot;Last updated&quot; date</li>
          </ul>
          <p>
            Your continued use of the Service after changes constitutes acceptance of the new
            Terms.
          </p>

          <h2 id="contact">17. Contact Information</h2>
          <p>For questions about these Terms, please contact us:</p>
          <div className="legal-section-card">
            <ul>
              <li>
                <strong>General Inquiries:</strong>{' '}
                <a href="mailto:support@1fillr.co.uk">support@1fillr.co.uk</a>
              </li>
              <li>
                <strong>Legal Matters:</strong>{' '}
                <a href="mailto:legal@1fillr.co.uk">legal@1fillr.co.uk</a>
              </li>
              <li>
                <strong>Privacy Concerns:</strong>{' '}
                <a href="mailto:privacy@1fillr.co.uk">privacy@1fillr.co.uk</a>
              </li>
            </ul>
          </div>

          <h2>Related Policies</h2>
          <ul>
            <li>
              <Link href="/privacy">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/cookies">
                Cookie Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

    </main>
  );
}
