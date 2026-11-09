import { vi } from 'vitest';

type Result = { data: unknown; error: unknown };

/**
 * createClient() が返す Supabase クライアントの最小限の偽物。
 * from(table) のメソッドチェーンはどこで await しても tables[table] を返す。
 */
export function fakeSupabase(opts: { userId: string | null; tables: Record<string, Result> }) {
  const from = vi.fn((table: string) => {
    const result = opts.tables[table] ?? { data: null, error: null };
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'limit']) chain[m] = () => chain;
    chain.maybeSingle = () => Promise.resolve(result);
    chain.single = () => Promise.resolve(result);
    chain.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return chain;
  });
  return {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: opts.userId ? { id: opts.userId } : null }, error: null }),
    },
    from,
  };
}

export function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
