import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

async function updateWebhookLog(
  supabase: SupabaseClient,
  logId: string | undefined,
  processed: boolean,
  error?: string
) {
  if (!logId) return;
  await supabase
    .from('webhook_logs')
    .update({
      processed,
      processing_completed_at: new Date().toISOString(),
      ...(error ? { error } : {}),
    })
    .eq('id', logId);
}

export async function POST(request: Request) {
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
  const eventType: string = event.event_type;
  const paddleEventId: string | undefined = event.event_id;

  // --- Log webhook to webhook_logs ---
  const { data: logEntry, error: logError } = await supabase
    .from('webhook_logs')
    .insert({
      event_type: eventType,
      paddle_event_id: paddleEventId,
      raw_body: event,
      headers: {
        'paddle-signature': signature,
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent'),
      },
      processed: false,
      processing_started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  const webhookLogId: string | undefined = logEntry?.id;

  if (logError) {
    // Duplicate event (unique constraint on paddle_event_id) — skip silently
    if (logError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('Failed to log webhook:', logError);
  }

  console.log('Paddle webhook received:', eventType, paddleEventId);

  try {
    switch (eventType) {
      case 'transaction.completed': {
        const { data } = event;
        const customData = typeof data.custom_data === 'string'
          ? JSON.parse(data.custom_data)
          : (data.custom_data || {});
        const userId = customData.userId;

        if (!userId) {
          console.error('No userId in custom_data');
          await updateWebhookLog(supabase, webhookLogId, false, 'Missing userId in custom_data');
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Extract both product_id and price_id from Paddle payload
        const productId = data.items?.[0]?.price?.product_id;
        const priceId = data.items?.[0]?.price?.id;

        // Look up credits from products table (match by product_id OR price_id)
        const { data: product } = await supabase
          .from('products')
          .select('credits')
          .or(`paddle_product_id.eq.${productId},paddle_price_id.eq.${priceId}`)
          .limit(1)
          .single();

        const credits = product?.credits;

        if (credits && credits > 0) {
          // Add credits
          await supabase.rpc('add_credits', {
            p_user_id: userId,
            p_amount: credits,
          });

          // Log credit transaction
          await supabase.from('credit_transactions').insert({
            user_id: userId,
            amount: credits,
            type: 'purchase',
            description: `Purchased ${credits} credits`,
          });

          // Log purchase (idempotent via unique constraint on paddle_transaction_id)
          await supabase.from('purchases').insert({
            user_id: userId,
            paddle_transaction_id: data.id,
            product_id: productId || priceId,
            amount_cents: data.details?.totals?.total,
            currency: data.currency_code,
            credits_added: credits,
            processing_status: 'completed',
          });
        } else {
          console.error('No credits found for product:', productId, 'price:', priceId);
          await updateWebhookLog(supabase, webhookLogId, false, `No credits config for product=${productId} price=${priceId}`);
          return NextResponse.json({ received: true, warning: 'no credits config found' });
        }
        break;
      }

      case 'subscription.activated':
      case 'subscription.updated': {
        const { data } = event;
        const customData = typeof data.custom_data === 'string'
          ? JSON.parse(data.custom_data)
          : (data.custom_data || {});
        const userId = customData.userId;

        if (!userId) {
          console.error('No userId in custom_data');
          await updateWebhookLog(supabase, webhookLogId, false, 'Missing userId in custom_data');
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

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

    await updateWebhookLog(supabase, webhookLogId, true);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    await updateWebhookLog(supabase, webhookLogId, false, String(error));
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
