// 使い方: ローカル Supabase 起動中に
//   eval "$(supabase status -o env | grep -E "^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=")" && API_URL=$API_URL ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY node scripts/test-revenue-split.mjs
// 収益分配（#19）を Supabase API 経由で確かめる。SQL 単体の確認は scripts/test-revenue-split.sql
import { createClient } from '@supabase/supabase-js';
const URL = process.env.API_URL, ANON = process.env.ANON_KEY, SR = process.env.SERVICE_ROLE_KEY;
const service = createClient(URL, SR, { auth: { persistSession: false } });
let fail = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fail++; };

// 受取人が分かるパッケージ（guides.user_id が入っているもの）を使う
const { data: pkg, error: pErr } = await service
  .from('packages').select('id, guides!inner(user_id)').not('guides.user_id', 'is', null).limit(1).single();
if (pErr) throw pErr;
const creatorId = pkg.guides.user_id;

const stamp = Date.now();
const mk = async (email) => {
  const { data, error } = await service.auth.admin.createUser({ email, password: 'pw-123456!', email_confirm: true });
  if (error) throw error;
  await service.from('profiles').upsert({ id: data.user.id });
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: 'pw-123456!' });
  return { id: data.user.id, client: c };
};
const buyer = await mk(`rs-buyer-${stamp}@example.com`);
const stranger = await mk(`rs-other-${stamp}@example.com`);
const sids = [`cs_rs_${stamp}_1`, `cs_rs_${stamp}_2`];

try {
  // 1. verify / webhook と同じ upsert（分配の列は渡さない）で分配が入る
  const base = { user_id: buyer.id, package_id: pkg.id, currency: 'JPY', status: 'completed' };
  let r = await service.from('purchases').upsert({ ...base, amount: 1005, stripe_session_id: sids[0] }, { onConflict: 'stripe_session_id', ignoreDuplicates: true });
  check('service role: 分配の列なしで INSERT できる', !r.error, r.error?.message);
  const { data: row } = await service.from('purchases').select('*').eq('stripe_session_id', sids[0]).single();
  check('1005円 → 手数料101 / 取り分904', row?.platform_fee === 101 && row?.creator_net === 904, JSON.stringify(row && { f: row.platform_fee, n: row.creator_net }));
  check('受取人は購入時点のパッケージ所有者', row?.creator_user_id === creatorId);

  // 2. 呼び出し側の値は上書きされる
  r = await service.from('purchases').insert({ ...base, amount: 2000, stripe_session_id: sids[1], platform_fee: 0, creator_net: 2000, creator_user_id: stranger.id });
  const { data: row2 } = await service.from('purchases').select('*').eq('stripe_session_id', sids[1]).single();
  check('渡した分配・受取人は使われない', row2?.platform_fee === 200 && row2?.creator_user_id === creatorId, JSON.stringify(row2 && { f: row2.platform_fee, c: row2.creator_user_id }));

  // 3. 分配は service role でも書き換えられない
  r = await service.from('purchases').update({ creator_net: 1 }).eq('stripe_session_id', sids[1]);
  check('分配の UPDATE は拒否される', r.error?.code === '23514', r.error?.code ?? 'UPDATE成功してしまった');

  // 4. 集計関数: 購入者でもクリエイターでもない利用者は 0、匿名は呼べない
  const s = await stranger.client.rpc('get_my_creator_earnings');
  check('無関係の利用者の集計は 0', !s.error && s.data?.[0]?.sales_count === 0, s.error?.message);
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const a = await anon.rpc('get_my_creator_earnings');
  check('anon は集計関数を呼べない', !!a.error, a.error?.code ?? '呼べてしまった');

  // 5. 他人は purchases の行を読めない（購入者の user_id がクリエイターにも見えない）
  const { data: seen } = await stranger.client.from('purchases').select('id').in('stripe_session_id', sids);
  check('他人は購入行を読めない', (seen ?? []).length === 0);
} finally {
  await service.from('purchases').delete().in('stripe_session_id', sids);
  await service.auth.admin.deleteUser(buyer.id); await service.auth.admin.deleteUser(stranger.id);
}
process.exit(fail ? 1 : 0);
