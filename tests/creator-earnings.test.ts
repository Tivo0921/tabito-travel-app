import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, getUser } = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getUser }, rpc }),
}));

import { getMyCreatorEarnings, parseCreatorEarnings } from '@/lib/creator-earnings';

const row = { sales_count: 2, gross_amount: 5000, platform_fee: 500, creator_net: 4500, unpaid_net: 4500 };

describe('parseCreatorEarnings', () => {
  it('1行の配列を取り出す', () => {
    expect(parseCreatorEarnings([row])).toEqual({
      salesCount: 2, grossAmount: 5000, platformFee: 500, creatorNet: 4500, unpaidNet: 4500,
    });
  });

  it('bigint が文字列で届いても数値にする', () => {
    expect(parseCreatorEarnings([{ ...row, gross_amount: '5000', unpaid_net: '4500' }])?.grossAmount).toBe(5000);
  });

  it('空配列は売上0件として扱う', () => {
    expect(parseCreatorEarnings([])).toEqual({
      salesCount: 0, grossAmount: 0, platformFee: 0, creatorNet: 0, unpaidNet: 0,
    });
  });

  it.each([
    ['null', null],
    ['列の欠落', [{ ...row, unpaid_net: undefined }]],
    ['負の値', [{ ...row, creator_net: -1 }]],
    ['小数', [{ ...row, platform_fee: 1.5 }]],
    ['数値でない文字列', [{ ...row, sales_count: 'abc' }]],
    ['空文字', [{ ...row, sales_count: '' }]],
    ['安全な整数を越える値', [{ ...row, gross_amount: '9007199254740993' }]],
    ['配列でない文字列', 'x'],
  ])('想定外の形は null（%s）', (_label, data) => {
    expect(parseCreatorEarnings(data)).toBeNull();
  });
});

describe('getMyCreatorEarnings', () => {
  beforeEach(() => {
    rpc.mockReset();
    getUser.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('未ログインは RPC を呼ばずに unauthenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await getMyCreatorEarnings()).toEqual({ ok: false, reason: 'unauthenticated' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('引数なしで get_my_creator_earnings を呼ぶ（利用者IDを渡さない）', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    rpc.mockResolvedValue({ data: [row], error: null });
    const r = await getMyCreatorEarnings();
    expect(rpc).toHaveBeenCalledWith('get_my_creator_earnings');
    expect(r).toEqual({ ok: true, earnings: expect.objectContaining({ unpaidNet: 4500 }) });
  });

  it('RPC のエラーは error', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    rpc.mockResolvedValue({ data: null, error: { code: '42883', message: 'function does not exist' } });
    expect(await getMyCreatorEarnings()).toEqual({ ok: false, reason: 'error' });
  });

  it('想定外の形は error（0円と誤表示しない）', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    rpc.mockResolvedValue({ data: [{ sales_count: 1 }], error: null });
    expect(await getMyCreatorEarnings()).toEqual({ ok: false, reason: 'error' });
  });
});
