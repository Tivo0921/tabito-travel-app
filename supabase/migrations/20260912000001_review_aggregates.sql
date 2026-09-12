-- ════════════════════════════════════════════════════════════════
-- レビューの集計を packages に反映する #33
--
-- reviews テーブルと RLS は既にあるのに投稿経路が無く、
-- packages.rating / review_count にはシード値だけが入っていた。
-- その結果「★4.9 (127)」と出るのにレビュータブは空、という
-- 同じ画面の中で数字が食い違う状態になっていた。
--
-- 表示側は packages.rating / review_count を読む前提で書かれているので、
-- その前提は保ったまま、値を実データから維持する。
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────
-- 1. 1パッケージぶんを実データから計算し直す
--
--    SECURITY DEFINER にする。トリガーは投稿者の権限で動くが、
--    packages に UPDATE 権限を与えると他人のパッケージも書けてしまう。
--    集計だけを行う関数に限定して権限を閉じる。
--    search_path を固定するのは、呼び出し元のスキーマ解決に
--    引きずられないため。
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recalc_package_rating(target_package_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE packages p
  SET rating = COALESCE(agg.avg_rating, 0),
      review_count = COALESCE(agg.cnt, 0)
  FROM (
    SELECT round(avg(rating)::numeric, 2) AS avg_rating, count(*) AS cnt
    FROM reviews
    WHERE package_id = target_package_id
  ) AS agg
  WHERE p.id = target_package_id;
$$;

COMMENT ON FUNCTION recalc_package_rating(uuid) IS
  'reviews から packages.rating / review_count を計算し直す。トリガーから呼ぶ';

-- ────────────────────────────────────────────────
-- 2. reviews の増減で呼ぶ
--
--    UPDATE で package_id が変わることは想定していないが、
--    変わっても両方を直せるよう OLD / NEW の双方を見る。
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reviews_sync_package_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM recalc_package_rating(OLD.package_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM recalc_package_rating(NEW.package_id);
  END IF;
  RETURN NULL;  -- AFTER トリガーなので戻り値は使われない
END $$;

DROP TRIGGER IF EXISTS reviews_sync_rating ON reviews;
CREATE TRIGGER reviews_sync_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION reviews_sync_package_rating();

-- ────────────────────────────────────────────────
-- 3. 既存の packages を実データに合わせる
--
--    ここでシードの嘘（rating=4.9 / review_count=127）が消え、
--    レビューが1件も無いパッケージは 0 / 0 になる。
--    表示側は 0 のときに評価を出さないようにする。
-- ────────────────────────────────────────────────
UPDATE packages p
SET rating = COALESCE(agg.avg_rating, 0),
    review_count = COALESCE(agg.cnt, 0)
FROM (
  SELECT pk.id,
         round(avg(r.rating)::numeric, 2) AS avg_rating,
         count(r.id) AS cnt
  FROM packages pk
  LEFT JOIN reviews r ON r.package_id = pk.id
  GROUP BY pk.id
) AS agg
WHERE p.id = agg.id;

-- ────────────────────────────────────────────────
-- 4. guides の評価も同じ問題を抱えている
--
--    guides.rating / review_count にもシード値（4.90 / 127）が入っており、
--    パッケージ詳細のガイド欄に出ていた。こちらは「そのガイドの全パッケージに
--    付いたレビュー」を集計する。
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recalc_guide_rating(target_guide_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE guides g
  SET rating = COALESCE(agg.avg_rating, 0),
      review_count = COALESCE(agg.cnt, 0)
  FROM (
    SELECT round(avg(r.rating)::numeric, 2) AS avg_rating, count(r.id) AS cnt
    FROM reviews r
    JOIN packages p ON p.id = r.package_id
    WHERE p.guide_id = target_guide_id
  ) AS agg
  WHERE g.id = target_guide_id;
$$;

-- reviews のトリガーから guides も更新する
CREATE OR REPLACE FUNCTION reviews_sync_package_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_guide uuid;
  new_guide uuid;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM recalc_package_rating(OLD.package_id);
    SELECT guide_id INTO old_guide FROM packages WHERE id = OLD.package_id;
    IF old_guide IS NOT NULL THEN PERFORM recalc_guide_rating(old_guide); END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM recalc_package_rating(NEW.package_id);
    SELECT guide_id INTO new_guide FROM packages WHERE id = NEW.package_id;
    IF new_guide IS NOT NULL THEN PERFORM recalc_guide_rating(new_guide); END IF;
  END IF;
  RETURN NULL;
END $$;

-- 既存の guides も実データに合わせる
UPDATE guides g
SET rating = COALESCE(agg.avg_rating, 0),
    review_count = COALESCE(agg.cnt, 0)
FROM (
  SELECT gg.id,
         round(avg(r.rating)::numeric, 2) AS avg_rating,
         count(r.id) AS cnt
  FROM guides gg
  LEFT JOIN packages p ON p.guide_id = gg.id
  LEFT JOIN reviews r ON r.package_id = p.id
  GROUP BY gg.id
) AS agg
WHERE g.id = agg.id;

-- ────────────────────────────────────────────────
-- 5. reviews の UPDATE が購入を再確認していなかった
--
--    reviews_update_own は WITH CHECK が user_id しか見ておらず、
--    package_id の変更を許していた。INSERT は購入者に限定されているのに、
--
--      1. 購入済みAにレビューを投稿する（正規の経路）
--      2. その行の package_id を未購入Bに書き換える
--
--    で、未購入パッケージの評価を操作できる。
--
--    これは以前からある穴だが、これまで packages.rating はシード値で
--    レビューと連動していなかったため実害が無かった。上のトリガーで
--    評価と直結した結果、初めて評価操作の経路として機能する。
--
--    ローカルで再現を確認済み:
--      未購入Bへの直接 INSERT → RLS で拒否
--      A→B への package_id 付け替え → 通り、Bが rating=1.00 / count=1 になる
--
--    INSERT と同じ条件を WITH CHECK に入れて塞ぐ。
-- ────────────────────────────────────────────────
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;

CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND package_id IN (
      SELECT package_id FROM purchases
      WHERE user_id = (SELECT auth.uid()) AND status = 'completed'
    )
  );

COMMENT ON POLICY "reviews_update_own" ON reviews IS
  '自分のレビューのみ更新可。package_id の付け替えを防ぐため INSERT と同じ購入条件を WITH CHECK に持つ';
