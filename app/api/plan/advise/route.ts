import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 計画について相談する。#16
 *
 * 現在の行程をプロンプトに含めて LLM に渡し、移動順・懸念点・代替案を
 * 文章で返す。**行程を勝手に書き換えない。** 提案を読んでユーザーが
 * 自分で直す形にしている（AI が手で組んだ行程を黙って上書きするのは避ける）。
 *
 * OPENAI_API_KEY はサーバー専用。ここが唯一の入口。
 */

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.6-luna';
const MAX_QUESTION_LENGTH = 500;
/** 出力の上限。無いと長い応答がそのまま課金される */
const MAX_OUTPUT_TOKENS = 1500;
/** 上流が返さないと Vercel の関数タイムアウトまで掴んだままになる */
const UPSTREAM_TIMEOUT_MS = 30_000;
/** 行程側にも上限を置く。質問だけ制限しても、アイテムを大量に作れば入力を膨らませられる */
const MAX_ITEMS = 60;

/** 1ユーザーあたりの呼び出し制限。減速帯であって上限ではない（本当の歯止めは課金側の上限） */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const recentCalls = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const hits = (recentCalls.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  // 先に判定する。push してから判定すると、弾かれた相手ほど
  // 自分の配列を伸ばし、毎回それを filter することになる
  if (hits.length >= RATE_LIMIT_MAX) {
    recentCalls.set(userId, hits);
    return true;
  }
  hits.push(now);
  recentCalls.set(userId, hits);
  if (recentCalls.size > 1000) {
    for (const [key, times] of recentCalls) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) recentCalls.delete(key);
    }
  }
  return false;
}

const SYSTEM_PROMPT = `あなたは日本旅行のコンシェルジュです。ユーザーが組んだ行程を読み、実際に動けるかを検討して助言します。

守ること:
- 行程に書かれている場所名・パッケージ名は**そのまま引用**し、言い換えたり翻訳したりしない
- 移動時間や営業時間の**実データは与えられていない**。断定せず「確認したほうがよい」と伝える
- 存在しない店や施設を新しく作らない。挙げるなら一般に知られた場所に留め、確認を促す
- 指摘は具体的に。「余裕がない」ではなく「10:00の次が10:15で、移動時間が取れていない」のように書く
- 簡潔に。箇条書き中心で、前置きは書かない

出力の構成:
1. 気になる点（時間の詰まり、順序、移動の無駄）
2. 提案（順序の入れ替えや時間の調整。具体的に）
3. 確認したほうがよいこと（営業時間・混雑・交通など）

該当が無い項目は省略してよい。`;

type PlanItemRow = {
  day: number;
  order: number;
  item_type: string;
  title: string;
  scheduled_time: string | null;
  duration_minutes: number | null;
};

function renderItinerary(
  plan: { title: string; location: string | null; start_date: string | null; end_date: string | null },
  items: PlanItemRow[],
): string {
  const lines: string[] = [
    `計画: ${plan.title}`,
    plan.location ? `場所: ${plan.location}` : '',
    plan.start_date ? `日程: ${plan.start_date} 〜 ${plan.end_date ?? plan.start_date}` : '',
    '',
  ].filter(Boolean);

  const byDay = new Map<number, PlanItemRow[]>();
  for (const it of items) {
    if (!byDay.has(it.day)) byDay.set(it.day, []);
    byDay.get(it.day)!.push(it);
  }

  for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
    lines.push(`Day ${day}`);
    for (const it of byDay.get(day)!.sort((a, b) => a.order - b.order)) {
      const start = it.scheduled_time?.slice(0, 5) ?? '時刻未定';
      const dur = it.duration_minutes ? `${it.duration_minutes}分` : '所要時間未設定';
      lines.push(`  - ${start} [${it.item_type}] ${it.title}（${dur}）`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (rateLimited(user.id)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let planId: unknown;
  let question: unknown;
  try {
    ({ planId, question } = await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (typeof planId !== 'string' || !planId) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const q = typeof question === 'string' ? question.trim().slice(0, MAX_QUESTION_LENGTH) : '';

  // RLS が「自分の plan のみ」を保証しているので、ここで所有者判定を重ねない。
  // 他人の計画IDを渡しても 0件で返る
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, title, location, start_date, end_date')
    .eq('id', planId)
    .maybeSingle();

  if (planError) {
    console.error('plan/advise plan fetch failed:', planError.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: items, error: itemsError } = await supabase
    .from('plan_items')
    .select('day, order, item_type, title, scheduled_time, duration_minutes')
    .eq('plan_id', planId)
    .order('day')
    .order('order');

  if (itemsError) {
    console.error('plan/advise items fetch failed:', itemsError.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'empty_plan' }, { status: 400 });
  }
  // 質問は500字に制限しているのに行程側が無制限だと非対称。
  // 超える分は落とす（黙って全部投げない）
  const usedItems = (items as PlanItemRow[]).slice(0, MAX_ITEMS);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // キーが無い環境でも計画画面ごと落とさない
    console.error('plan/advise: OPENAI_API_KEY is not set');
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const itinerary = renderItinerary(plan, usedItems);
  const userContent = q
    ? `${itinerary}\n---\n質問: ${q}`
    : `${itinerary}\n---\nこの行程について助言してください。`;

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        instructions: SYSTEM_PROMPT,
        input: userContent,
        max_output_tokens: MAX_OUTPUT_TOKENS,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (e) {
    console.error('plan/advise fetch failed:', e);
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }

  if (!res.ok) {
    // 上流の本文はキーやクォータの情報を含みうるので、呼び出し側には返さない
    console.error('plan/advise upstream:', res.status, await res.text().catch(() => ''));
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }

  const body = await res.json().catch(() => null);
  // Responses API は output_text に平文がまとまる。無ければ output を辿る
  const text: string =
    body?.output_text ??
    (body?.output ?? [])
      .flatMap((o: { content?: { type?: string; text?: string }[] }) => o.content ?? [])
      .filter((c: { type?: string }) => c.type === 'output_text')
      .map((c: { text?: string }) => c.text ?? '')
      .join('\n');

  if (!text) {
    console.error('plan/advise: empty response', JSON.stringify(body).slice(0, 400));
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }

  return NextResponse.json({ advice: text });
}
