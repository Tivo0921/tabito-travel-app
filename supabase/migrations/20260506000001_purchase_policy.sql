-- PoC用: 認証済みユーザーが自分の購入を直接作成できるようにする
-- 本番では Edge Function 経由の SERVICE_ROLE に変更する
CREATE POLICY "purchases_insert_own"
  ON purchases FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
