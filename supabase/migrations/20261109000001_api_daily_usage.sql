-- 従量課金 API（OpenAI・Google Places）の1日あたりの利用回数を DB に保存する。#65 #66
--
-- これまでの上限はサーバーのメモリ（Map）で数えていたため、Vercel の
-- インスタンスが複数あれば台数分だけ通り、再起動で消えていた。
-- 回数を DB に置き、確認と加算を1つの関数で原子的に行う。
--
-- 「1日」は日本時間 0:00 で切り替わる。
-- 書き込みは service role（API ルート）からの関数呼び出しだけ。
-- 利用者は自分の行を読めるだけで、書けない。

-- ────────────────────────────────────────────────
-- 1. テーブル
-- ────────────────────────────────────────────────
CREATE TABLE public.api_usage (
  kind text NOT NULL CHECK (kind IN ('plan_advise', 'places_search')),
  -- NULL はサービス全体の合計（PLACES_GLOBAL_DAILY_LIMIT 用）
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  -- 日本時間の日付
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_id が NULL の行（全体合計）も1日1行にするため NULLS NOT DISTINCT にする。
-- 通常の UNIQUE だと NULL 同士は別物扱いになり、全体の行が増え続ける
ALTER TABLE public.api_usage
  ADD CONSTRAINT api_usage_kind_user_day_key UNIQUE NULLS NOT DISTINCT (kind, user_id, day);

COMMENT ON TABLE public.api_usage IS
  '従量課金APIの1日の利用回数。user_id が NULL の行はサービス全体の合計。day は日本時間';

-- ────────────────────────────────────────────────
-- 2. RLS: 本人の行の SELECT のみ。書き込みは関数（service role）経由だけ
-- ────────────────────────────────────────────────
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_usage_select_own" ON public.api_usage
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- RLS にポリシーが無ければ書けないが、既定の GRANT も外しておく
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.api_usage FROM anon, authenticated;
REVOKE ALL ON public.api_usage FROM anon;

-- ────────────────────────────────────────────────
-- 3. 回数の確認と加算
--
-- 上限未満なら +1 して、数えた日（日本時間）を返す。上限に達していれば NULL。
-- INSERT ... ON CONFLICT DO UPDATE ... WHERE は対象行をロックしてから
-- 最新の count で WHERE を評価するので、同時に来た2件が両方とも
-- 上限を越えて通ることはない。
--
-- p_global_limit を渡すと、サービス全体の合計（user_id NULL の行）にも
-- 同じ判定をする。全体で弾かれたときは、同じトランザクション内で
-- 本人の加算を取り消してから NULL を返す。
-- ロックは常に「本人 → 全体」の順で取るので、互いに待ち合って止まることはない。
--
-- p_now はテストで日付の切り替わりを再現するためのもの。
-- service role しか呼べないので、利用者が日付を偽ることはできない。
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consume_api_usage(
  p_kind text,
  p_user_id uuid,
  p_user_limit integer,
  p_global_limit integer DEFAULT NULL,
  p_now timestamptz DEFAULT now()
)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_day date := (p_now AT TIME ZONE 'Asia/Tokyo')::date;
  v_count integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  -- 上限 0 以下は「使わせない」。INSERT の初回は WHERE を通らないので先に弾く
  IF p_user_limit IS NULL OR p_user_limit < 1
     OR (p_global_limit IS NOT NULL AND p_global_limit < 1) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.api_usage AS u (kind, user_id, day, count)
  VALUES (p_kind, p_user_id, v_day, 1)
  ON CONFLICT ON CONSTRAINT api_usage_kind_user_day_key
  DO UPDATE SET count = u.count + 1, updated_at = now()
  WHERE u.count < p_user_limit
  RETURNING u.count INTO v_count;

  IF v_count IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_global_limit IS NOT NULL THEN
    v_count := NULL;

    INSERT INTO public.api_usage AS u (kind, user_id, day, count)
    VALUES (p_kind, NULL, v_day, 1)
    ON CONFLICT ON CONSTRAINT api_usage_kind_user_day_key
    DO UPDATE SET count = u.count + 1, updated_at = now()
    WHERE u.count < p_global_limit
    RETURNING u.count INTO v_count;

    IF v_count IS NULL THEN
      -- 全体で弾かれた分は本人の回数として数えない
      UPDATE public.api_usage
      SET count = count - 1, updated_at = now()
      WHERE kind = p_kind AND user_id = p_user_id AND day = v_day AND count > 0;
      RETURN NULL;
    END IF;
  END IF;

  RETURN v_day;
END;
$$;

-- ────────────────────────────────────────────────
-- 4. 回数を戻す
--
-- 上流（OpenAI 等）の失敗など、利用者の責任でない失敗で回数を消費させないため。
-- consume_api_usage が返した日付を渡す。日付をまたいで戻しても、
-- 数えた日の行から引く。0 未満にはしない。
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.release_api_usage(
  p_kind text,
  p_user_id uuid,
  p_day date,
  p_include_global boolean DEFAULT false
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.api_usage
  SET count = count - 1, updated_at = now()
  WHERE kind = p_kind
    AND day = p_day
    AND count > 0
    AND (user_id = p_user_id OR (p_include_global AND user_id IS NULL));
$$;

-- 関数は既定で PUBLIC に EXECUTE が付き、Supabase では anon / authenticated にも
-- 既定権限で付く。利用者が直接呼べると、全体の回数を空打ちで埋めて
-- 他の利用者を止められるので、service role だけに絞る
REVOKE ALL ON FUNCTION public.consume_api_usage(text, uuid, integer, integer, timestamptz)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_api_usage(text, uuid, date, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_usage(text, uuid, integer, integer, timestamptz)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.release_api_usage(text, uuid, date, boolean)
  TO service_role;
