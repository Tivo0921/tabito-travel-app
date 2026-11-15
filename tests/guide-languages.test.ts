import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeGuideLanguages } from '@/lib/guide-languages';
import { registerAsGuide, updateMyGuideProfile } from '@/lib/supabase/queries';

describe('normalizeGuideLanguages (#47)', () => {
  it('言語コードはそのまま残す', () => {
    expect(normalizeGuideLanguages(['ja', 'ko'])).toEqual(['ja', 'ko']);
  });

  it('シードデータの表示名をコードに読み替える（英語を落とさない）', () => {
    expect(normalizeGuideLanguages(['日本語', '英語'])).toEqual(['ja', 'en']);
    expect(normalizeGuideLanguages(['韓国語'])).toEqual(['ko']);
  });

  it('各言語での自称・英語名・大文字小文字・前後の空白を吸収する', () => {
    expect(normalizeGuideLanguages(['English', ' 한국어 ', 'JAPANESE', 'Korean', ' EN '])).toEqual([
      'en',
      'ko',
      'ja',
    ]);
  });

  it('表示名とコードが混ざっても重複させず、元の順を保つ', () => {
    expect(normalizeGuideLanguages(['英語', '日本語', 'en', 'ja'])).toEqual(['en', 'ja']);
  });

  it('知らない値・空文字・文字列以外は落とす', () => {
    expect(normalizeGuideLanguages(['fr', '', '  ', '中文', null, 1, undefined, {}])).toEqual([]);
    expect(normalizeGuideLanguages(['fr', 'ja'])).toEqual(['ja']);
  });

  it('プロトタイプのプロパティ名を言語として扱わない', () => {
    expect(normalizeGuideLanguages(['constructor', 'toString', '__proto__', 'hasOwnProperty'])).toEqual([]);
  });

  it('null / undefined / 配列以外は空配列', () => {
    expect(normalizeGuideLanguages(null)).toEqual([]);
    expect(normalizeGuideLanguages(undefined)).toEqual([]);
    expect(normalizeGuideLanguages('ja' as unknown as string[])).toEqual([]);
  });
});

// ── 保存経路: DB に表示名を書かない ──────────────────────────────

type Call = { table: string; op: string; payload: unknown };
const calls: Call[] = [];
let userId: string | null = 'user-1';

function fakeClient() {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: userId ? { id: userId, user_metadata: {} } : null }, error: null }),
    },
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      const result = () => {
        if (table === 'guides' && calls.at(-1)?.op === 'update') return { data: [{ id: 'g1' }], error: null };
        if (table === 'guides' && calls.at(-1)?.op === 'insert')
          return { data: { id: 'g1', ...(calls.at(-1)!.payload as object) }, error: null };
        // getMyGuideProfile: 未登録
        if (table === 'guides') return { data: [], error: null };
        return { data: null, error: null };
      };
      for (const m of ['select', 'eq', 'order', 'limit']) chain[m] = () => chain;
      for (const op of ['update', 'insert', 'upsert', 'delete']) {
        chain[op] = (payload: unknown) => {
          calls.push({ table, op, payload });
          return chain;
        };
      }
      chain.single = () => Promise.resolve(result());
      chain.maybeSingle = () => Promise.resolve(result());
      chain.then = (resolve: (r: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(result()).then(resolve, reject);
      return chain;
    },
  };
}

// vi.mock は巻き上げられる。fakeClient は createClient() の呼び出し時に参照されるので問題ない
vi.mock('@/lib/supabase/client', () => ({ createClient: () => fakeClient() }));


describe('updateMyGuideProfile の言語の正規化 (#47)', () => {
  beforeEach(() => {
    calls.length = 0;
    userId = 'user-1';
  });

  it('表示名で渡されてもコードで保存する', async () => {
    const r = await updateMyGuideProfile({ name: 'A', bio: '', location: '東京', languages: ['日本語', '英語'] });
    expect(r).toBe('ok');
    const upd = calls.find((c) => c.table === 'guides' && c.op === 'update');
    expect(upd?.payload).toEqual({ location: '東京', languages: ['ja', 'en'] });
  });

  it('知らない値だけなら DB に触らず error', async () => {
    const r = await updateMyGuideProfile({ name: 'A', bio: '', location: '東京', languages: ['fr', ''] });
    expect(r).toBe('error');
    expect(calls).toHaveLength(0);
  });

  it('未ログインは forbidden', async () => {
    userId = null;
    const r = await updateMyGuideProfile({ name: 'A', bio: '', location: '東京', languages: ['ja'] });
    expect(r).toBe('forbidden');
    expect(calls).toHaveLength(0);
  });
});

describe('registerAsGuide の言語の正規化 (#47)', () => {
  beforeEach(() => {
    calls.length = 0;
    userId = 'user-1';
  });

  it('コード以外を落とし、重複を除いて insert する', async () => {
    await registerAsGuide('A', '東京', '', ['ja', 'xx', 'JA', 'ko']);
    const ins = calls.find((c) => c.table === 'guides' && c.op === 'insert');
    expect((ins?.payload as { languages: string[] }).languages).toEqual(['ja', 'ko']);
  });

  it('有効な言語が1つも無ければ作らない', async () => {
    const g = await registerAsGuide('A', '東京', '', ['xx']);
    expect(g).toBeNull();
    expect(calls.find((c) => c.op === 'insert')).toBeUndefined();
  });
});
