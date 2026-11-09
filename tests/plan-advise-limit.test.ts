import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { fakeSupabase, jsonRequest } from './helpers/supabase-mock';

const rpc = vi.fn();
let supabase: ReturnType<typeof fakeSupabase>;
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ rpc }) }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => supabase }));

import { POST } from '@/app/api/plan/advise/route';

const PLAN = { id: 'p1', title: '京都', location: null, start_date: null, end_date: null };
const ITEMS = [
  { id: 'i1', day: 1, order: 0, item_type: 'spot', title: '清水寺', scheduled_time: null, duration_minutes: 60, package_id: null },
];
const ADVICE = { concerns: ['a'], suggestions: [], checks: [], schedule: null };

// route 内の「1分5回」の減速帯はユーザーごとなので、テストごとに別ユーザーにする
let n = 0;
const nextUser = () => `user-${++n}`;

function setup(userId: string | null = nextUser()) {
  supabase = fakeSupabase({
    userId,
    tables: { plans: { data: PLAN, error: null }, plan_items: { data: ITEMS, error: null } },
  });
  return userId;
}
const call = (body: unknown = { planId: 'p1' }) =>
  POST(jsonRequest('http://localhost/api/plan/advise', body) as unknown as NextRequest);

const consumeCalls = () => rpc.mock.calls.filter(([fn]) => fn === 'consume_api_usage');
const releaseCalls = () => rpc.mock.calls.filter(([fn]) => fn === 'release_api_usage');

const fetchMock = vi.fn();

beforeEach(() => {
  rpc.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('OPENAI_API_KEY', 'sk-test');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const okResponse = () =>
  new Response(JSON.stringify({ status: 'completed', output_text: JSON.stringify(ADVICE) }), { status: 200 });

describe('POST /api/plan/advise の1日の上限', () => {
  it('上限内なら OpenAI を呼び、回数は戻さない', async () => {
    const uid = setup();
    rpc.mockResolvedValue({ data: '2026-11-09', error: null });
    fetchMock.mockResolvedValue(okResponse());
    const res = await call();
    expect(res.status).toBe(200);
    expect(consumeCalls()).toEqual([
      ['consume_api_usage', { p_kind: 'plan_advise', p_user_id: uid, p_user_limit: 10 }],
    ]);
    expect(releaseCalls()).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('AI_DAILY_LIMIT を上限として渡す', async () => {
    setup();
    vi.stubEnv('AI_DAILY_LIMIT', '3');
    rpc.mockResolvedValue({ data: '2026-11-09', error: null });
    fetchMock.mockResolvedValue(okResponse());
    await call();
    expect(consumeCalls()[0][1]).toMatchObject({ p_user_limit: 3 });
  });

  it('上限に達していれば 429 daily_limit を返し、OpenAI を呼ばない', async () => {
    setup();
    rpc.mockResolvedValue({ data: null, error: null });
    const res = await call();
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'daily_limit' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('回数を数えられないときは 500 で、OpenAI を呼ばない', async () => {
    setup();
    rpc.mockResolvedValue({ data: null, error: { message: 'relation does not exist' } });
    const res = await call();
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['ネットワーク断', () => fetchMock.mockRejectedValue(new Error('network'))],
    ['OpenAI が 500', () => fetchMock.mockResolvedValue(new Response('err', { status: 500 }))],
    ['incomplete', () => fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: 'incomplete' }), { status: 200 }))],
    ['本文が空', () => fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: 'completed', output: [] }), { status: 200 }))],
    ['JSON でない', () => fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: 'completed', output_text: 'not json' }), { status: 200 }))],
  ])('OpenAI 失敗（%s）では数えた日の回数を戻して 502', async (_name, arrange) => {
    const uid = setup();
    rpc.mockImplementation(async (fn: string) =>
      fn === 'consume_api_usage' ? { data: '2026-11-09', error: null } : { data: null, error: null });
    arrange();
    const res = await call();
    expect(res.status).toBe(502);
    expect(releaseCalls()).toEqual([
      ['release_api_usage', { p_kind: 'plan_advise', p_user_id: uid, p_day: '2026-11-09', p_include_global: false }],
    ]);
  });

  it('回数を戻すのに失敗しても 502 を返す', async () => {
    setup();
    rpc.mockImplementation(async (fn: string) =>
      fn === 'consume_api_usage' ? { data: '2026-11-09', error: null } : { data: null, error: { message: 'x' } });
    fetchMock.mockRejectedValue(new Error('network'));
    const res = await call();
    expect(res.status).toBe(502);
  });

  it.each([
    ['未ログイン', () => setup(null), 401],
    ['planId なし', () => setup(), 400, {}],
    ['キー未設定', () => { setup(); vi.stubEnv('OPENAI_API_KEY', ''); }, 503],
  ] as const)('%s では回数を消費しない', async (_name, arrange, status, body?: unknown) => {
    arrange();
    const res = await call(body ?? { planId: 'p1' });
    expect(res.status).toBe(status);
    expect(consumeCalls()).toHaveLength(0);
  });

  it('計画が空なら回数を消費しない', async () => {
    supabase = fakeSupabase({
      userId: nextUser(),
      tables: { plans: { data: PLAN, error: null }, plan_items: { data: [], error: null } },
    });
    const res = await call();
    expect(res.status).toBe(400);
    expect(consumeCalls()).toHaveLength(0);
  });

  it('1分5回の減速帯は残っている（6回目は rate_limited で、DB に問い合わせない）', async () => {
    setup();
    rpc.mockResolvedValue({ data: '2026-11-09', error: null });
    fetchMock.mockImplementation(async () => okResponse());
    for (let i = 0; i < 5; i++) expect((await call()).status).toBe(200);
    const res = await call();
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate_limited' });
    expect(consumeCalls()).toHaveLength(5);
  });
});
