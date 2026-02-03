import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Lazy initialization of Supabase client
function getSupabaseClient() {
  // In mock mode, return a mock client
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    return {
      rpc: async () => ({ data: null, error: null }),
      from: () => ({
        insert: async () => ({ error: null }),
        upsert: async () => ({ error: null }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    } as unknown as ReturnType<typeof createClient>;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Paddle webhook signature verification
function verifyPaddleSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const [tsValue, h1Value] = signature.split(';').reduce(
    (acc, part) => {
      const [key, value] = part.split('=');
      if (key === 'ts') acc[0] = value;
      if (key === 'h1') acc[1] = value;
      return acc;
    },
    ['', '']
  );

  const signedPayload = `${tsValue}:${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return h1Value === expectedSignature;
}

// Credit amounts per product
const CREDITS_PER_PRODUCT: Record<string, number> = {
  pri_starter: 100,
  pri_pro: 500,
};

export async function POST(request: Request) {
  // Mock mode - just return success
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    return NextResponse.json({ received: true, mock: true });
  }

  const supabase = getSupabaseClient();
  const signature = request.headers.get('paddle-signature');
  const rawBody = await request.text();

  // Verify signature in production
  if (process.env.NODE_ENV === 'production') {
    if (!signature || !process.env.PADDLE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const isValid = verifyPaddleSignature(
      rawBody,
      signature,
      process.env.PADDLE_WEBHOOK_SECRET
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  const event = JSON.parse(rawBody);
  const eventType = event.event_type;

  console.log('Paddle webhook received:', eventType);

  try {
    switch (eventType) {
      case 'transaction.completed': {
        const { data } = event;
        const customData = data.custom_data
          ? JSON.parse(data.custom_data)
          : {};
        const userId = customData.userId;

        if (!userId) {
          console.error('No userId in custom_data');
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Get product info
        const productId = data.items?.[0]?.price?.product_id;
        const credits = CREDITS_PER_PRODUCT[productId];

        if (credits) {
          // One-time purchase - add credits
          await supabase.rpc('add_credits', {
            p_user_id: userId,
            p_amount: credits,
          });

          // Log transaction
          await supabase.from('credit_transactions').insert({
            user_id: userId,
            amount: credits,
            type: 'purchase',
            description: `Purchased ${credits} credits`,
          });

          // Log purchase
          await supabase.from('purchases').insert({
            user_id: userId,
            paddle_transaction_id: data.id,
            product_id: productId,
            amount_cents: data.details?.totals?.total,
            currency: data.currency_code,
            credits_added: credits,
          });
        }
        break;
      }

      case 'subscription.activated':
      case 'subscription.updated': {
        const { data } = event;
        const customData = data.custom_data
          ? JSON.parse(data.custom_data)
          : {};
        const userId = customData.userId;

        if (!userId) {
          console.error('No userId in custom_data');
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Upsert subscription
        await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            paddle_subscription_id: data.id,
            plan_id: data.items?.[0]?.price?.product_id || 'unknown',
            status: data.status,
            current_period_start: data.current_billing_period?.starts_at,
            current_period_end: data.current_billing_period?.ends_at,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'paddle_subscription_id',
          }
        );
        break;
      }

      case 'subscription.canceled': {
        const { data } = event;

        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('paddle_subscription_id', data.id);
        break;
      }

      default:
        console.log('Unhandled event type:', eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
