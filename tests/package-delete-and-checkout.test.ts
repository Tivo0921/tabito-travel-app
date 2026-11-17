import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { jsonRequest } from './helpers/supabase-mock';

// ── 削除: lib/supabase/queries.ts は ./client の createClient を使う ──
type Result = { data: unknown; error: unknown };
let deleteResult: Result;
const browserClient = {
  from: vi.fn(() => {
    const chain: Record<string, unknown> = {};
    for (const m of ['delete', 'eq']) chain[m] = () => chain;
    chain.select = () => Promise.resolve(deleteResult);
    return chain;
  }),
};
vi.mock('@/lib/supabase/client', () => ({ createClient: () => browserClient }));

// ── checkout: サーバー側の createClient と stripe ──
const eqCalls: Array<[string, unknown]> = [];
let pkgResult: Result;
let serverUser: { id: string } | null;
const serverClient = {
  auth: { getUser: () => Promise.resolve({ data: { user: serverUser }, error: null }) },
  from: vi.fn(() => {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = (col: string, val: unknown) => {
      eqCalls.push([col, val]);
      return chain;
    };
    chain.single = () => Promise.resolve(pkgResult);
    return chain;
  }),
};
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => serverClient }));
const createSession = vi.fn();
vi.mock('@/lib/stripe', () => ({ stripe: { checkout: { sessions: { create: (...a: unknown[]) => createSession(...a) } } } }));

import { classifyPackageDeleteError, deleteCreatorPackage } from '@/lib/supabase/queries';
import { POST as checkout } from '@/app/api/checkout/route';

const FK_MSG =
  'update or delete on table "packages" violates foreign key constraint "purchases_package_id_fkey" on table "purchases"';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  eqCalls.length = 0;
  createSession.mockReset();
  serverUser = { id: 'u1' };
});

describe('classifyPackageDeleteError', () => {
  it('purchases の外部キー違反は purchased', () => {
    expect(classifyPackageDeleteError({ code: '23503', message: FK_MSG })).toBe('purchased');
  });
  it('他の制約の 23503 は error（理由を取り違えない）', () => {
    expect(
      classifyPackageDeleteError({ code: '23503', message: 'violates foreign key constraint "other_fkey"' }),
    ).toBe('error');
  });
  it('message が無い 23503 は error', () => {
    expect(classifyPackageDeleteError({ code: '23503', message: null })).toBe('error');
  });
  it('コードが違えば制約名を含んでいても error', () => {
    expect(classifyPackageDeleteError({ code: '42501', message: FK_MSG })).toBe('error');
  });
  it('null は error', () => {
    expect(classifyPackageDeleteError(null)).toBe('error');
  });
});

describe('deleteCreatorPackage', () => {
  it('1行消えれば ok', async () => {
    deleteResult = { data: [{ id: 'p1' }], error: null };
    await expect(deleteCreatorPackage('p1')).resolves.toBe('ok');
  });
  it('売れているパッケージは purchased', async () => {
    deleteResult = { data: null, error: { code: '23503', message: FK_MSG } };
    await expect(deleteCreatorPackage('p1')).resolves.toBe('purchased');
  });
  it('RLS で 0 行（他人のもの）は error', async () => {
    deleteResult = { data: [], error: null };
    await expect(deleteCreatorPackage('p1')).resolves.toBe('error');
  });
  it('その他の DB エラーは error', async () => {
    deleteResult = { data: null, error: { code: '08006', message: 'connection failure' } };
    await expect(deleteCreatorPackage('p1')).resolves.toBe('error');
  });
});

describe('POST /api/checkout', () => {
  const call = (body: unknown) =>
    checkout(jsonRequest('http://localhost/api/checkout', body) as unknown as NextRequest);

  it('販売中（published）のパッケージに絞って引く', async () => {
    pkgResult = { data: { id: 'p1', price: 500, currency: 'JPY' }, error: null };
    createSession.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });
    const res = await call({ packageId: 'p1' });
    expect(res.status).toBe(200);
    expect(eqCalls).toContainEqual(['status', 'published']);
    expect(eqCalls).toContainEqual(['id', 'p1']);
  });
  it('非公開パッケージ（購入者には RLS で見えても絞り込みで 0 行）は 404 で Stripe を呼ばない', async () => {
    pkgResult = { data: null, error: { code: 'PGRST116', message: '0 rows' } };
    const res = await call({ packageId: 'p1' });
    expect(res.status).toBe(404);
    expect(createSession).not.toHaveBeenCalled();
  });
  it('未ログインは 401', async () => {
    serverUser = null;
    const res = await call({ packageId: 'p1' });
    expect(res.status).toBe(401);
  });
});
