// 使い方: ローカル Supabase 起動中に
//   eval "$(supabase status -o env | grep -E "^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=")" && API_URL=$API_URL ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY node scripts/test-rls-purchased-access.mjs
// 購入者が、非公開にされた購入済みパッケージを読めることを実DB(ローカル Supabase)で確かめる #25
import { createClient } from '@supabase/supabase-js';
const URL = process.env.API_URL, ANON = process.env.ANON_KEY, SR = process.env.SERVICE_ROLE_KEY;
const service = createClient(URL, SR, { auth: { persistSession: false } });
let fail = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fail++; };

// スポットを持つ公開中パッケージを1つ選ぶ（公開→非公開の変化を確かめるため）
const { data: spotRow } = await service.from('spots').select('package_id, packages!inner(status)').eq('packages.status', 'published').limit(1).single();
const pkgId = spotRow.package_id;
const { data: pkg } = await service.from('packages').select('id, status, guide_id').eq('id', pkgId).single();
const originalStatus = pkg.status;

const stamp = Date.now();
const mk = async (tag) => {
  const email = `rls25-${tag}-${stamp}@example.com`;
  const { data, error } = await service.auth.admin.createUser({ email, password: 'pw-123456!', email_confirm: true });
  if (error) throw error;
  // 途中で失敗しても finally で消せるよう、作った時点で記録する
  created.push(data.user.id);
  // purchases.user_id は profiles を参照する
  { const { error: e } = await service.from('profiles').upsert({ id: data.user.id }); if (e) throw e; }
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  { const { error: e } = await client.auth.signInWithPassword({ email, password: 'pw-123456!' }); if (e) throw e; }
  return { id: data.user.id, client };
};
const created = [];
let buyer, refunded, pending, stranger;

const counts = async (client) => {
  const { data: p } = await client.from('packages').select('id').eq('id', pkgId);
  const { data: t } = await client.from('package_translations').select('package_id').eq('package_id', pkgId);
  const { data: s } = await client.from('spots').select('id, spot_translations(spot_id), japanese_phrases(id, japanese_phrase_translations(phrase_id))').eq('package_id', pkgId);
  const st = (s ?? []).reduce((n, r) => n + r.spot_translations.length, 0);
  const jp = (s ?? []).reduce((n, r) => n + r.japanese_phrases.length, 0);
  return { p: p?.length ?? 0, t: t?.length ?? 0, s: s?.length ?? 0, st, jp };
};

try {
  buyer = await mk('buyer'); refunded = await mk('refunded'); pending = await mk('pending'); stranger = await mk('stranger');
  const ins = await service.from('purchases').insert([
    { user_id: buyer.id, package_id: pkgId, amount: 500, currency: 'JPY', status: 'completed', stripe_session_id: `cs_rls25_a_${stamp}` },
    { user_id: refunded.id, package_id: pkgId, amount: 500, currency: 'JPY', status: 'refunded', stripe_session_id: `cs_rls25_b_${stamp}` },
    { user_id: pending.id, package_id: pkgId, amount: 500, currency: 'JPY', status: 'pending', stripe_session_id: `cs_rls25_c_${stamp}` },
  ]);
  if (ins.error) throw ins.error;
  const expected = await counts(service);
  await service.from('packages').update({ status: 'draft' }).eq('id', pkgId);

  // 1. 購入者（completed）は非公開後も全部読める
  const b = await counts(buyer.client);
  check('購入者: 非公開後も本体・翻訳・スポット・フレーズを読める', JSON.stringify(b) === JSON.stringify(expected) && expected.s > 0, `${JSON.stringify(b)} / ${JSON.stringify(expected)}`);
  // 2. 返金済み・無関係・匿名は読めない
  for (const [name, client] of [['返金済み', refunded.client], ['pending', pending.client], ['無関係', stranger.client], ['匿名', createClient(URL, ANON, { auth: { persistSession: false } })]]) {
    const c = await counts(client);
    check(`${name}: 非公開パッケージを読めない`, Object.values(c).every((v) => v === 0), JSON.stringify(c));
  }
  // 3. 購入者でも書き換え・削除はできない
  const u = await buyer.client.from('packages').update({ price: 1 }).eq('id', pkgId).select('id');
  check('購入者: UPDATE できない', (u.data?.length ?? 0) === 0, u.error?.code);
  const d = await buyer.client.from('packages').delete().eq('id', pkgId).select('id');
  check('購入者: DELETE できない', (d.data?.length ?? 0) === 0, d.error?.code);
  // 4. 売れたパッケージの削除は purchases_package_id_fkey の 23503（UI の出し分けの前提）
  //    購入行が無いまま試すと本当に消えてシードを壊すので、先に購入行があることを確かめる
  const { count: held } = await service.from('purchases').select('id', { count: 'exact', head: true }).eq('package_id', pkgId);
  if (held > 0) {
    const del = await service.from('packages').delete().eq('id', pkgId).select('id');
    check('売れたパッケージの削除は 23503 / purchases_package_id_fkey', del.error?.code === '23503' && del.error.message.includes('purchases_package_id_fkey'), `${del.error?.code} ${del.error?.message}`);
  } else {
    check('購入行が作られている（削除テストの前提）', false, `count=${held}`);
  }
} finally {
  await service.from('packages').update({ status: originalStatus }).eq('id', pkgId);
  await service.from('purchases').delete().in('user_id', created);
  for (const id of created) await service.auth.admin.deleteUser(id);
}
process.exit(fail ? 1 : 0);
