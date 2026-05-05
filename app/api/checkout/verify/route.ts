import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'session_id required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (
    session.payment_status !== 'paid' ||
    session.metadata?.user_id !== user.id
  ) {
    return NextResponse.json({ ok: false, error: 'Payment not verified' }, { status: 400 });
  }

  const packageId = session.metadata?.package_id;
  if (!packageId) {
    return NextResponse.json({ ok: false, error: 'No package_id in session' }, { status: 400 });
  }

  // Upsert purchase (idempotent — webhook may have already inserted it)
  await supabase.from('purchases').upsert(
    {
      user_id: user.id,
      package_id: packageId,
      amount: session.amount_total ?? 0,
      currency: session.currency?.toUpperCase() ?? 'JPY',
      status: 'completed',
      stripe_session_id: session.id,
    },
    { onConflict: 'stripe_session_id', ignoreDuplicates: true }
  );

  return NextResponse.json({ ok: true, package_id: packageId });
}
