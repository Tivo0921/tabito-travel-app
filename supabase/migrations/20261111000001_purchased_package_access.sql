-- ════════════════════════════════════════════════════════════════
-- 購入者は、購入したパッケージを非公開後も読める #25
--
-- これまでの SELECT ポリシーは「published」か「自分のガイドのもの」だけで、
-- クリエイターが購入済みパッケージを下書き（draft）や archived に戻すと、
-- 代金を払った購入者からも見えなくなっていた。
--
-- 方針: 支払いが完了している（purchases.status = 'completed'）購入者には、
-- パッケージの status に関係なく、本体と中身（翻訳・スポット・フレーズ）を
-- 読ませる。返金済み（refunded）・未完了（pending）は対象外。
--
-- 既存のポリシーは変えず、許可を足すだけ（PERMISSIVE は OR で効く）。
-- purchases の SELECT ポリシーは user_id = auth.uid() だけで packages を
-- 参照しないため、ここから purchases を引いても再帰しない。
-- 書き込み権限は一切増やさない（すべて FOR SELECT）。
-- auth.uid() は (SELECT ...) で包み、行ごとではなく文ごとに1回だけ評価させる
-- （20260807000001_chat_phase1.sql などと同じ書き方）。
-- ════════════════════════════════════════════════════════════════

CREATE POLICY "packages_select_purchased"
  ON packages FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT package_id FROM purchases
      WHERE user_id = (SELECT auth.uid())
        AND status = 'completed'
    )
  );

CREATE POLICY "package_translations_select_purchased"
  ON package_translations FOR SELECT
  TO authenticated
  USING (
    package_id IN (
      SELECT package_id FROM purchases
      WHERE user_id = (SELECT auth.uid())
        AND status = 'completed'
    )
  );

CREATE POLICY "spots_select_purchased"
  ON spots FOR SELECT
  TO authenticated
  USING (
    package_id IN (
      SELECT package_id FROM purchases
      WHERE user_id = (SELECT auth.uid())
        AND status = 'completed'
    )
  );

CREATE POLICY "spot_translations_select_purchased"
  ON spot_translations FOR SELECT
  TO authenticated
  USING (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN purchases pu ON pu.package_id = s.package_id
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.status = 'completed'
    )
  );

CREATE POLICY "japanese_phrases_select_purchased"
  ON japanese_phrases FOR SELECT
  TO authenticated
  USING (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN purchases pu ON pu.package_id = s.package_id
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.status = 'completed'
    )
  );

CREATE POLICY "japanese_phrase_translations_select_purchased"
  ON japanese_phrase_translations FOR SELECT
  TO authenticated
  USING (
    phrase_id IN (
      SELECT jp.id FROM japanese_phrases jp
      JOIN spots s ON s.id = jp.spot_id
      JOIN purchases pu ON pu.package_id = s.package_id
      WHERE pu.user_id = (SELECT auth.uid())
        AND pu.status = 'completed'
    )
  );

-- 購入者の判定は (user_id, status) で引く。idx_purchases_user_id で足りるが、
-- 上のポリシーは行ごとに評価されるので複合にしておく
CREATE INDEX IF NOT EXISTS idx_purchases_user_status_package
  ON purchases (user_id, status, package_id);
