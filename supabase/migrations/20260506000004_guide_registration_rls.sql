-- ガイド自己登録を可能にするRLSポリシー
-- 元の設計では SERVICE ROLE のみだったが、ユーザーが自分でガイド登録できるよう変更

CREATE POLICY "guides_insert_self"
  ON guides FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "guides_update_self"
  ON guides FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "guide_translations_insert_own"
  ON guide_translations FOR INSERT
  TO authenticated
  WITH CHECK (
    guide_id IN (SELECT id FROM guides WHERE user_id = auth.uid())
  );

CREATE POLICY "guide_translations_update_own"
  ON guide_translations FOR UPDATE
  TO authenticated
  USING (
    guide_id IN (SELECT id FROM guides WHERE user_id = auth.uid())
  )
  WITH CHECK (
    guide_id IN (SELECT id FROM guides WHERE user_id = auth.uid())
  );

CREATE POLICY "guide_translations_delete_own"
  ON guide_translations FOR DELETE
  TO authenticated
  USING (
    guide_id IN (SELECT id FROM guides WHERE user_id = auth.uid())
  );
