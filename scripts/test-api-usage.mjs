// 使い方: ローカル Supabase 起動中に
//   eval "$(supabase status -o env | grep -E "^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=")" && API_URL=$API_URL ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY node scripts/test-api-usage.mjs
// api_usage と consume_api_usage / release_api_usage を実DB(ローカル Supabase)で確かめる。#65 #66
import { createClient } from '@supabase/supabase-js';
const URL = process.env.API_URL, ANON = process.env.ANON_KEY, SR = process.env.SERVICE_ROLE_KEY;
const service = createClient(URL, SR, { auth: { persistSession: false } });
let fail = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fail++; };

const email = `usage-${Date.now()}@example.com`;
const mk = async (e) => { const { data, error } = await service.auth.admin.createUser({ email: e, password: 'pw-123456!', email_confirm: true }); if (error) throw error; return data.user.id; };
const uid = await mk(email);
const other = await mk('o' + email);
const user = createClient(URL, ANON, { auth: { persistSession: false } });
await user.auth.signInWithPassword({ email, password: 'pw-123456!' });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

// 他のテストと日付が被らないよう、遠い未来の日を使う（p_now で日付を指定できる）
const JST_2359 = '2099-01-01T14:59:59Z'; // 日本時間 2099-01-01 23:59:59
const JST_0000 = '2099-01-01T15:00:00Z'; // 日本時間 2099-01-02 00:00:00
const consume = (args) => service.rpc('consume_api_usage', args);
const countOf = async (kind, userId, day) => {
  let q = service.from('api_usage').select('count').eq('kind', kind).eq('day', day);
  q = userId ? q.eq('user_id', userId) : q.is('user_id', null);
  const { data } = await q.maybeSingle();
  return data?.count ?? 0;
};

try {
  // 1. 上限ちょうどまで通り、上限+1 は NULL
  const got = [];
  for (let i = 0; i < 4; i++) got.push((await consume({ p_kind: 'plan_advise', p_user_id: uid, p_user_limit: 3, p_now: JST_2359 })).data);
  check('上限3: 3回目までは日付、4回目は NULL', JSON.stringify(got) === JSON.stringify(['2099-01-01', '2099-01-01', '2099-01-01', null]), JSON.stringify(got));
  check('弾いた分は加算されない', (await countOf('plan_advise', uid, '2099-01-01')) === 3);
  // 2. 日本時間 0:00 で切り替わる
  const { data: next } = await consume({ p_kind: 'plan_advise', p_user_id: uid, p_user_limit: 3, p_now: JST_0000 });
  check('JST 0:00 以降は新しい日として通る', next === '2099-01-02', String(next));
  // 3. release は数えた日の行から1引く。0 未満にならない
  await service.rpc('release_api_usage', { p_kind: 'plan_advise', p_user_id: uid, p_day: '2099-01-01' });
  check('release で1減る', (await countOf('plan_advise', uid, '2099-01-01')) === 2);
  for (let i = 0; i < 5; i++) await service.rpc('release_api_usage', { p_kind: 'plan_advise', p_user_id: uid, p_day: '2099-01-02' });
  check('release を重ねても 0 未満にならない', (await countOf('plan_advise', uid, '2099-01-02')) === 0);
  // 4. 同時リクエスト: 上限10に30件同時 → ちょうど10件だけ通る
  const day3 = '2099-01-03T03:00:00Z';
  const rs = await Promise.all(Array.from({ length: 30 }, () => consume({ p_kind: 'plan_advise', p_user_id: other, p_user_limit: 10, p_now: day3 })));
  const passed = rs.filter((r) => r.data).length;
  check('同時30件で通るのは上限の10件だけ', passed === 10 && rs.every((r) => !r.error), `passed=${passed}`);
  // 5. 全体上限: 全体2 / 本人5 で、3件目は本人上限内でも弾かれ、本人の回数に残らない
  const day4 = '2099-01-04T03:00:00Z';
  await consume({ p_kind: 'places_search', p_user_id: uid, p_user_limit: 5, p_global_limit: 2, p_now: day4 });
  await consume({ p_kind: 'places_search', p_user_id: other, p_user_limit: 5, p_global_limit: 2, p_now: day4 });
  const { data: third } = await consume({ p_kind: 'places_search', p_user_id: other, p_user_limit: 5, p_global_limit: 2, p_now: day4 });
  check('全体上限に達すると弾く', third === null, String(third));
  check('全体で弾かれた分は本人の回数に残らない', (await countOf('places_search', other, '2099-01-04')) === 1);
  check('全体の行は上限で止まる', (await countOf('places_search', null, '2099-01-04')) === 2);
  // 6. 利用者は関数を呼べない（全体の回数を空打ちで埋められない）
  let r = await user.rpc('consume_api_usage', { p_kind: 'places_search', p_user_id: uid, p_user_limit: 1000, p_global_limit: 1000 });
  check('authenticated: consume_api_usage を呼べない', !!r.error, r.error?.code ?? '呼べてしまった');
  r = await user.rpc('release_api_usage', { p_kind: 'plan_advise', p_user_id: uid, p_day: '2099-01-01' });
  check('authenticated: release_api_usage を呼べない', !!r.error, r.error?.code ?? '呼べてしまった');
  r = await anon.rpc('consume_api_usage', { p_kind: 'plan_advise', p_user_id: uid, p_user_limit: 1000 });
  check('anon: consume_api_usage を呼べない', !!r.error, r.error?.code ?? '呼べてしまった');
  // 7. 本人の行だけ読める。書けない
  const { data: seen } = await user.from('api_usage').select('user_id');
  check('authenticated: 自分の行だけ見える', seen?.length > 0 && seen.every((x) => x.user_id === uid), JSON.stringify(seen));
  r = await user.from('api_usage').update({ count: 0 }).eq('user_id', uid).select();
  check('authenticated: UPDATE できない', !!r.error || (r.data ?? []).length === 0, r.error?.code);
  r = await user.from('api_usage').delete().eq('user_id', uid).select();
  check('authenticated: DELETE できない', !!r.error || (r.data ?? []).length === 0, r.error?.code);
  r = await user.from('api_usage').insert({ kind: 'plan_advise', user_id: uid, day: '2099-02-01', count: 0 });
  check('authenticated: INSERT できない', !!r.error, r.error?.code);
  const { data: anonSeen, error: anonErr } = await anon.from('api_usage').select('user_id');
  check('anon: 1行も読めない', !!anonErr || (anonSeen ?? []).length === 0, anonErr?.code);
} finally {
  // ユーザー削除で api_usage の本人行は CASCADE で消える。全体の行は手で消す
  await service.from('api_usage').delete().is('user_id', null).gte('day', '2099-01-01');
  await service.auth.admin.deleteUser(uid); await service.auth.admin.deleteUser(other);
}
process.exit(fail ? 1 : 0);
