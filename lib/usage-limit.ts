import { createServiceClient } from '@/lib/supabase/service';

/**
 * 従量課金 API（OpenAI・Google Places）の1日あたりの利用回数上限。#65 #66
 *
 * 回数は DB（api_usage）に保存し、確認と加算は consume_api_usage で
 * 原子的に行う。プロセスのメモリで数えると、Vercel のインスタンスが
 * 複数あれば台数分だけ通り、再起動で消えるため。
 *
 * 関数は service role しか呼べない（利用者が直接呼ぶと、全体の回数を
 * 空打ちで埋めて他の利用者を止められる）。サーバー専用。
 */

export type UsageKind = 'plan_advise' | 'places_search';

export type ConsumeResult =
  /** 通った。day は数えた日（日本時間）。戻すときに渡す */
  | { ok: true; day: string }
  /** 上限に達した */
  | { ok: false; reason: 'limit' }
  /** DB に問い合わせられなかった */
  | { ok: false; reason: 'error' };

/**
 * 環境変数から上限値を読む。未設定・数値でない・負数なら既定値。
 * 0 は「使わせない」として有効な値に扱う。
 */
export function readLimit(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  if (!/^\d+$/.test(raw.trim())) {
    console.warn(`usage-limit: invalid limit "${raw}", using ${fallback}`);
    return fallback;
  }
  // DB の integer に収める。超える値は実質「無制限」の指定なので上限で丸める
  return Math.min(Number.parseInt(raw.trim(), 10), 2_147_483_647);
}

export async function consumeDailyUsage(params: {
  kind: UsageKind;
  userId: string;
  userLimit: number;
  /** 渡すとサービス全体の1日の合計にも上限をかける */
  globalLimit?: number;
}): Promise<ConsumeResult> {
  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc('consume_api_usage', {
      p_kind: params.kind,
      p_user_id: params.userId,
      p_user_limit: params.userLimit,
      ...(params.globalLimit !== undefined ? { p_global_limit: params.globalLimit } : {}),
    });
    if (error) {
      console.error(`usage-limit: consume ${params.kind} failed:`, error.message);
      return { ok: false, reason: 'error' };
    }
    if (typeof data !== 'string' || data === '') return { ok: false, reason: 'limit' };
    return { ok: true, day: data };
  } catch (e) {
    console.error(`usage-limit: consume ${params.kind} threw:`, e);
    return { ok: false, reason: 'error' };
  }
}

/**
 * 上流の失敗など、利用者の責任でない失敗で消費した1回を戻す。
 * 失敗してもリクエスト自体の結果は変えない（ログに残すだけ）。
 */
export async function releaseDailyUsage(params: {
  kind: UsageKind;
  userId: string;
  day: string;
  includeGlobal?: boolean;
}): Promise<void> {
  try {
    const service = createServiceClient();
    const { error } = await service.rpc('release_api_usage', {
      p_kind: params.kind,
      p_user_id: params.userId,
      p_day: params.day,
      p_include_global: params.includeGlobal ?? false,
    });
    if (error) console.error(`usage-limit: release ${params.kind} failed:`, error.message);
  } catch (e) {
    console.error(`usage-limit: release ${params.kind} threw:`, e);
  }
}
