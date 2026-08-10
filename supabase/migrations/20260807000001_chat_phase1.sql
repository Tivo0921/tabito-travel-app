-- ════════════════════════════════════════════════════════════════
-- パッケージ購入者 ↔ クリエイター チャット（段階1）
--   - スレッド / メッセージ / 既読
--   - 購入(status='completed')済みの本人とクリエイターのみアクセス可
--   - Realtime 配信を有効化
-- 要件: docs/chat-requirements.md
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────
-- 1. profiles にメールを追加
--    通知(段階3)の宛先。Google ログインで取得した値を保持する。
--    auth.users.email は authenticated から直接読めないため profiles 側に持つ。
-- ────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN profiles.email IS 'Googleアカウントのメール。新着メッセージ通知の宛先に使う';

-- 既存ユーザー分を auth.users から補完
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS DISTINCT FROM u.email;

-- ────────────────────────────────────────────────
-- 2. chat_threads
--    purchase_id を UNIQUE にして「1購入1スレッド」をDBで保証する
-- ────────────────────────────────────────────────
CREATE TABLE chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL UNIQUE REFERENCES purchases ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES packages ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  -- open: 送受信可 / read_only: 閲覧のみ / closed: 非表示
  -- 現時点では常に open。返金対応などのために枠だけ用意しておく
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'read_only', 'closed')),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_threads_participants_differ CHECK (buyer_id <> creator_id)
);

COMMENT ON TABLE chat_threads IS '購入単位のチャットスレッド。1購入につき1本';

-- FK 列と一覧の並び替えに使う列へインデックスを張る
CREATE INDEX idx_chat_threads_buyer ON chat_threads (buyer_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_chat_threads_creator ON chat_threads (creator_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_chat_threads_package_id ON chat_threads (package_id);

-- ────────────────────────────────────────────────
-- 3. chat_messages
-- ────────────────────────────────────────────────
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  -- 段階2で画像を足す際に image_path を追加し、この CHECK を緩める
  body text NOT NULL CHECK (length(btrim(body)) > 0 AND length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE chat_messages IS 'チャットの本文。DB由来コンテンツと同様、本文は翻訳しない';

-- スレッドを開いた時の「古い順に取得」がそのまま index scan になる並び
CREATE INDEX idx_chat_messages_thread ON chat_messages (thread_id, created_at);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages (sender_id);

-- ────────────────────────────────────────────────
-- 4. chat_reads（既読位置）
--    メッセージ側に既読フラグを持たせず、ユーザーごとの「どこまで読んだか」を1行で持つ。
--    行更新が発生しないので件数が増えても劣化しない。
-- ────────────────────────────────────────────────
CREATE TABLE chat_reads (
  thread_id uuid NOT NULL REFERENCES chat_threads ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

COMMENT ON TABLE chat_reads IS 'スレッドごとの既読位置。未読数はこれより新しいメッセージを数える';

CREATE INDEX idx_chat_reads_user_id ON chat_reads (user_id);

-- ────────────────────────────────────────────────
-- 5. updated_at トリガー
-- ────────────────────────────────────────────────
CREATE TRIGGER trg_chat_threads_updated_at
  BEFORE UPDATE ON chat_threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────
-- 6. 新着メッセージで last_message_at を更新
--    一覧の並び替えのために非正規化した列を同期する
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION bump_chat_thread_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.chat_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chat_messages_bump_thread
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION bump_chat_thread_last_message();

-- ────────────────────────────────────────────────
-- 7. スレッド参加判定のヘルパー
--    chat_messages のポリシーから chat_threads を引くと、
--    chat_threads 側のポリシーも都度評価されて重くなる。
--    SECURITY DEFINER で RLS を迂回しつつ、関数内で必ず呼び出し元本人を照合する。
-- ────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS private;

-- RLS ポリシーは「問い合わせている本人の権限」で評価される。
-- authenticated がこのスキーマと関数に到達できないとポリシー評価自体が失敗する。
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_chat_participant(target_thread_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id = target_thread_id
      -- 呼び出し元本人であることを関数の中で必ず確認する
      AND (SELECT auth.uid()) IN (t.buyer_id, t.creator_id)
  );
$$;

-- 未ログイン(anon)には触らせない。authenticated には必要（上記のとおりポリシー評価に要る）。
-- 直接呼ばれても「自分が参加者か」の真偽しか返さないため情報漏れにはならない。
REVOKE EXECUTE ON FUNCTION private.is_chat_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_chat_participant(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.can_post_to_chat(target_thread_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id = target_thread_id
      AND t.status = 'open'
      AND (SELECT auth.uid()) IN (t.buyer_id, t.creator_id)
  );
$$;

REVOKE EXECUTE ON FUNCTION private.can_post_to_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_post_to_chat(uuid) TO authenticated;

-- ────────────────────────────────────────────────
-- 8. RLS
--    auth.uid() は (SELECT auth.uid()) で包む（行ごとに再評価されるのを防ぐ）
-- ────────────────────────────────────────────────
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reads ENABLE ROW LEVEL SECURITY;

-- スレッド: 当事者だけが見える
CREATE POLICY "chat_threads_select_participant"
  ON chat_threads FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IN (buyer_id, creator_id));

-- スレッド作成: 購入者本人が、完了済みの自分の購入に対してのみ作れる
CREATE POLICY "chat_threads_insert_buyer"
  ON chat_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    buyer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.id = purchase_id
        AND p.user_id = (SELECT auth.uid())
        AND p.package_id = chat_threads.package_id
        AND p.status = 'completed'
    )
    -- creator_id が本当にそのパッケージのクリエイターかを検証する
    AND EXISTS (
      SELECT 1 FROM packages pk
      JOIN guides g ON g.id = pk.guide_id
      WHERE pk.id = chat_threads.package_id
        AND g.user_id = chat_threads.creator_id
    )
  );

-- メッセージ: 参加者のみ閲覧
CREATE POLICY "chat_messages_select_participant"
  ON chat_messages FOR SELECT
  TO authenticated
  USING ((SELECT private.is_chat_participant(thread_id)));

-- メッセージ送信: open のスレッドに、自分名義でのみ
CREATE POLICY "chat_messages_insert_participant"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND (SELECT private.can_post_to_chat(thread_id))
  );

-- 既読: 自分の分のみ読み書き
CREATE POLICY "chat_reads_select_own"
  ON chat_reads FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "chat_reads_insert_own"
  ON chat_reads FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (SELECT private.is_chat_participant(thread_id))
  );

CREATE POLICY "chat_reads_update_own"
  ON chat_reads FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 更新・削除は不可（メッセージの編集/削除は段階2以降で検討）

-- ────────────────────────────────────────────────
-- 8-b. チャット相手のプロフィールを読めるようにする
--   profiles_select_own が「自分の行のみ」なので、このままだと
--   相手の表示名・アバターが取れず一覧が空欄になる。
--   スレッドで繋がっている相手に限って読めるようにする（全体公開はしない）。
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.shares_chat_with(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE (SELECT auth.uid()) IN (t.buyer_id, t.creator_id)
      AND target_user_id IN (t.buyer_id, t.creator_id)
  );
$$;

REVOKE EXECUTE ON FUNCTION private.shares_chat_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.shares_chat_with(uuid) TO authenticated;

CREATE POLICY "profiles_select_chat_partner"
  ON profiles FOR SELECT
  TO authenticated
  USING ((SELECT private.shares_chat_with(id)));

-- ────────────────────────────────────────────────
-- 9. Realtime 配信を有効化
--    受信側は chat_messages の INSERT を購読する。
--    配信対象も RLS が適用されるため、参加者以外には届かない。
-- ────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
