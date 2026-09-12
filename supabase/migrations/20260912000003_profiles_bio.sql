-- ════════════════════════════════════════════════════════════════
-- プロフィールの自己紹介を profiles に持たせる #31
--
-- profile/edit は auth.users.user_metadata に書いていたが、
-- 表示側は全て profiles.display_name を読んでいた。書き込み先と
-- 読み取り先が違うため、保存しても何も変わらない状態だった。
--
-- display_name は既にあるので、足りないのは自己紹介だけ。
-- RLS は profiles_update_own が既にあり、追加は要らない。
-- ════════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN bio text;

COMMENT ON COLUMN profiles.bio IS
  'ユーザーの自己紹介。翻訳しない（本人が書いた言語のまま出す）';
