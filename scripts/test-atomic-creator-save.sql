-- クリエイター保存の RPC（#22, 20261113000001_atomic_creator_save.sql）を PostgreSQL 上で確かめる。
--
-- 使い方（ローカル Supabase 起動中。DB は使い捨てのローカルに限る）:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f scripts/test-atomic-creator-save.sql
-- 全体を1トランザクションで実行して最後に ROLLBACK するので、データは残らない。
-- 失敗すると ASSERT で止まる。最後まで進めば "ALL PASS" を出す。
--
-- 利用者の切り替えは PostgREST と同じく、ロール authenticated と
-- request.jwt.claim.sub（auth.uid() が読む値）で行う。

BEGIN;

-- ── テスト用データ（postgres として作る） ─────────────────────
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000022c1', 'cs-owner@example.com'),
  ('00000000-0000-0000-0000-0000000022c2', 'cs-other@example.com')
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id) VALUES
  ('00000000-0000-0000-0000-0000000022c1'),
  ('00000000-0000-0000-0000-0000000022c2')
ON CONFLICT DO NOTHING;
INSERT INTO public.areas (id, name) VALUES
  ('00000000-0000-0000-0000-00000022aaa1', 'cs-area-1'),
  ('00000000-0000-0000-0000-00000022aaa2', 'cs-area-2');
INSERT INTO public.guides (id, user_id, location) VALUES
  ('00000000-0000-0000-0000-0000000022b1', '00000000-0000-0000-0000-0000000022c1', 'Tokyo'),
  ('00000000-0000-0000-0000-0000000022b2', '00000000-0000-0000-0000-0000000022c2', 'Osaka');
INSERT INTO public.packages (id, guide_id, area_id, price, status) VALUES
  ('00000000-0000-0000-0000-0000000022d1', '00000000-0000-0000-0000-0000000022b1', '00000000-0000-0000-0000-00000022aaa1', 1000, 'published'),
  ('00000000-0000-0000-0000-0000000022d2', '00000000-0000-0000-0000-0000000022b1', '00000000-0000-0000-0000-00000022aaa1', 1000, 'draft'),
  ('00000000-0000-0000-0000-0000000022d9', '00000000-0000-0000-0000-0000000022b2', '00000000-0000-0000-0000-00000022aaa1', 9000, 'draft');
INSERT INTO public.package_translations (package_id, language, title) VALUES
  ('00000000-0000-0000-0000-0000000022d1', 'ja', '旧タイトル'),
  ('00000000-0000-0000-0000-0000000022d9', 'ja', '他人のパッケージ');
-- d2 は翻訳が無い（INSERT 側の分岐を通す）
INSERT INTO public.spots (id, package_id, "order", map_url) VALUES
  ('00000000-0000-0000-0000-0000000022e1', '00000000-0000-0000-0000-0000000022d1', 1, 'https://old.example/map'),
  ('00000000-0000-0000-0000-0000000022e9', '00000000-0000-0000-0000-0000000022d9', 1, 'https://other.example/map');
INSERT INTO public.spot_translations (spot_id, language, name) VALUES
  ('00000000-0000-0000-0000-0000000022e1', 'ja', '旧スポット'),
  ('00000000-0000-0000-0000-0000000022e9', 'ja', '他人のスポット');
INSERT INTO public.japanese_phrases (id, spot_id, japanese, "order") VALUES
  ('00000000-0000-0000-0000-0000000022f1', '00000000-0000-0000-0000-0000000022e1', '旧フレーズ', 1),
  ('00000000-0000-0000-0000-0000000022f9', '00000000-0000-0000-0000-0000000022e9', '他人のフレーズ', 1);
INSERT INTO public.japanese_phrase_translations (phrase_id, language, meaning) VALUES
  ('00000000-0000-0000-0000-0000000022f1', 'ja', 'old'),
  ('00000000-0000-0000-0000-0000000022f9', 'ja', 'other');

-- 原子性の確認用: meaning が 'BOOM' のフレーズ翻訳、title が 'BOOM' の
-- パッケージ翻訳の書き込みを失敗させる（最初の書き込みの後で落ちる状況を作る）
CREATE FUNCTION pg_temp.boom() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- テーブルごとに列が違うので jsonb 経由で読む
  IF (TG_TABLE_NAME = 'japanese_phrase_translations' AND to_jsonb(NEW)->>'meaning' = 'BOOM')
     OR (TG_TABLE_NAME = 'package_translations' AND to_jsonb(NEW)->>'title' = 'BOOM') THEN
    RAISE EXCEPTION 'boom';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cs_boom BEFORE INSERT OR UPDATE ON public.japanese_phrase_translations
  FOR EACH ROW EXECUTE FUNCTION pg_temp.boom();
CREATE TRIGGER cs_boom BEFORE INSERT OR UPDATE ON public.package_translations
  FOR EACH ROW EXECUTE FUNCTION pg_temp.boom();

-- ── クリエイター本人として実行 ─────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000022c1', true);

-- 1. パッケージ: 本人は保存でき、基本情報と翻訳（既存行の更新）が両方入る
DO $$
DECLARE r public.packages; t public.package_translations;
BEGIN
  ASSERT public.save_creator_package(
    '00000000-0000-0000-0000-0000000022d1', '00000000-0000-0000-0000-00000022aaa2', 2500, NULL, '', 90,
    'pl_s', '浅草駅', 35.711, 139.796, NULL, NULL, NULL, NULL,
    '新タイトル', '短い説明', '長い説明') IS TRUE, 'owner save should return true';
  SELECT * INTO r FROM public.packages WHERE id = '00000000-0000-0000-0000-0000000022d1';
  ASSERT r.area_id = '00000000-0000-0000-0000-00000022aaa2' AND r.price = 2500 AND r.duration_minutes = 90, 'package columns';
  ASSERT r.image_url IS NULL, 'empty image_url -> NULL';
  ASSERT r.start_place_name = '浅草駅' AND r.end_place_id IS NULL, 'places';
  SELECT * INTO t FROM public.package_translations WHERE package_id = r.id AND language = 'ja';
  ASSERT t.title = '新タイトル' AND t.short_description = '短い説明' AND t.description = '長い説明', 'translation updated';
  RAISE NOTICE 'PASS 1: パッケージを本人が保存できる（翻訳は更新）';
END $$;

-- 2. パッケージ: 翻訳が無い場合は INSERT される
DO $$
BEGIN
  ASSERT public.save_creator_package(
    '00000000-0000-0000-0000-0000000022d2', '00000000-0000-0000-0000-00000022aaa1', 0, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '初めての翻訳', NULL, NULL) IS TRUE, 'save should return true';
  ASSERT (SELECT title FROM public.package_translations WHERE package_id = '00000000-0000-0000-0000-0000000022d2') = '初めての翻訳', 'translation inserted';
  RAISE NOTICE 'PASS 2: 翻訳が無いパッケージは INSERT される';
END $$;

-- 3. パッケージ: 他人のもの・存在しないものは false で、何も変わらない
DO $$
BEGIN
  ASSERT public.save_creator_package(
    '00000000-0000-0000-0000-0000000022d9', '00000000-0000-0000-0000-00000022aaa2', 1, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '乗っ取り', NULL, NULL) IS FALSE, 'other package should be false';
  ASSERT public.save_creator_package(
    gen_random_uuid(), '00000000-0000-0000-0000-00000022aaa2', 1, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'x', NULL, NULL) IS FALSE, 'missing package should be false';
END $$;
RESET ROLE;
DO $$
BEGIN
  ASSERT (SELECT price FROM public.packages WHERE id = '00000000-0000-0000-0000-0000000022d9') = 9000, 'other price unchanged';
  ASSERT (SELECT title FROM public.package_translations WHERE package_id = '00000000-0000-0000-0000-0000000022d9') = '他人のパッケージ', 'other title unchanged';
  RAISE NOTICE 'PASS 3: 他人・存在しないパッケージは false で変更なし';
END $$;
SET LOCAL ROLE authenticated;

-- 4. パッケージ: 翻訳の書き込みで落ちたら、先に書いた packages も戻る（#22 の本題）
DO $$
BEGIN
  BEGIN
    PERFORM public.save_creator_package(
      '00000000-0000-0000-0000-0000000022d1', '00000000-0000-0000-0000-00000022aaa1', 7777, NULL, NULL, NULL,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'BOOM', NULL, NULL);
    ASSERT false, 'should have raised';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
  ASSERT (SELECT price FROM public.packages WHERE id = '00000000-0000-0000-0000-0000000022d1') = 2500, 'price must be rolled back';
  ASSERT (SELECT title FROM public.package_translations WHERE package_id = '00000000-0000-0000-0000-0000000022d1') = '新タイトル', 'title unchanged';
  RAISE NOTICE 'PASS 4: 翻訳で落ちると packages の更新も残らない';
END $$;

-- 5. パッケージ: 空のタイトル・不完全な地点（CHECK 違反）は例外で、何も変わらない
DO $$
BEGIN
  BEGIN
    PERFORM public.save_creator_package(
      '00000000-0000-0000-0000-0000000022d1', '00000000-0000-0000-0000-00000022aaa1', 1, NULL, NULL, NULL,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '   ', NULL, NULL);
    ASSERT false, 'blank title should raise';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.save_creator_package(
      '00000000-0000-0000-0000-0000000022d1', '00000000-0000-0000-0000-00000022aaa1', 1, NULL, NULL, NULL,
      'pl_only_id', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ok', NULL, NULL);
    ASSERT false, 'incomplete place should raise';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  ASSERT (SELECT price FROM public.packages WHERE id = '00000000-0000-0000-0000-0000000022d1') = 2500, 'unchanged';
  RAISE NOTICE 'PASS 5: 入力不正は例外で、変更なし';
END $$;

-- 6. スポット: 本人は保存でき、空のヒント・空白だけのフレーズは除かれ、order は配列内の位置
DO $$
DECLARE s public.spots; st public.spot_translations; n int;
BEGIN
  ASSERT public.save_creator_spot(
    '00000000-0000-0000-0000-0000000022e1', '00000000-0000-0000-0000-0000000022d1',
    'https://img.example/1.jpg', '', 0, '', 'https://shop.example',
    '新スポット', '説明', ARRAY['朝が空いている', '', NULL], ARRAY[]::text[],
    '[{"japanese":"すみません","reading":"sumimasen","meaning":"Excuse me"},
      {"japanese":"  ","reading":"","meaning":"skip"},
      {"japanese":"ありがとう","reading":"arigatou"}]'::jsonb) IS TRUE, 'owner spot save';
  SELECT * INTO s FROM public.spots WHERE id = '00000000-0000-0000-0000-0000000022e1';
  ASSERT s.image_url = 'https://img.example/1.jpg' AND s.video_url IS NULL AND s.map_url IS NULL, 'spot urls';
  ASSERT s.duration_minutes IS NULL, '0 minutes -> NULL';
  ASSERT s.shop_url = 'https://shop.example', 'shop_url';
  SELECT * INTO st FROM public.spot_translations WHERE spot_id = s.id AND language = 'ja';
  ASSERT st.name = '新スポット' AND st.local_tips = ARRAY['朝が空いている'] AND st.etiquette_tips = '{}', 'translation + tips filtered';
  SELECT count(*) INTO n FROM public.japanese_phrases WHERE spot_id = s.id;
  ASSERT n = 2, format('2 phrases expected, got %s', n);
  ASSERT NOT EXISTS (SELECT 1 FROM public.japanese_phrases WHERE id = '00000000-0000-0000-0000-0000000022f1'), 'old phrase replaced';
  ASSERT (SELECT "order" FROM public.japanese_phrases WHERE spot_id = s.id AND japanese = 'すみません') = 1, 'order 1';
  ASSERT (SELECT "order" FROM public.japanese_phrases WHERE spot_id = s.id AND japanese = 'ありがとう') = 3, 'order 3 (position in array)';
  ASSERT (SELECT pt.meaning FROM public.japanese_phrase_translations pt JOIN public.japanese_phrases p ON p.id = pt.phrase_id
          WHERE p.spot_id = s.id AND p.japanese = 'ありがとう') = '', 'missing meaning -> empty string';
  RAISE NOTICE 'PASS 6: スポットを本人が保存できる（空要素の除去と order）';
END $$;

-- 7. スポット: 再保存でフレーズが重複しない／空配列で全部消える
DO $$
DECLARE n int;
BEGIN
  PERFORM public.save_creator_spot(
    '00000000-0000-0000-0000-0000000022e1', '00000000-0000-0000-0000-0000000022d1',
    NULL, NULL, 30, NULL, NULL, '新スポット', NULL, NULL, NULL,
    '[{"japanese":"こんにちは","reading":"konnichiwa","meaning":"Hello"}]'::jsonb);
  SELECT count(*) INTO n FROM public.japanese_phrases WHERE spot_id = '00000000-0000-0000-0000-0000000022e1';
  ASSERT n = 1, format('1 phrase after re-save, got %s', n);
  ASSERT (SELECT local_tips FROM public.spot_translations WHERE spot_id = '00000000-0000-0000-0000-0000000022e1') = '{}', 'NULL tips -> empty';
  PERFORM public.save_creator_spot(
    '00000000-0000-0000-0000-0000000022e1', '00000000-0000-0000-0000-0000000022d1',
    NULL, NULL, 30, NULL, NULL, '新スポット', NULL, NULL, NULL, '[]'::jsonb);
  SELECT count(*) INTO n FROM public.japanese_phrases WHERE spot_id = '00000000-0000-0000-0000-0000000022e1';
  ASSERT n = 0, 'empty array removes all phrases';
  RAISE NOTICE 'PASS 7: 再保存で重複しない・空配列で全削除';
END $$;

-- 8. スポット: フレーズ翻訳の途中で落ちたら、フレーズ・翻訳・spots の変更がすべて戻る（#22 の本題）
DO $$
BEGIN
  PERFORM public.save_creator_spot(
    '00000000-0000-0000-0000-0000000022e1', '00000000-0000-0000-0000-0000000022d1',
    NULL, NULL, 30, NULL, NULL, '保存前', NULL, NULL, NULL,
    '[{"japanese":"残るはず","reading":"","meaning":"keep"}]'::jsonb);
  BEGIN
    PERFORM public.save_creator_spot(
      '00000000-0000-0000-0000-0000000022e1', '00000000-0000-0000-0000-0000000022d1',
      NULL, NULL, 45, NULL, NULL, '保存後', NULL, NULL, NULL,
      '[{"japanese":"一つ目","reading":"","meaning":"ok"},{"japanese":"二つ目","reading":"","meaning":"BOOM"}]'::jsonb);
    ASSERT false, 'should have raised';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
  ASSERT (SELECT array_agg(japanese) FROM public.japanese_phrases WHERE spot_id = '00000000-0000-0000-0000-0000000022e1') = ARRAY['残るはず'], 'phrases must not be lost';
  ASSERT (SELECT name FROM public.spot_translations WHERE spot_id = '00000000-0000-0000-0000-0000000022e1') = '保存前', 'name rolled back';
  ASSERT (SELECT duration_minutes FROM public.spots WHERE id = '00000000-0000-0000-0000-0000000022e1') = 30, 'spot rolled back';
  RAISE NOTICE 'PASS 8: 途中で落ちるとフレーズは消えず、spots も戻る';
END $$;

-- 9. スポット: 他人のスポット・別パッケージ指定・存在しないIDは false で変更なし
DO $$
BEGIN
  ASSERT public.save_creator_spot(
    '00000000-0000-0000-0000-0000000022e9', '00000000-0000-0000-0000-0000000022d9',
    NULL, NULL, NULL, NULL, NULL, '乗っ取り', NULL, NULL, NULL, '[]'::jsonb) IS FALSE, 'other spot should be false';
  ASSERT public.save_creator_spot(
    '00000000-0000-0000-0000-0000000022e1', '00000000-0000-0000-0000-0000000022d2',
    NULL, NULL, NULL, NULL, NULL, '別パッケージ', NULL, NULL, NULL, '[]'::jsonb) IS FALSE, 'wrong package should be false';
  ASSERT public.save_creator_spot(
    gen_random_uuid(), '00000000-0000-0000-0000-0000000022d1',
    NULL, NULL, NULL, NULL, NULL, 'x', NULL, NULL, NULL, '[]'::jsonb) IS FALSE, 'missing spot should be false';
  ASSERT (SELECT name FROM public.spot_translations WHERE spot_id = '00000000-0000-0000-0000-0000000022e1') = '保存前', 'own spot unchanged by wrong-package call';
END $$;
RESET ROLE;
DO $$
BEGIN
  ASSERT (SELECT name FROM public.spot_translations WHERE spot_id = '00000000-0000-0000-0000-0000000022e9') = '他人のスポット', 'other name unchanged';
  ASSERT EXISTS (SELECT 1 FROM public.japanese_phrases WHERE id = '00000000-0000-0000-0000-0000000022f9'), 'other phrase not deleted';
  ASSERT (SELECT map_url FROM public.spots WHERE id = '00000000-0000-0000-0000-0000000022e9') = 'https://other.example/map', 'other spot unchanged';
  RAISE NOTICE 'PASS 9: 他人・別パッケージ・存在しないスポットは false で変更なし';
END $$;
SET LOCAL ROLE authenticated;

-- 10. スポット: 入力不正（空の名前・配列でないフレーズ・オブジェクトでない要素）は例外で変更なし
DO $$
BEGIN
  BEGIN
    PERFORM public.save_creator_spot('00000000-0000-0000-0000-0000000022e1', '00000000-0000-0000-0000-0000000022d1',
      NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL, '[]'::jsonb);
    ASSERT false, 'blank name should raise';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.save_creator_spot('00000000-0000-0000-0000-0000000022e1', '00000000-0000-0000-0000-0000000022d1',
      NULL, NULL, NULL, NULL, NULL, 'ok', NULL, NULL, NULL, '{"japanese":"x"}'::jsonb);
    ASSERT false, 'object phrases should raise';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.save_creator_spot('00000000-0000-0000-0000-0000000022e1', '00000000-0000-0000-0000-0000000022d1',
      NULL, NULL, NULL, NULL, NULL, 'ok', NULL, NULL, NULL, NULL);
    ASSERT false, 'NULL phrases should raise';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.save_creator_spot('00000000-0000-0000-0000-0000000022e1', '00000000-0000-0000-0000-0000000022d1',
      NULL, NULL, NULL, NULL, NULL, 'ok', NULL, NULL, NULL, '["just a string"]'::jsonb);
    ASSERT false, 'non-object element should raise';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  ASSERT (SELECT array_agg(japanese) FROM public.japanese_phrases WHERE spot_id = '00000000-0000-0000-0000-0000000022e1') = ARRAY['残るはず'], 'phrases intact';
  RAISE NOTICE 'PASS 10: 入力不正は例外で、変更なし';
END $$;

-- 11. 未ログイン（anon）は関数を実行できない
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.save_creator_spot('00000000-0000-0000-0000-0000000022e1', '00000000-0000-0000-0000-0000000022d1',
      NULL, NULL, NULL, NULL, NULL, 'anon', NULL, NULL, NULL, '[]'::jsonb);
    ASSERT false, 'anon should not execute save_creator_spot';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.save_creator_package('00000000-0000-0000-0000-0000000022d1', '00000000-0000-0000-0000-00000022aaa1', 1, NULL, NULL, NULL,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'anon', NULL, NULL);
    ASSERT false, 'anon should not execute save_creator_package';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS 11: anon は実行できない';
END $$;
RESET ROLE;

-- 12. 関数は SECURITY INVOKER のまま（DEFINER にすると RLS が効かなくなる）
DO $$
BEGIN
  ASSERT NOT (SELECT prosecdef FROM pg_proc WHERE proname = 'save_creator_spot' AND pronamespace = 'public'::regnamespace), 'spot must be INVOKER';
  ASSERT NOT (SELECT prosecdef FROM pg_proc WHERE proname = 'save_creator_package' AND pronamespace = 'public'::regnamespace), 'package must be INVOKER';
  RAISE NOTICE 'PASS 12: SECURITY INVOKER';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL PASS'; END $$;
ROLLBACK;
