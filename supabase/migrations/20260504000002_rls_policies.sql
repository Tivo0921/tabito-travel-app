-- TABITO RLS Policies & updated_at Triggers
-- Migration: 20260504000002_rls_policies
--
-- 設計方針:
--   1. 公開コンテンツ   → 未認証ユーザーを含む全員が SELECT 可
--   2. 認証ユーザー     → 自分のデータのみ CRUDs
--   3. ガイドのみ       → 自分が所有するパッケージに紐づくデータを書き込み可
--   4. SERVICE ROLE のみ → purchases の INSERT/UPDATE（Edge Functions 経由）

-- ════════════════════════════════════════════════════════════════
-- 1. updated_at 自動更新トリガー関数
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- updated_at カラムを持つテーブルにトリガーを設定
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_guides_updated_at
  BEFORE UPDATE ON guides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_spots_updated_at
  BEFORE UPDATE ON spots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- 2. 全テーブルで RLS を有効化
-- ════════════════════════════════════════════════════════════════

ALTER TABLE profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_translations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_translations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE spots                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_translations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE japanese_phrases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE japanese_phrase_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE manner_categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE manner_category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE manner_tips                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE manner_tip_translations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_items                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE magazine_articles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE magazine_article_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_routes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_route_translations ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════
-- 3. profiles
--    - 読み取り: 本人のみ
--    - 書き込み: 本人のみ（INSERT は auth.users トリガーで自動作成を想定）
-- ════════════════════════════════════════════════════════════════

-- 自分のプロフィールのみ取得可
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 自分のプロフィールのみ更新可
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- auth.users 作成時に対応するプロフィールを INSERT できる（本人のみ）
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ════════════════════════════════════════════════════════════════
-- 4. guides / guide_translations
--    - 読み取り: 全員（未認証を含む）
--    - 書き込み: SERVICE ROLE のみ（管理画面から登録）
-- ════════════════════════════════════════════════════════════════

-- ガイド一覧は公開
CREATE POLICY "guides_select_public"
  ON guides FOR SELECT
  USING (true);

-- ガイド翻訳も公開
CREATE POLICY "guide_translations_select_public"
  ON guide_translations FOR SELECT
  USING (true);

-- ════════════════════════════════════════════════════════════════
-- 5. packages / package_translations
--    - SELECT: 公開済み(status='published')は全員、ガイドは自分のを全件
--    - INSERT/UPDATE/DELETE: 対応ガイド（user_id が一致）のみ
-- ════════════════════════════════════════════════════════════════

-- published パッケージは全員が閲覧可
CREATE POLICY "packages_select_published"
  ON packages FOR SELECT
  USING (status = 'published');

-- ガイドは自分が所有する全パッケージを閲覧可（draft / archived 含む）
CREATE POLICY "packages_select_own_guide"
  ON packages FOR SELECT
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides WHERE user_id = auth.uid()
    )
  );

-- ガイドは自分のパッケージを作成可
CREATE POLICY "packages_insert_own_guide"
  ON packages FOR INSERT
  TO authenticated
  WITH CHECK (
    guide_id IN (
      SELECT id FROM guides WHERE user_id = auth.uid()
    )
  );

-- ガイドは自分のパッケージを更新可
CREATE POLICY "packages_update_own_guide"
  ON packages FOR UPDATE
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    guide_id IN (
      SELECT id FROM guides WHERE user_id = auth.uid()
    )
  );

-- ガイドは自分のパッケージを削除可
CREATE POLICY "packages_delete_own_guide"
  ON packages FOR DELETE
  TO authenticated
  USING (
    guide_id IN (
      SELECT id FROM guides WHERE user_id = auth.uid()
    )
  );

-- published パッケージの翻訳は全員が閲覧可
CREATE POLICY "package_translations_select_published"
  ON package_translations FOR SELECT
  USING (
    package_id IN (
      SELECT id FROM packages WHERE status = 'published'
    )
  );

-- ガイドは自分のパッケージの翻訳を閲覧可（draft / archived 含む）
CREATE POLICY "package_translations_select_own_guide"
  ON package_translations FOR SELECT
  TO authenticated
  USING (
    package_id IN (
      SELECT p.id FROM packages p
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドは自分のパッケージの翻訳を作成可
CREATE POLICY "package_translations_insert_own_guide"
  ON package_translations FOR INSERT
  TO authenticated
  WITH CHECK (
    package_id IN (
      SELECT p.id FROM packages p
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドは自分のパッケージの翻訳を更新可
CREATE POLICY "package_translations_update_own_guide"
  ON package_translations FOR UPDATE
  TO authenticated
  USING (
    package_id IN (
      SELECT p.id FROM packages p
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    package_id IN (
      SELECT p.id FROM packages p
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドは自分のパッケージの翻訳を削除可
CREATE POLICY "package_translations_delete_own_guide"
  ON package_translations FOR DELETE
  TO authenticated
  USING (
    package_id IN (
      SELECT p.id FROM packages p
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- 6. spots / spot_translations
--    - SELECT: published パッケージに紐づくものは全員閲覧可
--    - 書き込み: 対応パッケージのガイドのみ
-- ════════════════════════════════════════════════════════════════

-- published パッケージのスポットは全員が閲覧可
CREATE POLICY "spots_select_published"
  ON spots FOR SELECT
  USING (
    package_id IN (
      SELECT id FROM packages WHERE status = 'published'
    )
  );

-- ガイドは自分のパッケージのスポットを閲覧可（draft 含む）
CREATE POLICY "spots_select_own_guide"
  ON spots FOR SELECT
  TO authenticated
  USING (
    package_id IN (
      SELECT p.id FROM packages p
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドは自分のパッケージにスポットを作成可
CREATE POLICY "spots_insert_own_guide"
  ON spots FOR INSERT
  TO authenticated
  WITH CHECK (
    package_id IN (
      SELECT p.id FROM packages p
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドは自分のパッケージのスポットを更新可
CREATE POLICY "spots_update_own_guide"
  ON spots FOR UPDATE
  TO authenticated
  USING (
    package_id IN (
      SELECT p.id FROM packages p
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    package_id IN (
      SELECT p.id FROM packages p
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドは自分のパッケージのスポットを削除可
CREATE POLICY "spots_delete_own_guide"
  ON spots FOR DELETE
  TO authenticated
  USING (
    package_id IN (
      SELECT p.id FROM packages p
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- published パッケージのスポット翻訳は全員が閲覧可
CREATE POLICY "spot_translations_select_published"
  ON spot_translations FOR SELECT
  USING (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN packages p ON p.id = s.package_id
      WHERE p.status = 'published'
    )
  );

-- ガイドは自分のパッケージのスポット翻訳を閲覧可
CREATE POLICY "spot_translations_select_own_guide"
  ON spot_translations FOR SELECT
  TO authenticated
  USING (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドはスポット翻訳を作成可
CREATE POLICY "spot_translations_insert_own_guide"
  ON spot_translations FOR INSERT
  TO authenticated
  WITH CHECK (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドはスポット翻訳を更新可
CREATE POLICY "spot_translations_update_own_guide"
  ON spot_translations FOR UPDATE
  TO authenticated
  USING (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドはスポット翻訳を削除可
CREATE POLICY "spot_translations_delete_own_guide"
  ON spot_translations FOR DELETE
  TO authenticated
  USING (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- 7. japanese_phrases / japanese_phrase_translations
--    - SELECT: published パッケージに紐づくものは全員閲覧可
--    - 書き込み: 対応パッケージのガイドのみ
-- ════════════════════════════════════════════════════════════════

-- published パッケージのフレーズは全員が閲覧可
CREATE POLICY "japanese_phrases_select_published"
  ON japanese_phrases FOR SELECT
  USING (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN packages p ON p.id = s.package_id
      WHERE p.status = 'published'
    )
  );

-- ガイドは自分のパッケージのフレーズを閲覧可
CREATE POLICY "japanese_phrases_select_own_guide"
  ON japanese_phrases FOR SELECT
  TO authenticated
  USING (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドはフレーズを作成可
CREATE POLICY "japanese_phrases_insert_own_guide"
  ON japanese_phrases FOR INSERT
  TO authenticated
  WITH CHECK (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドはフレーズを更新可
CREATE POLICY "japanese_phrases_update_own_guide"
  ON japanese_phrases FOR UPDATE
  TO authenticated
  USING (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドはフレーズを削除可
CREATE POLICY "japanese_phrases_delete_own_guide"
  ON japanese_phrases FOR DELETE
  TO authenticated
  USING (
    spot_id IN (
      SELECT s.id FROM spots s
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- フレーズ翻訳: published パッケージ紐づきは全員閲覧可
CREATE POLICY "japanese_phrase_translations_select_published"
  ON japanese_phrase_translations FOR SELECT
  USING (
    phrase_id IN (
      SELECT jp.id FROM japanese_phrases jp
      JOIN spots s ON s.id = jp.spot_id
      JOIN packages p ON p.id = s.package_id
      WHERE p.status = 'published'
    )
  );

-- ガイドは自分のパッケージのフレーズ翻訳を閲覧可
CREATE POLICY "japanese_phrase_translations_select_own_guide"
  ON japanese_phrase_translations FOR SELECT
  TO authenticated
  USING (
    phrase_id IN (
      SELECT jp.id FROM japanese_phrases jp
      JOIN spots s ON s.id = jp.spot_id
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドはフレーズ翻訳を作成可
CREATE POLICY "japanese_phrase_translations_insert_own_guide"
  ON japanese_phrase_translations FOR INSERT
  TO authenticated
  WITH CHECK (
    phrase_id IN (
      SELECT jp.id FROM japanese_phrases jp
      JOIN spots s ON s.id = jp.spot_id
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドはフレーズ翻訳を更新可
CREATE POLICY "japanese_phrase_translations_update_own_guide"
  ON japanese_phrase_translations FOR UPDATE
  TO authenticated
  USING (
    phrase_id IN (
      SELECT jp.id FROM japanese_phrases jp
      JOIN spots s ON s.id = jp.spot_id
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    phrase_id IN (
      SELECT jp.id FROM japanese_phrases jp
      JOIN spots s ON s.id = jp.spot_id
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ガイドはフレーズ翻訳を削除可
CREATE POLICY "japanese_phrase_translations_delete_own_guide"
  ON japanese_phrase_translations FOR DELETE
  TO authenticated
  USING (
    phrase_id IN (
      SELECT jp.id FROM japanese_phrases jp
      JOIN spots s ON s.id = jp.spot_id
      JOIN packages p ON p.id = s.package_id
      JOIN guides g ON g.id = p.guide_id
      WHERE g.user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- 8. manner_categories / manner_category_translations
--    - 全員が閲覧可（公開マスターデータ）
--    - 書き込み: SERVICE ROLE のみ（管理画面から登録）
-- ════════════════════════════════════════════════════════════════

CREATE POLICY "manner_categories_select_public"
  ON manner_categories FOR SELECT
  USING (true);

CREATE POLICY "manner_category_translations_select_public"
  ON manner_category_translations FOR SELECT
  USING (true);

-- ════════════════════════════════════════════════════════════════
-- 9. manner_tips / manner_tip_translations
--    - 全員が閲覧可（公開マスターデータ）
--    - 書き込み: SERVICE ROLE のみ
-- ════════════════════════════════════════════════════════════════

CREATE POLICY "manner_tips_select_public"
  ON manner_tips FOR SELECT
  USING (true);

CREATE POLICY "manner_tip_translations_select_public"
  ON manner_tip_translations FOR SELECT
  USING (true);

-- ════════════════════════════════════════════════════════════════
-- 10. reviews
--     - SELECT: 全員（公開レビュー）
--     - INSERT: 認証ユーザーかつ対象パッケージを購入済みのみ
--     - UPDATE/DELETE: 投稿者本人のみ
-- ════════════════════════════════════════════════════════════════

-- レビューは全員が閲覧可
CREATE POLICY "reviews_select_public"
  ON reviews FOR SELECT
  USING (true);

-- 購入済みユーザーのみレビューを投稿可（user_id は本人のみ）
CREATE POLICY "reviews_insert_purchased"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND package_id IN (
      SELECT package_id FROM purchases
      WHERE user_id = auth.uid()
        AND status = 'completed'
    )
  );

-- 本人のみレビューを更新可
CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 本人のみレビューを削除可
CREATE POLICY "reviews_delete_own"
  ON reviews FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════
-- 11. purchases
--     - SELECT: 本人のみ自分の購入履歴を閲覧可
--     - INSERT/UPDATE: SERVICE ROLE のみ（Edge Functions 経由）
--       ※ anon / authenticated ロールには書き込み権限を付与しない
-- ════════════════════════════════════════════════════════════════

-- 本人のみ購入履歴を閲覧可
CREATE POLICY "purchases_select_own"
  ON purchases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT/UPDATE は明示的なポリシーなし（SERVICE ROLE はバイパス）
-- Edge Function は service_role キーを使用するため RLS の対象外

-- ════════════════════════════════════════════════════════════════
-- 12. saved_items
--     - 本人のみ CRUD
-- ════════════════════════════════════════════════════════════════

-- 自分のお気に入りのみ閲覧可
CREATE POLICY "saved_items_select_own"
  ON saved_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 自分のお気に入りのみ追加可
CREATE POLICY "saved_items_insert_own"
  ON saved_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- saved_items は更新なし（削除して再登録）
-- 削除は本人のみ
CREATE POLICY "saved_items_delete_own"
  ON saved_items FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════
-- 13. plans / plan_items
--     - 本人のみ CRUD
-- ════════════════════════════════════════════════════════════════

-- 自分のプランのみ閲覧可
CREATE POLICY "plans_select_own"
  ON plans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 自分のプランのみ作成可
CREATE POLICY "plans_insert_own"
  ON plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 自分のプランのみ更新可
CREATE POLICY "plans_update_own"
  ON plans FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 自分のプランのみ削除可
CREATE POLICY "plans_delete_own"
  ON plans FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- plan_items は plan の owner が本人かどうかで制御
CREATE POLICY "plan_items_select_own"
  ON plan_items FOR SELECT
  TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "plan_items_insert_own"
  ON plan_items FOR INSERT
  TO authenticated
  WITH CHECK (
    plan_id IN (
      SELECT id FROM plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "plan_items_update_own"
  ON plan_items FOR UPDATE
  TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM plans WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    plan_id IN (
      SELECT id FROM plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "plan_items_delete_own"
  ON plan_items FOR DELETE
  TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM plans WHERE user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- 14. magazine_articles / magazine_article_translations
--     - SELECT: published_at が設定済みの記事は全員閲覧可
--     - 書き込み: SERVICE ROLE のみ（CMS / 管理画面から登録）
-- ════════════════════════════════════════════════════════════════

-- published_at が過去または現在の記事は全員閲覧可
CREATE POLICY "magazine_articles_select_published"
  ON magazine_articles FOR SELECT
  USING (published_at IS NOT NULL AND published_at <= now());

-- 公開済み記事の翻訳も全員閲覧可
CREATE POLICY "magazine_article_translations_select_published"
  ON magazine_article_translations FOR SELECT
  USING (
    article_id IN (
      SELECT id FROM magazine_articles
      WHERE published_at IS NOT NULL AND published_at <= now()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- 15. community_routes / community_route_translations
--     - SELECT: 全員閲覧可（公開コンテンツ）
--     - INSERT: 認証ユーザーのみ（author_id は本人）
--     - UPDATE/DELETE: 投稿者本人のみ
-- ════════════════════════════════════════════════════════════════

-- コミュニティルートは全員閲覧可
CREATE POLICY "community_routes_select_public"
  ON community_routes FOR SELECT
  USING (true);

-- 認証ユーザーはルートを投稿可（author_id は本人のみ）
CREATE POLICY "community_routes_insert_own"
  ON community_routes FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- 投稿者本人のみ更新可
CREATE POLICY "community_routes_update_own"
  ON community_routes FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- 投稿者本人のみ削除可
CREATE POLICY "community_routes_delete_own"
  ON community_routes FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- コミュニティルート翻訳も全員閲覧可
CREATE POLICY "community_route_translations_select_public"
  ON community_route_translations FOR SELECT
  USING (true);

-- 翻訳の書き込みは対応ルートの投稿者のみ
CREATE POLICY "community_route_translations_insert_own"
  ON community_route_translations FOR INSERT
  TO authenticated
  WITH CHECK (
    route_id IN (
      SELECT id FROM community_routes WHERE author_id = auth.uid()
    )
  );

CREATE POLICY "community_route_translations_update_own"
  ON community_route_translations FOR UPDATE
  TO authenticated
  USING (
    route_id IN (
      SELECT id FROM community_routes WHERE author_id = auth.uid()
    )
  )
  WITH CHECK (
    route_id IN (
      SELECT id FROM community_routes WHERE author_id = auth.uid()
    )
  );

CREATE POLICY "community_route_translations_delete_own"
  ON community_route_translations FOR DELETE
  TO authenticated
  USING (
    route_id IN (
      SELECT id FROM community_routes WHERE author_id = auth.uid()
    )
  );
