import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { packageId } = await req.json();
  if (!packageId) {
    return NextResponse.json({ error: 'packageId is required' }, { status: 400 });
  }

  const { data: pkg, error } = await supabase
    .from('packages')
    .select('id, price, currency')
    .eq('id', packageId)
    .single();

  if (error || !pkg) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000';

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: pkg.currency?.toLowerCase() ?? 'jpy',
            product_data: {
              name: `TABITOガイド #${packageId}`,
            },
            unit_amount: pkg.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/package/${packageId}`,
      metadata: {
        package_id: packageId,
        user_id: user.id,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    console.error('Stripe checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
