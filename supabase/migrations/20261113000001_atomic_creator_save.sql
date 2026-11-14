-- ════════════════════════════════════════════════════════════════
-- クリエイターのスポット保存・パッケージ保存を1トランザクションにする (#22)
--
-- これまでは PostgREST 経由で書き込みを複数回に分けていたため、
-- 途中で失敗すると「保存できませんでした」と表示しながら一部だけ
-- コミット済みの状態が残った（フレーズの DELETE だけ通って INSERT が
-- 落ちると、フレーズが消える）。
--
-- 関数の中で失敗すれば全体がロールバックされる。
--
-- SECURITY INVOKER（既定）で作る。呼び出したユーザーの権限で実行するので、
-- packages / spots / *_translations / japanese_phrases の RLS がそのまま効く。
-- SECURITY DEFINER にすると所有権チェックが無効になるので変えないこと。
--
-- 戻り値:
--   true  … 保存した
--   false … 対象が自分のものではない、または存在しない
--           （RLS に弾かれた UPDATE は 0件になるだけでエラーにならない）
--   例外  … 入力不正・通信以外の DB エラー。何も保存されない
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.save_creator_package(
  p_package_id uuid,
  p_area_id uuid,
  p_price int,
  p_category_id uuid,
  p_image_url text,
  p_duration_minutes int,
  p_start_place_id text,
  p_start_place_name text,
  p_start_latitude numeric,
  p_start_longitude numeric,
  p_end_place_id text,
  p_end_place_name text,
  p_end_latitude numeric,
  p_end_longitude numeric,
  p_title text,
  p_short_description text,
  p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'title is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.packages
     SET area_id          = p_area_id,
         price            = p_price,
         category_id      = p_category_id,
         image_url        = NULLIF(p_image_url, ''),
         duration_minutes = p_duration_minutes,
         start_place_id   = p_start_place_id,
         start_place_name = p_start_place_name,
         start_latitude   = p_start_latitude,
         start_longitude  = p_start_longitude,
         end_place_id     = p_end_place_id,
         end_place_name   = p_end_place_name,
         end_latitude     = p_end_latitude,
         end_longitude    = p_end_longitude
   WHERE id = p_package_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.package_translations (package_id, language, title, short_description, description)
  VALUES (p_package_id, 'ja', p_title, p_short_description, p_description)
  ON CONFLICT (package_id, language) DO UPDATE
     SET title             = EXCLUDED.title,
         short_description = EXCLUDED.short_description,
         description       = EXCLUDED.description;

  RETURN true;
END $$;

COMMENT ON FUNCTION public.save_creator_package(
  uuid, uuid, int, uuid, text, int, text, text, numeric, numeric, text, text, numeric, numeric, text, text, text
) IS 'クリエイターのパッケージ基本情報と日本語の翻訳を1トランザクションで保存する。SECURITY INVOKER（RLS が効く）。#22';

-- p_phrases は [{ "japanese": "...", "reading": "...", "meaning": "..." }, ...] の配列。
-- japanese が空白だけの要素は飛ばす。order は配列内の位置（1始まり）。
CREATE OR REPLACE FUNCTION public.save_creator_spot(
  p_spot_id uuid,
  p_package_id uuid,
  p_image_url text,
  p_video_url text,
  p_duration_minutes int,
  p_map_url text,
  p_shop_url text,
  p_name text,
  p_description text,
  p_local_tips text[],
  p_etiquette_tips text[],
  p_phrases jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  v_phrase_id uuid;
  r record;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'name is required' USING ERRCODE = '22023';
  END IF;
  IF p_phrases IS NULL OR jsonb_typeof(p_phrases) <> 'array' THEN
    RAISE EXCEPTION 'phrases must be a JSON array' USING ERRCODE = '22023';
  END IF;

  UPDATE public.spots
     SET image_url        = NULLIF(p_image_url, ''),
         video_url        = NULLIF(p_video_url, ''),
         -- 旧実装（`|| null`）と同じく 0 は未設定として扱う
         duration_minutes = NULLIF(p_duration_minutes, 0),
         map_url          = NULLIF(p_map_url, ''),
         shop_url         = NULLIF(p_shop_url, '')
   WHERE id = p_spot_id
     AND package_id = p_package_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.spot_translations (spot_id, language, name, description, local_tips, etiquette_tips)
  VALUES (
    p_spot_id, 'ja', p_name, p_description,
    ARRAY(SELECT t FROM unnest(COALESCE(p_local_tips, '{}'::text[])) AS t WHERE t IS NOT NULL AND t <> ''),
    ARRAY(SELECT t FROM unnest(COALESCE(p_etiquette_tips, '{}'::text[])) AS t WHERE t IS NOT NULL AND t <> '')
  )
  ON CONFLICT (spot_id, language) DO UPDATE
     SET name           = EXCLUDED.name,
         description    = EXCLUDED.description,
         local_tips     = EXCLUDED.local_tips,
         etiquette_tips = EXCLUDED.etiquette_tips;

  -- フレーズは削除してから入れ直す。途中で失敗しても関数全体が
  -- ロールバックされるので、フレーズが消えたまま残ることはない。
  DELETE FROM public.japanese_phrases WHERE spot_id = p_spot_id;

  FOR r IN
    SELECT e, ord
      FROM jsonb_array_elements(p_phrases) WITH ORDINALITY AS x(e, ord)
  LOOP
    IF jsonb_typeof(r.e) <> 'object' THEN
      RAISE EXCEPTION 'each phrase must be a JSON object' USING ERRCODE = '22023';
    END IF;
    CONTINUE WHEN COALESCE(r.e->>'japanese', '') ~ '^\s*$';

    INSERT INTO public.japanese_phrases (spot_id, japanese, reading, "order")
    VALUES (p_spot_id, r.e->>'japanese', r.e->>'reading', r.ord::int)
    RETURNING id INTO v_phrase_id;

    INSERT INTO public.japanese_phrase_translations (phrase_id, language, meaning, context)
    VALUES (v_phrase_id, 'ja', COALESCE(r.e->>'meaning', ''), NULL);
  END LOOP;

  RETURN true;
END $$;

COMMENT ON FUNCTION public.save_creator_spot(
  uuid, uuid, text, text, int, text, text, text, text, text[], text[], jsonb
) IS 'クリエイターのスポット・日本語の翻訳・フレーズを1トランザクションで保存する。SECURITY INVOKER（RLS が効く）。#22';

-- 未ログインでは RLS で必ず false になるが、呼べる必要も無い
REVOKE EXECUTE ON FUNCTION public.save_creator_package(
  uuid, uuid, int, uuid, text, int, text, text, numeric, numeric, text, text, numeric, numeric, text, text, text
) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_creator_spot(
  uuid, uuid, text, text, int, text, text, text, text, text[], text[], jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_creator_package(
  uuid, uuid, int, uuid, text, int, text, text, numeric, numeric, text, text, numeric, numeric, text, text, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_creator_spot(
  uuid, uuid, text, text, int, text, text, text, text, text[], text[], jsonb
) TO authenticated;
