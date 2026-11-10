import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeSupabase } from './helpers/supabase-mock';

const { retrieve, upsert, from } = vi.hoisted(() => {
  const upsert = vi.fn();
  return { retrieve: vi.fn(), upsert, from: vi.fn(() => ({ upsert })) };
});
vi.mock('@/lib/stripe', () => ({ stripe: { checkout: { sessions: { retrieve } } } }));

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from }) }));

let supabase: ReturnType<typeof fakeSupabase>;
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => supabase }));

import { GET } from '@/app/api/checkout/verify/route';

const call = (q = '?session_id=cs_1') => GET(new NextRequest(`http://localhost/api/checkout/verify${q}`));
const paid = (over: Record<string, unknown> = {}) => ({
  id: 'cs_1',
  payment_status: 'paid',
  amount_total: 800,
  currency: 'jpy',
  payment_intent: 'pi_1',
  metadata: { user_id: 'me', package_id: 'p1' },
  ...over,
});

beforeEach(() => {
  retrieve.mockReset();
  upsert.mockReset();
  from.mockClear();
  upsert.mockResolvedValue({ data: null, error: null });
  supabase = fakeSupabase({ userId: 'me', tables: {} });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/checkout/verify', () => {
  it('本人の支払い済み Session なら Webhook と同じ形で記録する（payment_intent も保存）', async () => {
    retrieve.mockResolvedValue(paid());
    const res = await call();
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'me',
        package_id: 'p1',
        status: 'completed',
        stripe_session_id: 'cs_1',
        stripe_payment_intent_id: 'pi_1',
      }),
      { onConflict: 'stripe_session_id', ignoreDuplicates: true },
    );
  });

  it('他人の Session は 400 で記録しない', async () => {
    retrieve.mockResolvedValue(paid({ metadata: { user_id: 'someone', package_id: 'p1' } }));
    const res = await call();
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('未ログインは 401 で Stripe にも問い合わせない', async () => {
    supabase = fakeSupabase({ userId: null, tables: {} });
    const res = await call();
    expect(res.status).toBe(401);
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('未払いは 400 で記録しない', async () => {
    retrieve.mockResolvedValue(paid({ payment_status: 'unpaid' }));
    expect((await call()).status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('DB 書き込み失敗は 500', async () => {
    retrieve.mockResolvedValue(paid());
    upsert.mockResolvedValue({ data: null, error: { code: '08006', message: 'x' } });
    expect((await call()).status).toBe(500);
  });
});
