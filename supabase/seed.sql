-- ════════════════════════════════════════════════════════════════
-- ローカル開発用シード
--   `supabase db reset` のときだけ実行される（本番には流れない）。
--   本番のシードガイドは実在するクリエイターのアカウントを紐付けること。
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────
-- シードガイド3件にデモ用のクリエイターアカウントを作る
--   チャット相手が居ないと購入後の動作確認ができないため。
--   パスワードはローカル専用: demo-password
-- ────────────────────────────────────────────────
WITH demo_creators(guide_id, user_id, email, display_name) AS (
  VALUES
    ('00000000-0000-0000-0001-000000000001'::uuid,
     '00000000-0000-0000-0009-000000000001'::uuid,
     'demo.tokyo@tabito.local', 'Mina Kim (demo)'),
    ('00000000-0000-0000-0001-000000000002'::uuid,
     '00000000-0000-0000-0009-000000000002'::uuid,
     'demo.osaka@tabito.local', 'Junho Park (demo)'),
    ('00000000-0000-0000-0001-000000000003'::uuid,
     '00000000-0000-0000-0009-000000000003'::uuid,
     'demo.kyoto@tabito.local', 'Seoyeon Lee (demo)')
),
inserted_users AS (
  -- GoTrue はトークン系カラムを空文字前提で読むため、NULL のままだと
  -- ログイン時に "Database error querying schema" になる。必ず '' を入れる。
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    user_id, 'authenticated', 'authenticated', email,
    crypt('demo-password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', display_name),
    '', '', '', ''
  FROM demo_creators
  ON CONFLICT (id) DO NOTHING
  RETURNING id
),
inserted_profiles AS (
  INSERT INTO public.profiles (id, display_name, email, native_language)
  SELECT user_id, display_name, email, 'ko' FROM demo_creators
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        email = EXCLUDED.email
  RETURNING id
)
UPDATE public.guides g
SET user_id = d.user_id
FROM demo_creators d
WHERE g.id = d.guide_id AND g.user_id IS NULL;
