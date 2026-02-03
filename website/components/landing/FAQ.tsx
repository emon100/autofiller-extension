'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'Is my data safe with AutoFiller?',
    answer:
      'Absolutely. Your data is stored locally on your device and never transmitted to our servers. We use industry-standard encryption for any sensitive information. You have full control over your data and can delete it at any time.',
  },
  {
    question: 'Which job sites does AutoFiller support?',
    answer:
      'AutoFiller works with all major Applicant Tracking Systems (ATS) including Greenhouse, Lever, Workday, Ashby, BambooHR, iCIMS, and hundreds more. It also works on custom job application forms.',
  },
  {
    question: 'How does the learning work?',
    answer:
      "When you fill out a job application form, AutoFiller observes which answers you provide for different types of questions. It learns the semantic relationship between questions and answers, so it can recognize similar questions on other sites even if they're worded differently.",
  },
  {
    question: 'What if AutoFiller fills something incorrectly?',
    answer:
      "Every filled field shows a visual badge. You can hover over any field to see what was filled and click to undo. AutoFiller also won't auto-fill sensitive fields (like salary expectations) without your explicit confirmation.",
  },
  {
    question: 'Do I need to create an account?',
    answer:
      'No account is required to use the free tier. Your data stays entirely on your device. An account is only needed if you want cloud sync or purchase additional credits.',
  },
  {
    question: 'Can I get a refund?',
    answer:
      "Yes. We offer a 14-day money-back guarantee on all purchases. If you're not satisfied, contact us and we'll process your refund promptly.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Got questions? We&apos;ve got answers.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
