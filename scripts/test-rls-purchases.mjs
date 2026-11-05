// 使い方: ローカル Supabase 起動中に
//   eval "$(supabase status -o env | grep -E "^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=")" && API_URL=$API_URL ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY node scripts/test-rls-purchases.mjs
// purchases の INSERT 権限を実DB(ローカル Supabase)で確かめる
import { createClient } from '@supabase/supabase-js';
const URL = process.env.API_URL, ANON = process.env.ANON_KEY, SR = process.env.SERVICE_ROLE_KEY;
const service = createClient(URL, SR, { auth: { persistSession: false } });
let fail = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fail++; };

const { data: pkg } = await service.from('packages').select('id').limit(1).single();
const email = `rls-${Date.now()}@example.com`;
const { data: created, error: cErr } = await service.auth.admin.createUser({ email, password: 'pw-123456!', email_confirm: true });
if (cErr) throw cErr;
const uid = created.user.id;
const user = createClient(URL, ANON, { auth: { persistSession: false } });
await user.auth.signInWithPassword({ email, password: 'pw-123456!' });
const other = (await service.auth.admin.createUser({ email: 'o' + email, password: 'pw-123456!', email_confirm: true })).data.user.id;
// purchases.user_id は profiles を参照する。profiles が無いと外部キー違反(23503)で落ち、
// RLS で拒否されたのかを判別できないので先に作る
{ const { error } = await service.from('profiles').insert([{ id: uid }, { id: other }]); if (error) throw error; }
// RLS による拒否は 42501。それ以外のエラーでの失敗は「塞がっている」証拠にならない
const denied = (r) => r.error?.code === '42501';

try {
  // 1. 自分に completed を付与（今回塞ぐ穴）
  let r = await user.from('purchases').insert({ user_id: uid, package_id: pkg.id, amount: 0, currency: 'JPY', status: 'completed' });
  check('authenticated: 自分の completed 行を INSERT できない', denied(r), r.error?.code ?? 'INSERT成功してしまった');
  // 2. pending でも不可（状態に関わらず書けない）
  r = await user.from('purchases').insert({ user_id: uid, package_id: pkg.id, amount: 0, currency: 'JPY', status: 'pending' });
  check('authenticated: pending 行も INSERT できない', denied(r), r.error?.code);
  // 3. 他人名義も不可
  r = await user.from('purchases').insert({ user_id: other, package_id: pkg.id, amount: 0, currency: 'JPY', status: 'completed' });
  check('authenticated: 他人の行を INSERT できない', denied(r), r.error?.code);
  // 4. upsert（verify の旧実装と同じ呼び方）も不可
  r = await user.from('purchases').upsert({ user_id: uid, package_id: pkg.id, amount: 0, currency: 'JPY', status: 'completed', stripe_session_id: 'cs_test_x' + Date.now() }, { onConflict: 'stripe_session_id', ignoreDuplicates: true });
  check('authenticated: upsert も通らない', denied(r), r.error?.code);
  // 5. 匿名も不可
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  r = await anon.from('purchases').insert({ user_id: uid, package_id: pkg.id, amount: 0, currency: 'JPY', status: 'completed' });
  check('anon: INSERT できない', denied(r), r.error?.code);
  // 6. 何も書かれていない
  const { count } = await service.from('purchases').select('id', { count: 'exact', head: true }).eq('user_id', uid);
  check('上の試行で行が1件も作られていない', count === 0, `count=${count}`);
  // 7. service role（verify / webhook の経路）は書ける。同じ session_id の再実行は重複しない
  const sid = 'cs_test_sr' + Date.now();
  const row = { user_id: uid, package_id: pkg.id, amount: 500, currency: 'JPY', status: 'completed', stripe_session_id: sid };
  const a = await service.from('purchases').upsert(row, { onConflict: 'stripe_session_id', ignoreDuplicates: true });
  const b = await service.from('purchases').upsert(row, { onConflict: 'stripe_session_id', ignoreDuplicates: true });
  const { count: c2 } = await service.from('purchases').select('id', { count: 'exact', head: true }).eq('stripe_session_id', sid);
  check('service role: 書けて、2回目は重複しない', !a.error && !b.error && c2 === 1, `${a.error?.message ?? ''} count=${c2}`);
  // 8. 購入者本人は SELECT で読める（閲覧判定が壊れていない）
  const { data: mine } = await user.from('purchases').select('id').eq('stripe_session_id', sid);
  check('authenticated: 自分の購入は読める', mine?.length === 1);
} finally {
  await service.from('purchases').delete().in('user_id', [uid, other]);
  await service.auth.admin.deleteUser(uid); await service.auth.admin.deleteUser(other);
}
process.exit(fail ? 1 : 0);
