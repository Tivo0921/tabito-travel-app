import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/service';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { package_id, user_id } = session.metadata ?? {};

    if (package_id && user_id && session.payment_status === 'paid') {
      const supabase = createServiceClient();
      await supabase.from('purchases').upsert(
        {
          user_id,
          package_id,
          amount: session.amount_total ?? 0,
          currency: session.currency?.toUpperCase() ?? 'JPY',
          status: 'completed',
          stripe_session_id: session.id,
        },
        { onConflict: 'stripe_session_id', ignoreDuplicates: true }
      );
    }
  }

  return NextResponse.json({ received: true });
}
