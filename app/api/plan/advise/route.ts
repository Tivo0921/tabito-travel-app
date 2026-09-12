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
- 場所名・パッケージ名は行程に書かれたまま引用する。言い換えも翻訳もしない
- 移動時間や営業時間の実データは与えられていない。断定せず「確認したほうがよい」と伝える
- 存在しない店や施設を新しく作らない
- 各項目は1文。40文字以内。**や##や・などの記号は使わない（アプリ側が整形する）
- 指摘は具体的に。「余裕がない」ではなく「10:00の次が10:15で移動時間がない」と書く
- 該当が無い項目は空配列にする。無理に埋めない

schedule について（順番と開始時刻の提案）:
- 順番または時刻を直したほうがよいときに返す。直すところが無ければ null
- 同じ日の中だけを扱う。日をまたがない
- **与えられたIDを過不足なく全て含める。** 追加も削除もしない
- [package] の行が連続している塊は、順番を崩さず塊のまま動かす
- times は itemIds と同じ順・同じ個数。"HH:MM"（24時間表記）で入れる
- 時刻が空欄の行には、移動と所要時間から見て無理のない時刻を入れてよい
- 時刻は目安。営業時間の実データは無いので、reason で断定しない
- 時刻は上から順に前後しないようにする。決めきれない行だけ "" にする
- 「順番はそのままで時刻だけ入れる」も有効な提案。並べ替えを無理に作らない
- reason は1文、40文字以内`;

type PlanItemRow = {
  id: string;
  day: number;
  order: number;
  item_type: string;
  title: string;
  scheduled_time: string | null;
  duration_minutes: number | null;
  package_id: string | null;
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
      // id を渡さないと reorder で行を指せない
      lines.push(`  - id=${it.id} ${start} [${it.item_type}] ${it.title}（${dur}）`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

type Schedule = { day: number; itemIds: string[]; times: string[]; reason: string };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * AI が返した並べ替え・時刻を受け入れてよいか検証する。
 *
 * モデルの出力をそのまま流すと、行を落としたり増やしたり、
 * 時刻を巻き戻したりしうる。承認前にプレビューを見せる作りではあるが、
 * **壊れた提案はそもそも見せない**。以下を満たさないものは捨てる。
 *
 *  1. その日のIDと過不足なく一致する（追加も削除もしていない）
 *  2. times が itemIds と同数で、"HH:MM" か空文字
 *  3. 時刻が上から順に前後しない
 *  4. 同じパッケージ由来の行が連続している（手動ドラッグと同じ規則）
 *  5. 今の並び・時刻のどちらかが変わっている（同じなら提案する意味がない）
 */
function validateSchedule(schedule: Schedule, items: PlanItemRow[]): Schedule | null {
  const dayItems = items.filter((i) => i.day === schedule.day).sort((a, b) => a.order - b.order);
  if (dayItems.length === 0) return null;

  const current = dayItems.map((i) => i.id);
  const proposed = schedule.itemIds;

  // 1. 集合として一致するか
  if (proposed.length !== current.length) return null;
  if (new Set(proposed).size !== proposed.length) return null;
  const known = new Set(current);
  if (!proposed.every((id) => known.has(id))) return null;

  // 2. 時刻の形
  const times = schedule.times;
  if (times.length !== proposed.length) return null;
  if (!times.every((v) => v === '' || HHMM.test(v))) return null;

  // 3. 時刻が巻き戻っていないか。空欄は判定から外す
  const filled = times.filter((v) => v !== '');
  for (let i = 1; i < filled.length; i++) {
    if (filled[i] < filled[i - 1]) return null;
  }

  // 4. 同じパッケージ由来の行が連続しているか
  const byId = new Map(dayItems.map((i) => [i.id, i]));
  const runs = new Map<string, number[]>();
  proposed.forEach((id, idx) => {
    const pkg = byId.get(id)?.package_id;
    if (!pkg) return;
    if (!runs.has(pkg)) runs.set(pkg, []);
    runs.get(pkg)!.push(idx);
  });
  for (const idx of runs.values()) {
    if (idx[idx.length - 1] - idx[0] !== idx.length - 1) return null;
  }

  // 5. 並びも時刻も今と同じなら返さない
  const sameOrder = proposed.every((id, i) => id === current[i]);
  const sameTimes = proposed.every(
    (id, i) => (byId.get(id)?.scheduled_time?.slice(0, 5) ?? '') === times[i],
  );
  if (sameOrder && sameTimes) return null;

  return { day: schedule.day, itemIds: proposed, times, reason: schedule.reason };
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
    .select('id, day, order, item_type, title, scheduled_time, duration_minutes, package_id')
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
        // 平文だと見出しや記号がモデル任せになり、整形できない。
        // 形を固定してアプリ側で描く
        text: {
          format: {
            type: 'json_schema',
            name: 'plan_advice',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['concerns', 'suggestions', 'checks', 'schedule'],
              properties: {
                concerns: { type: 'array', items: { type: 'string' } },
                suggestions: { type: 'array', items: { type: 'string' } },
                checks: { type: 'array', items: { type: 'string' } },
                schedule: {
                  type: ['object', 'null'],
                  additionalProperties: false,
                  required: ['day', 'itemIds', 'times', 'reason'],
                  properties: {
                    day: { type: 'integer' },
                    itemIds: { type: 'array', items: { type: 'string' } },
                    // itemIds と同じ順・同じ個数。"HH:MM"、決めないなら ""
                    times: { type: 'array', items: { type: 'string' } },
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
        },
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
  // Responses API は output_text に本文がまとまる。無ければ output を辿る
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

  let parsed: {
    concerns?: unknown; suggestions?: unknown; checks?: unknown; schedule?: unknown;
  } | null = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error('plan/advise: response was not JSON', text.slice(0, 200));
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }

  const asLines = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];

  // schedule はモデルの出力なので、通す前に必ず検証する
  let schedule: Schedule | null = null;
  const r = parsed?.schedule;
  if (r && typeof r === 'object') {
    const cand = r as Partial<Schedule>;
    if (typeof cand.day === 'number' && Array.isArray(cand.itemIds) && Array.isArray(cand.times)) {
      schedule = validateSchedule(
        {
          day: cand.day,
          itemIds: cand.itemIds as string[],
          times: (cand.times as unknown[]).map((v) => (typeof v === 'string' ? v.trim() : '')),
          reason: String(cand.reason ?? ''),
        },
        usedItems,
      );
      if (!schedule) console.warn('plan/advise: schedule rejected by validation');
    }
  }

  return NextResponse.json({
    concerns: asLines(parsed?.concerns),
    suggestions: asLines(parsed?.suggestions),
    checks: asLines(parsed?.checks),
    schedule,
  });
}
