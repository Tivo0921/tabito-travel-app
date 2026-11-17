import { createClient } from '@/lib/supabase/client';

/**
 * クリエイター本人の売上集計（#19）。
 *
 * 値は DB 関数 get_my_creator_earnings() が返す。purchases の行はクリエイターに
 * 読ませない（購入者の user_id が見えるため）ので、集計値だけを受け取る。
 * 対象は status = 'completed' かつ購入時点の受取人が本人の購入。
 * 振込の記録はまだ無いので、unpaidNet は creatorNet と同じ値になる。
 * 購入者がアカウントを削除すると、その購入は集計から外れる（purchases が
 * カスケード削除されるため。マイグレーション 20261112000001 の冒頭を参照）。
 * 振込の根拠にする前に解消すること。
 */
export type CreatorEarnings = {
  salesCount: number;
  grossAmount: number;
  platformFee: number;
  creatorNet: number;
  unpaidNet: number;
};

export type CreatorEarningsResult =
  | { ok: true; earnings: CreatorEarnings }
  | { ok: false; reason: 'unauthenticated' | 'error' };

const ZERO: CreatorEarnings = { salesCount: 0, grossAmount: 0, platformFee: 0, creatorNet: 0, unpaidNet: 0 };

function toCount(v: unknown): number | null {
  // bigint は PostgREST から number または文字列で届く
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : null;
}

/** RPC の戻り値（1行の配列）を検証して取り出す。形が想定外なら null */
export function parseCreatorEarnings(data: unknown): CreatorEarnings | null {
  const row = Array.isArray(data) ? data[0] : data;
  // 集計関数は必ず1行返す。行が無いのは売上0件と同じ扱い
  if (row === undefined) return Array.isArray(data) ? ZERO : null;
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const values = {
    salesCount: toCount(r.sales_count),
    grossAmount: toCount(r.gross_amount),
    platformFee: toCount(r.platform_fee),
    creatorNet: toCount(r.creator_net),
    unpaidNet: toCount(r.unpaid_net),
  };
  if (Object.values(values).some((v) => v === null)) return null;
  return values as CreatorEarnings;
}

export async function getMyCreatorEarnings(): Promise<CreatorEarningsResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'unauthenticated' };

  const { data, error } = await supabase.rpc('get_my_creator_earnings');
  if (error) {
    console.error('getMyCreatorEarnings error:', error);
    return { ok: false, reason: 'error' };
  }
  const earnings = parseCreatorEarnings(data);
  if (!earnings) {
    console.error('getMyCreatorEarnings: unexpected response shape');
    return { ok: false, reason: 'error' };
  }
  return { ok: true, earnings };
}
