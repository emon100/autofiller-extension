import type { Metadata } from 'next';
import Script from "next/script";
import { Inter } from 'next/font/google';
import CookieBanner from '@/components/CookieBanner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AutoFiller - Job Application Autofill Chrome Extension',
  description:
    'Save hours on job applications. Fill any application form in seconds with AutoFiller - the smart Chrome extension for job seekers.',
  keywords: [
    'job application autofill',
    'chrome extension',
    'job search tools',
    'auto fill job forms',
    'greenhouse autofill',
    'lever autofill',
    'workday autofill',
  ],
  authors: [{ name: 'AutoFiller Team' }],
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'AutoFiller - Job Application Autofill Chrome Extension',
    description:
      'Save hours on job applications. Fill any application form in seconds.',
    url: 'https://autofiller.app',
    siteName: 'AutoFiller',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AutoFiller - Job Application Autofill',
    description:
      'Save hours on job applications. Fill any application form in seconds.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const paddleEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';
  const paddleClientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/@react-grab/claude-code/dist/client.global.js"
            strategy="lazyOnload"
          />
        )}
        {/* Paddle.js for checkout overlay */}
        <Script
          src="https://cdn.paddle.com/paddle/v2/paddle.js"
          strategy="beforeInteractive"
        />
        <Script id="paddle-init" strategy="afterInteractive">
          {`
            if (typeof Paddle !== 'undefined') {
              ${paddleEnvironment === 'sandbox' ? 'Paddle.Environment.set("sandbox");' : ''}
              ${paddleClientToken ? `Paddle.Initialize({ token: "${paddleClientToken}" });` : '// Paddle client token not configured'}
            }
          `}
        </Script>
      </head>
      <body className={inter.className}>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
