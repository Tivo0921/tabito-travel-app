import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { fakeSupabase, jsonRequest } from './helpers/supabase-mock';

const rpc = vi.fn();
let supabase: ReturnType<typeof fakeSupabase>;
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ rpc }) }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => supabase }));

import { POST } from '@/app/api/places/search/route';

let n = 0;
function setup(opts: { guide?: boolean } = {}) {
  const userId = `creator-${++n}`;
  supabase = fakeSupabase({
    userId,
    tables: { guides: { data: opts.guide === false ? null : { id: 'g1' }, error: null } },
  });
  return userId;
}
const call = (query: unknown = '清水寺') =>
  POST(jsonRequest('http://localhost/api/places/search', { query }) as unknown as NextRequest);
const consumeCalls = () => rpc.mock.calls.filter(([fn]) => fn === 'consume_api_usage');

const fetchMock = vi.fn();
const googleOk = () =>
  new Response(JSON.stringify({
    places: [{ id: 'x', displayName: { text: '清水寺' }, formattedAddress: '京都', location: { latitude: 35, longitude: 135 } }],
  }), { status: 200 });

beforeEach(() => {
  rpc.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('POST /api/places/search の1日の上限', () => {
  it('既定はユーザー100回・全体1000回で数えてから Google を呼ぶ', async () => {
    const uid = setup();
    rpc.mockResolvedValue({ data: '2026-11-09', error: null });
    fetchMock.mockResolvedValue(googleOk());
    const res = await call();
    expect(res.status).toBe(200);
    expect(consumeCalls()).toEqual([[
      'consume_api_usage',
      { p_kind: 'places_search', p_user_id: uid, p_user_limit: 100, p_global_limit: 1000 },
    ]]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('環境変数の上限を渡す', async () => {
    setup();
    vi.stubEnv('PLACES_DAILY_LIMIT', '5');
    vi.stubEnv('PLACES_GLOBAL_DAILY_LIMIT', '50');
    rpc.mockResolvedValue({ data: '2026-11-09', error: null });
    fetchMock.mockResolvedValue(googleOk());
    await call();
    expect(consumeCalls()[0][1]).toMatchObject({ p_user_limit: 5, p_global_limit: 50 });
  });

  it('上限（本人または全体）に達していれば 429 daily_limit で Google を呼ばない', async () => {
    setup();
    rpc.mockResolvedValue({ data: null, error: null });
    const res = await call();
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'daily_limit' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('回数を数えられないときは 500 で Google を呼ばない', async () => {
    setup();
    rpc.mockResolvedValue({ data: null, error: { message: 'x' } });
    const res = await call();
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Google の失敗では回数を戻さない', async () => {
    setup();
    rpc.mockResolvedValue({ data: '2026-11-09', error: null });
    fetchMock.mockResolvedValue(new Response('quota', { status: 429 }));
    const res = await call();
    expect(res.status).toBe(502);
    expect(rpc.mock.calls.some(([fn]) => fn === 'release_api_usage')).toBe(false);
  });

  it.each([
    ['1文字', 'a'],
    ['空白だけ', '   '],
    ['101文字', 'あ'.repeat(101)],
    ['文字列でない', 123],
  ])('検索語が不正（%s）なら回数を消費しない', async (_name, query) => {
    setup();
    const res = await call(query);
    expect(res.status).toBe(200);
    expect(consumeCalls()).toHaveLength(0);
  });

  it('クリエイター未登録は 403 で回数を消費しない', async () => {
    setup({ guide: false });
    const res = await call();
    expect(res.status).toBe(403);
    expect(consumeCalls()).toHaveLength(0);
  });

  it('キー未設定は 503 で回数を消費しない', async () => {
    setup();
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '');
    const res = await call();
    expect(res.status).toBe(503);
    expect(consumeCalls()).toHaveLength(0);
  });
});
