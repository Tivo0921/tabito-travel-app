/**
 * ローカル検証用: ログイン済みユーザーをガイド(クリエイター)に紐付ける。
 *
 * アプリのログインは Google のみなので、クリエイター側をブラウザで試すには
 * 「Googleでログインしたアカウント」を guides.user_id に結びつける必要がある。
 *
 *   node scripts/link-creator.mjs                    # 一覧を表示
 *   node scripts/link-creator.mjs <email>            # 一覧の先頭のガイドに紐付け
 *   node scripts/link-creator.mjs <email> <guide_id> # ガイドを指定して紐付け
 *
 * ローカルの Supabase 専用。本番には使わないこと。
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url?.includes('127.0.0.1') && !url?.includes('localhost')) {
  console.error(`中止: ローカル以外を指しています (${url})`);
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const [email, guideIdArg] = process.argv.slice(2);

const { data: guides } = await db
  .from('guides')
  .select('id, location, user_id')
  .order('location');

if (!email) {
  const { data: profiles } = await db.from('profiles').select('id, display_name, email');
  console.log('\n■ ログイン済みユーザー');
  for (const p of profiles ?? []) {
    console.log(`  ${p.email ?? '(メール未設定)'}  ${p.display_name ?? ''}`);
  }
  console.log('\n■ ガイド');
  for (const g of guides ?? []) {
    const owner = (profiles ?? []).find((p) => p.id === g.user_id);
    console.log(`  ${g.id}  ${g.location}  → ${owner?.email ?? g.user_id ?? '(未紐付け)'}`);
  }
  console.log('\n使い方: node scripts/link-creator.mjs <email> [guide_id]\n');
  process.exit(0);
}

const { data: profile } = await db
  .from('profiles')
  .select('id, display_name, avatar_url')
  .eq('email', email)
  .maybeSingle();

if (!profile) {
  console.error(`見つかりません: ${email}`);
  console.error('先にそのアカウントでアプリにGoogleログインしてください。');
  process.exit(1);
}

const guideId = guideIdArg ?? guides?.[0]?.id;

// アカウントの紐付け（誰がチャットを受け取るか）
const { error } = await db
  .from('guides')
  .update({ user_id: profile.id, avatar_url: profile.avatar_url })
  .eq('id', guideId);

if (error) {
  console.error('失敗:', error.message);
  process.exit(1);
}

// 表示名の差し替え。guide_translations.name は user_id とは別管理なので、
// ここを更新しないと画面上は元のシード名（例: Soyeon Lee）のまま表示されてしまう。
const displayName = profile.display_name ?? email;
const { error: nameError } = await db
  .from('guide_translations')
  .update({ name: displayName })
  .eq('guide_id', guideId);

if (nameError) {
  console.error('表示名の更新に失敗:', nameError.message);
  process.exit(1);
}

// 既存スレッドの相手も新しいクリエイターに付け替える。
// これをしないと、作成者を変えた後も古い相手宛のままになり新クリエイター側に表示されない。
const { data: ownPkgs } = await db.from('packages').select('id').eq('guide_id', guideId);
const pkgIds = (ownPkgs ?? []).map((p) => p.id);
let movedThreads = 0;
if (pkgIds.length) {
  const { data: moved } = await db
    .from('chat_threads')
    .update({ creator_id: profile.id })
    .in('package_id', pkgIds)
    .neq('creator_id', profile.id)
    // 購入者本人がクリエイターになるスレッドは制約違反になるので除外する
    .neq('buyer_id', profile.id)
    .select('id');
  movedThreads = moved?.length ?? 0;
}

const { data: pkgs } = await db
  .from('packages')
  .select('id, package_translations(title, language)')
  .eq('guide_id', guideId);

console.log(`\n紐付けました: ${email} → ガイド ${guideId}`);
console.log(`表示名も「${displayName}」に変更しました。`);
if (movedThreads > 0) {
  console.log(`既存チャット ${movedThreads} 件の相手も付け替えました。`);
}
console.log('このクリエイターのパッケージ:');
for (const p of pkgs ?? []) {
  const t = (p.package_translations ?? []).find((x) => x.language === 'ja');
  console.log(`  ${p.id}  ${t?.title ?? ''}`);
}
console.log('\n購入者側でこのパッケージを買うと、チャットが始められます。\n');
