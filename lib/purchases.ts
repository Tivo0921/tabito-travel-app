import type Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * 支払い済みの Checkout Session を purchases に記録する（service role）。
 *
 * 書き込むのは Stripe Webhook（app/api/stripe/webhook）と決済後のリダイレクト
 * （app/api/checkout/verify）の2経路だけ。どちらが先に来ても、何度来ても
 * stripe_session_id の UNIQUE で1行に収まる（2回目以降は何もしない）。
 *
 * user_id は呼び出し側で決める。Webhook は Checkout 作成時にサーバーが入れた
 * metadata.user_id、verify はそれとログイン中のユーザーの一致を確かめた user.id。
 *
 * 収益分配（platform_fee / creator_net / creator_user_id）はここでは渡さない。
 * INSERT 時に DB のトリガーが購入時点の率と所有者で確定する（#19,
 * supabase/migrations/20261112000001_purchase_revenue_split.sql）。
 */
export type RecordPurchaseResult =
  | { ok: true }
  /** 再送しても直らない失敗（ユーザーやパッケージが既に存在しない等） */
  | { ok: false; permanent: true; code: string | undefined; message?: string }
  /** 一時的な失敗の可能性がある。Webhook は 5xx を返して Stripe に再送させる */
  | { ok: false; permanent: false; code: string | undefined; message?: string };

/**
 * 再送しても結果が変わらない PostgreSQL のエラーコード。
 * 23503: 外部キー違反（Checkout 後にアカウント削除された・パッケージが消えた）
 * 22P02: 型の不正（metadata の user_id / package_id が UUID でない）
 * 23514: CHECK 違反（収益分配のトリガーが負の金額などを拒否した。#19）
 */
const PERMANENT_ERROR_CODES = new Set(['23503', '22P02', '23514']);

export function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === 'string' ? pi : pi.id;
}

export async function recordPurchase(
  session: Stripe.Checkout.Session,
  ids: { userId: string; packageId: string },
): Promise<RecordPurchaseResult> {
  const service = createServiceClient();
  const { error } = await service.from('purchases').upsert(
    {
      user_id: ids.userId,
      package_id: ids.packageId,
      amount: session.amount_total ?? 0,
      currency: session.currency?.toUpperCase() ?? 'JPY',
      status: 'completed',
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId(session),
    },
    { onConflict: 'stripe_session_id', ignoreDuplicates: true },
  );

  if (!error) return { ok: true };
  const code = (error as { code?: string }).code;
  // 23505: 一意制約違反。ON CONFLICT が見るのは stripe_session_id だけで、
  // stripe_payment_intent_id の UNIQUE で衝突した場合はこのエラーになる。
  // purchases の一意制約はこの2列だけで、どちらも同じ購入を指すので、行は既にある＝成功とする。
  // （PostgreSQL 16 で Webhook と verify の同時 INSERT を再現した範囲では 23505 は出ず
  //   INSERT 0 0 になったが、制約の評価順に依存しないよう防御として残す）
  if (code === '23505') return { ok: true };
  return {
    ok: false,
    permanent: PERMANENT_ERROR_CODES.has(code ?? ''),
    code,
    message: (error as { message?: string }).message,
  };
}
