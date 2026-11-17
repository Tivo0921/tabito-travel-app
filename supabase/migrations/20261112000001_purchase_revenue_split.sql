-- 収益分配 段階1: 購入時点の分配を purchases に確定保存する。#19（親: #15）
--
-- これまで purchases は amount しか持たず、手数料率も受取人も保存していなかった。
-- 率を後で変えると過去の購入まで新しい率で計算し直すことになり、
-- 「誰にいくら払う義務があるか」が確定しない。
--
-- 分配の計算は DB のトリガーで行う（アプリからは渡さない）:
--   - 書き込み経路（Webhook / checkout verify）の両方で同じ計算になる
--   - このマイグレーションを先に適用し、コードのデプロイが後になっても、
--     旧コードの INSERT のまま分配が入る（適用とデプロイの間に購入が失敗しない）
--   - アプリが誤った値を渡しても上書きされる
--
-- 計算:
--   platform_fee = round(amount * platform_fee_rate)   … 四捨五入（0.5 は切り上げ）
--   creator_net  = amount - platform_fee
--   creator_user_id = 購入時点の packages.guide_id → guides.user_id
-- 通貨は JPY だけを前提にする（packages.currency は現状すべて JPY。amount は円）。
-- 集計関数も JPY の行だけを数える。他の通貨を売るときは単位と集計を見直すこと
-- 一度記録した分配の列は UPDATE で変えられない（返金などは status で表す）。
--
-- 【未解決・オーナー判断待ち（#19 にコメント済み）】
-- purchases.user_id は ON DELETE CASCADE のため、購入者がアカウントを削除すると
-- 購入行ごと分配の記録も消え、クリエイターの集計から外れる。
-- アカウント削除画面で「購入履歴を含むすべてのデータを削除する」と約束しているため、
-- このマイグレーションでは変えていない。振込（#15 段階2）をこの集計に基づいて
-- 行う前に、匿名化して残すか・別の台帳テーブルに分けるかを決めること。

-- ────────────────────────────────────────────────
-- 1. 列
-- ────────────────────────────────────────────────
ALTER TABLE public.purchases
  -- 売れた時点の受取人。後でパッケージの所有者が変わっても過去の支払先は動かない。
  -- クリエイターがアカウントを削除したときは guides.user_id と同じく NULL になる
  ADD COLUMN creator_user_id uuid REFERENCES public.profiles ON DELETE SET NULL,
  ADD COLUMN platform_fee_rate numeric(5,4) NOT NULL DEFAULT 0.1000
    CONSTRAINT purchases_platform_fee_rate_range CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 1),
  -- 円。currency が JPY 以外になったら単位の扱いを見直すこと
  ADD COLUMN platform_fee integer NOT NULL DEFAULT 0
    CONSTRAINT purchases_platform_fee_nonneg CHECK (platform_fee >= 0),
  ADD COLUMN creator_net integer NOT NULL DEFAULT 0
    CONSTRAINT purchases_creator_net_nonneg CHECK (creator_net >= 0);

COMMENT ON COLUMN public.purchases.creator_user_id IS '購入時点の受取人（packages → guides.user_id を焼き付け）';
COMMENT ON COLUMN public.purchases.platform_fee_rate IS '購入時点のプラットフォーム手数料率（0.1000 = 10%）';
COMMENT ON COLUMN public.purchases.platform_fee IS 'プラットフォームの取り分。round(amount * platform_fee_rate)';
COMMENT ON COLUMN public.purchases.creator_net IS 'クリエイターの取り分。amount - platform_fee';

-- ────────────────────────────────────────────────
-- 2. 既存行の埋め戻し（現状はテスト決済のみ。率は既定の 10%）
--    トリガーを作る前に行う（UPDATE 禁止のトリガーに掛からないように）
-- ────────────────────────────────────────────────
UPDATE public.purchases p
SET platform_fee = round(p.amount * p.platform_fee_rate)::integer,
    creator_net  = p.amount - round(p.amount * p.platform_fee_rate)::integer,
    creator_user_id = (
      SELECT g.user_id
      FROM public.packages pk
      JOIN public.guides g ON g.id = pk.guide_id
      WHERE pk.id = p.package_id
    );

ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_revenue_split_sum CHECK (platform_fee + creator_net = amount);

-- ────────────────────────────────────────────────
-- 3. INSERT 時に分配を確定する
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchases_set_revenue_split()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.amount IS NULL OR NEW.amount < 0 THEN
    RAISE EXCEPTION 'purchases.amount must be >= 0' USING ERRCODE = '23514';
  END IF;

  -- 率は呼び出し側からは受け取らず、ここで決める（現在は 10%）。
  -- 率を変えるときは、この値と列の既定値（platform_fee_rate の DEFAULT）を両方変える
  NEW.platform_fee_rate := 0.1000;
  NEW.platform_fee := round(NEW.amount * NEW.platform_fee_rate)::integer;
  NEW.creator_net := NEW.amount - NEW.platform_fee;

  -- 受取人も呼び出し側の値は使わず、購入時点の所有者を引く
  SELECT g.user_id INTO NEW.creator_user_id
  FROM public.packages pk
  JOIN public.guides g ON g.id = pk.guide_id
  WHERE pk.id = NEW.package_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER purchases_set_revenue_split
  BEFORE INSERT ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.purchases_set_revenue_split();

-- ────────────────────────────────────────────────
-- 4. 確定した分配は変えさせない
--    creator_user_id は ON DELETE SET NULL による NULL 化だけ許す
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchases_lock_revenue_split()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- 金額・通貨・パッケージ・購入者が変わると、確定した分配と食い違う
  IF NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.package_id IS DISTINCT FROM OLD.package_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.platform_fee_rate IS DISTINCT FROM OLD.platform_fee_rate
     OR NEW.platform_fee IS DISTINCT FROM OLD.platform_fee
     OR NEW.creator_net IS DISTINCT FROM OLD.creator_net
     OR (NEW.creator_user_id IS DISTINCT FROM OLD.creator_user_id AND NEW.creator_user_id IS NOT NULL)
  THEN
    RAISE EXCEPTION 'purchases revenue split is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER purchases_lock_revenue_split
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.purchases_lock_revenue_split();

-- トリガー関数は直接呼ばれるものではないので、利用者からの EXECUTE を外す
REVOKE ALL ON FUNCTION public.purchases_set_revenue_split() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purchases_lock_revenue_split() FROM PUBLIC, anon, authenticated;

-- 部分インデックスにしない。受取人のアカウント削除（ON DELETE SET NULL）は
-- status を問わず creator_user_id で探すので、部分インデックスだと全件走査になる
CREATE INDEX purchases_creator_user_id_idx
  ON public.purchases (creator_user_id) INCLUDE (status);

-- ────────────────────────────────────────────────
-- 5. クリエイター本人の売上集計
--
-- purchases の RLS は購入者本人しか読めない。クリエイターに行そのものを
-- 読ませると購入者の user_id が見えるので、集計値だけを返す関数にする。
-- 振込の記録はまだ無いので、unpaid_net は「確定した取り分の合計」と同じ。
-- 振込記録（段階2以降）を入れたら、ここから振込済みを差し引く。
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_creator_earnings()
RETURNS TABLE (
  sales_count integer,
  gross_amount bigint,
  platform_fee bigint,
  creator_net bigint,
  unpaid_net bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    count(*)::integer,
    coalesce(sum(p.amount), 0)::bigint,
    coalesce(sum(p.platform_fee), 0)::bigint,
    coalesce(sum(p.creator_net), 0)::bigint,
    coalesce(sum(p.creator_net), 0)::bigint
  FROM public.purchases p
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND p.creator_user_id = (SELECT auth.uid())
    AND p.status = 'completed'
    AND p.currency = 'JPY';
$$;

REVOKE ALL ON FUNCTION public.get_my_creator_earnings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_creator_earnings() TO authenticated;
