import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { priceId, successUrl } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // Get authenticated user from server-side session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      console.error('PADDLE_API_KEY not configured');
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox';
    const apiUrl = isSandbox
      ? 'https://sandbox-api.paddle.com/transactions'
      : 'https://api.paddle.com/transactions';

    // Create transaction via Paddle API with server-verified userId
    const transactionData: Record<string, unknown> = {
      items: [
        {
          price_id: priceId,
          quantity: 1,
        },
      ],
      custom_data: {
        userId: user.id,
      },
    };

    // Add customer email from server-side session
    if (user.email) {
      transactionData.customer = { email: user.email };
    }

    // Add checkout settings
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    transactionData.checkout = {
      url: successUrl || `${origin}/dashboard?checkout=success`,
    };

    console.log('Creating Paddle transaction for user:', user.id);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Paddle API error:', data);
      return NextResponse.json({ error: data.error?.detail || 'Failed to create checkout' }, { status: response.status });
    }

    // Return the checkout URL
    const checkoutUrl = data.data?.checkout?.url;
    if (!checkoutUrl) {
      console.error('No checkout URL in response:', data);
      return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
