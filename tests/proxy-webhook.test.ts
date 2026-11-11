import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

import { proxy } from '@/proxy';

const call = (path: string) =>
  proxy(new NextRequest(`https://tabito.site${path}`, { method: 'POST' }));

beforeEach(() => {
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
});
afterEach(() => vi.unstubAllEnvs());

describe('proxy と Stripe Webhook', () => {
  it('本番のメンテナンス中でも /api/stripe/webhook はリダイレクトしない', async () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true');
    vi.stubEnv('VERCEL_ENV', 'production');
    const res = await call('/api/stripe/webhook');
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('/api/stripe/webhook ではセッション更新（getUser）をしない', async () => {
    await call('/api/stripe/webhook');
    expect(getUser).not.toHaveBeenCalled();
  });

  it('メンテナンス中、他の API はこれまでどおり /maintenance へリダイレクトする', async () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true');
    vi.stubEnv('VERCEL_ENV', 'production');
    const res = await call('/api/checkout');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://tabito.site/maintenance');
  });

  it('旧パス /api/webhook や前方一致のパスは除外しない', async () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true');
    vi.stubEnv('VERCEL_ENV', 'production');
    for (const p of ['/api/webhook', '/api/stripe/webhook/x', '/api/stripe/webhookx']) {
      const res = await call(p);
      expect(res.status).toBe(307);
    }
  });

  it('通常のパスではセッション更新をする', async () => {
    await call('/home');
    expect(getUser).toHaveBeenCalledTimes(1);
  });
});
