import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ rpc }) }));

import { consumeDailyUsage, readLimit, releaseDailyUsage } from '@/lib/usage-limit';

beforeEach(() => {
  rpc.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('readLimit', () => {
  it('未設定・空文字は既定値', () => {
    expect(readLimit(undefined, 10)).toBe(10);
    expect(readLimit('', 10)).toBe(10);
    expect(readLimit('  ', 10)).toBe(10);
  });
  it('整数を読む（前後の空白は無視）', () => {
    expect(readLimit('25', 10)).toBe(25);
    expect(readLimit(' 3 ', 10)).toBe(3);
  });
  it('0 は「使わせない」として有効', () => {
    expect(readLimit('0', 10)).toBe(0);
  });
  it.each(['-1', 'abc', '1.5', '10x', '1e3'])('不正な値 %s は既定値', (raw) => {
    expect(readLimit(raw, 10)).toBe(10);
  });
  it('integer の上限を超える値は丸める', () => {
    expect(readLimit('99999999999', 10)).toBe(2_147_483_647);
  });
});

describe('consumeDailyUsage', () => {
  it('日付が返れば通る。引数をそのまま関数へ渡す', async () => {
    rpc.mockResolvedValue({ data: '2026-11-09', error: null });
    await expect(
      consumeDailyUsage({ kind: 'places_search', userId: 'u1', userLimit: 100, globalLimit: 1000 }),
    ).resolves.toEqual({ ok: true, day: '2026-11-09' });
    expect(rpc).toHaveBeenCalledWith('consume_api_usage', {
      p_kind: 'places_search', p_user_id: 'u1', p_user_limit: 100, p_global_limit: 1000,
    });
  });
  it('globalLimit を渡さなければ p_global_limit を送らない', async () => {
    rpc.mockResolvedValue({ data: '2026-11-09', error: null });
    await consumeDailyUsage({ kind: 'plan_advise', userId: 'u1', userLimit: 10 });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('p_global_limit');
  });
  it('NULL は上限到達', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(consumeDailyUsage({ kind: 'plan_advise', userId: 'u1', userLimit: 10 }))
      .resolves.toEqual({ ok: false, reason: 'limit' });
  });
  it('DB エラー・例外は error（通さない）', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await expect(consumeDailyUsage({ kind: 'plan_advise', userId: 'u1', userLimit: 10 }))
      .resolves.toEqual({ ok: false, reason: 'error' });
    rpc.mockRejectedValueOnce(new Error('network'));
    await expect(consumeDailyUsage({ kind: 'plan_advise', userId: 'u1', userLimit: 10 }))
      .resolves.toEqual({ ok: false, reason: 'error' });
  });
});

describe('releaseDailyUsage', () => {
  it('数えた日を渡して戻す', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await releaseDailyUsage({ kind: 'plan_advise', userId: 'u1', day: '2026-11-09' });
    expect(rpc).toHaveBeenCalledWith('release_api_usage', {
      p_kind: 'plan_advise', p_user_id: 'u1', p_day: '2026-11-09', p_include_global: false,
    });
  });
  it('失敗しても例外を投げない', async () => {
    rpc.mockRejectedValue(new Error('network'));
    await expect(releaseDailyUsage({ kind: 'plan_advise', userId: 'u1', day: '2026-11-09' }))
      .resolves.toBeUndefined();
  });
});
