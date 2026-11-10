import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { recordPurchase } from '@/lib/purchases';

/**
 * Stripe Webhook。購入の確定をブラウザのリダイレクトに依存せずサーバー側で行う。
 *
 * Stripe Dashboard で受信するイベントは checkout.session.completed だけにする。
 * それ以外が届いても何もせず 200 を返す（#60）。
 *
 * 応答の使い分け:
 * - 400: 署名が無い・不正、または secret 未設定。DB に触らない
 * - 500: 一時的な失敗。Stripe が再送する
 * - 200: 処理済み・対象外・再送しても直らない失敗（ログに残す）
 *
 * ログには event.id / event.type / session.id だけを出す。署名ヘッダや secret は出さない。
 */
export async function POST(req: NextRequest) {
  // 署名検証は raw body に対して行う。先に req.json() などで body を読まないこと
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('stripe webhook: STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
  }
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const log = { event_id: event.id, event_type: event.type, session_id: session.id };

  if (session.payment_status !== 'paid') {
    // カード決済のみなので通常は起きない。非同期決済を足すときは
    // checkout.session.async_payment_succeeded も受ける必要がある
    console.warn('stripe webhook: session not paid, skipped', log);
    return NextResponse.json({ received: true });
  }

  const { package_id, user_id } = session.metadata ?? {};
  if (!package_id || !user_id) {
    // Checkout 作成側の不備で、再送しても直らない
    console.error('stripe webhook: metadata.user_id / package_id missing', log);
    return NextResponse.json({ received: true });
  }

  const result = await recordPurchase(session, { userId: user_id, packageId: package_id });
  if (result.ok) {
    return NextResponse.json({ received: true });
  }
  if (result.permanent) {
    // 支払い済みだが記録できない（例: 決済後にアカウントを削除した）。
    // 再送させても失敗し続けて Stripe がエンドポイントを無効化しかねないので 200 を返す。
    // Stripe Dashboard で返金するなど人の対応が要る
    console.error('stripe webhook: purchase could not be recorded (needs manual action)', {
      ...log,
      code: result.code,
    });
    return NextResponse.json({ received: true });
  }
  console.error('stripe webhook: purchases upsert failed, Stripe will retry', {
    ...log,
    code: result.code,
  });
  return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 });
}
