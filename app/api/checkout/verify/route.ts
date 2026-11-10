import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { recordPurchase } from '@/lib/purchases';

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

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    // 存在しない・別アカウントの session_id。中身を推測させないよう一律 400
    return NextResponse.json({ ok: false, error: 'Payment not verified' }, { status: 400 });
  }

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

  // 購入記録は Stripe で支払いを確認したこの経路と Webhook だけが書く（lib/purchases.ts）。
  // user_id は Stripe の metadata ではなく、上で一致を確かめたログイン中のユーザーを使う。
  // Webhook が先に書いていれば何もしない（冪等）。
  const result = await recordPurchase(session, { userId: user.id, packageId });

  if (!result.ok) {
    // 支払い済みなのに記録できていない。成功を返すと閲覧できないまま終わるので失敗を返す
    console.error('checkout verify: purchases upsert failed', {
      session_id: session.id,
      code: result.code,
      message: result.message,
    });
    return NextResponse.json({ ok: false, error: 'Failed to record purchase' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, package_id: packageId });
}
