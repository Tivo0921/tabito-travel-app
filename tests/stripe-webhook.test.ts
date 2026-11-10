import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import type { NextRequest } from 'next/server';

// 署名の生成・検証はネットワークを使わないので、本物の SDK をダミーの鍵で使う
vi.mock('@/lib/stripe', async () => {
  const { default: S } = await import('stripe');
  return { stripe: new S('sk_test_dummy') };
});

const { upsert, from } = vi.hoisted(() => {
  const upsert = vi.fn();
  return { upsert, from: vi.fn(() => ({ upsert })) };
});
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from }) }));

import { POST } from '@/app/api/stripe/webhook/route';
import { stripe as realStripe } from '@/lib/stripe';

const SECRET = 'whsec_test_secret';

function session(over: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: 'cs_test_1',
    object: 'checkout.session',
    payment_status: 'paid',
    amount_total: 1500,
    currency: 'jpy',
    payment_intent: 'pi_test_1',
    metadata: { user_id: 'u1', package_id: 'p1' },
    ...over,
  };
}

function event(type: string, object: unknown, id = 'evt_1') {
  return JSON.stringify({ id, object: 'event', type, data: { object } });
}

function req(payload: string, sig: string | null | 'auto' = 'auto') {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (sig === 'auto') {
    headers['stripe-signature'] = realStripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  } else if (sig) {
    headers['stripe-signature'] = sig;
  }
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers,
    body: payload,
  }) as unknown as NextRequest;
}

beforeEach(() => {
  upsert.mockReset();
  from.mockClear();
  upsert.mockResolvedValue({ data: null, error: null });
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', SECRET);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('POST /api/stripe/webhook: 署名検証', () => {
  it('Stripe-Signature が無ければ 400 で DB に触らない', async () => {
    const res = await POST(req(event('checkout.session.completed', session()), null));
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it('署名が不正なら 400 で DB に触らない', async () => {
    const res = await POST(req(event('checkout.session.completed', session()), 't=1,v1=deadbeef'));
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it('別の secret で署名されたものは 400', async () => {
    const payload = event('checkout.session.completed', session());
    const sig = realStripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_other' });
    const res = await POST(req(payload, sig));
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it('署名後に body を書き換えたものは 400', async () => {
    const payload = event('checkout.session.completed', session());
    const sig = realStripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const tampered = payload.replace('"u1"', '"attacker"');
    const res = await POST(req(tampered, sig));
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it('STRIPE_WEBHOOK_SECRET 未設定なら 400 で DB に触らない', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    const res = await POST(req(event('checkout.session.completed', session())));
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});

describe('POST /api/stripe/webhook: checkout.session.completed', () => {
  it('支払い済みなら purchases に completed・session_id・payment_intent を記録する', async () => {
    const res = await POST(req(event('checkout.session.completed', session())));
    expect(res.status).toBe(200);
    expect(from).toHaveBeenCalledWith('purchases');
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: 'u1',
        package_id: 'p1',
        amount: 1500,
        currency: 'JPY',
        status: 'completed',
        stripe_session_id: 'cs_test_1',
        stripe_payment_intent_id: 'pi_test_1',
      },
      { onConflict: 'stripe_session_id', ignoreDuplicates: true },
    );
  });

  it('payment_intent が展開済みオブジェクトでも id を保存する', async () => {
    await POST(req(event('checkout.session.completed', session({
      payment_intent: { id: 'pi_obj' } as Stripe.PaymentIntent,
    }))));
    expect(upsert.mock.calls[0][0].stripe_payment_intent_id).toBe('pi_obj');
  });

  it('payment_intent が null（0円など）でも記録する', async () => {
    await POST(req(event('checkout.session.completed', session({ payment_intent: null }))));
    expect(upsert.mock.calls[0][0].stripe_payment_intent_id).toBeNull();
  });

  it('同じイベントの再送は同じ競合キーで upsert し、ignoreDuplicates で1行に収まる', async () => {
    const payload = event('checkout.session.completed', session());
    await POST(req(payload));
    await POST(req(payload));
    expect(upsert).toHaveBeenCalledTimes(2);
    for (const [, opts] of upsert.mock.calls) {
      expect(opts).toEqual({ onConflict: 'stripe_session_id', ignoreDuplicates: true });
    }
  });

  it('payment_status が paid でなければ記録せず 200', async () => {
    const res = await POST(req(event('checkout.session.completed', session({ payment_status: 'unpaid' }))));
    expect(res.status).toBe(200);
    expect(upsert).not.toHaveBeenCalled();
  });

  it.each([
    ['user_id が無い', { package_id: 'p1' }],
    ['package_id が無い', { user_id: 'u1' }],
    ['metadata が空', {}],
  ])('%s なら記録せず 200（再送しても直らない）', async (_, metadata) => {
    const res = await POST(req(event('checkout.session.completed', session({ metadata }))));
    expect(res.status).toBe(200);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('metadata が null でも 500 にならない', async () => {
    const res = await POST(req(event('checkout.session.completed', session({ metadata: null }))));
    expect(res.status).toBe(200);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('DB への書き込みが一時的に失敗したら 500（Stripe が再送する）', async () => {
    upsert.mockResolvedValue({ data: null, error: { code: '08006', message: 'connection failure' } });
    const res = await POST(req(event('checkout.session.completed', session())));
    expect(res.status).toBe(500);
  });

  it('code の無いエラー（ネットワーク等）も 500', async () => {
    upsert.mockResolvedValue({ data: null, error: { message: 'fetch failed' } });
    const res = await POST(req(event('checkout.session.completed', session())));
    expect(res.status).toBe(500);
  });

  it.each(['23503', '22P02'])('再送しても直らないエラー（%s）は 200 でログに残す', async (code) => {
    upsert.mockResolvedValue({ data: null, error: { code, message: 'x' } });
    const res = await POST(req(event('checkout.session.completed', session())));
    expect(res.status).toBe(200);
    expect(console.error).toHaveBeenCalled();
  });

  it('ログに署名ヘッダや secret を出さない', async () => {
    upsert.mockResolvedValue({ data: null, error: { code: '08006', message: 'x' } });
    await POST(req(event('checkout.session.completed', session())));
    const logged = JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls);
    expect(logged).not.toContain(SECRET);
    expect(logged).not.toContain('v1=');
    expect(logged).toContain('cs_test_1');
  });
});

describe('POST /api/stripe/webhook: 対象外のイベント', () => {
  it.each(['payment_intent.succeeded', 'charge.refunded', 'checkout.session.expired'])(
    '%s は何もせず 200',
    async (type) => {
      const res = await POST(req(event(type, { id: 'obj_1' })));
      expect(res.status).toBe(200);
      expect(from).not.toHaveBeenCalled();
    },
  );
});
