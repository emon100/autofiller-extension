// Paddle Billing (v2) - Client-side overlay checkout using Paddle.js

declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (env: 'sandbox' | 'production') => void;
      };
      Initialize: (options: { token: string }) => void;
      Checkout: {
        open: (options: {
          items: Array<{ priceId: string; quantity: number }>;
          customData?: Record<string, string>;
          customer?: { email: string };
          settings?: {
            successUrl?: string;
            displayMode?: 'overlay' | 'inline';
            theme?: 'light' | 'dark';
            locale?: string;
          };
        }) => void;
      };
    };
  }
}

export async function openCheckout(options: {
  priceId: string;
  successUrl?: string;
}): Promise<void> {
  // First, get user info from API to pass to Paddle
  const userResponse = await fetch('/api/credits');
  const userData = await userResponse.json();

  if (!userResponse.ok || !userData.email) {
    alert('Please log in to make a purchase.');
    window.location.href = '/login?redirect=/pricing';
    return;
  }

  // Check if Paddle.js is loaded
  if (typeof window.Paddle === 'undefined') {
    console.error('Paddle.js not loaded');
    alert('Payment system not ready. Please refresh the page and try again.');
    return;
  }

  // Open Paddle overlay checkout
  try {
    window.Paddle.Checkout.open({
      items: [{ priceId: options.priceId, quantity: 1 }],
      customData: {
        userId: userData.userId,
      },
      customer: {
        email: userData.email,
      },
      settings: {
        successUrl: options.successUrl || `${window.location.origin}/dashboard?checkout=success`,
        displayMode: 'overlay',
        theme: 'light',
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Failed to open checkout. Please try again.');
  }
}
