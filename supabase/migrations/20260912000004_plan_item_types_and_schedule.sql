-- ────────────────────────────────────────────────
-- 1. 予定の種類を増やす
--
--    宿泊・買い物・体験・その他が無く、泊まる場所を行程に置けなかった。
--    CHECK の名前は 20260909000001 が付けた決め打ちだが、それ以前の
--    自動命名が残っている環境もありうるので、名前ではなく
--    item_type に掛かっている CHECK を引いて消す。
-- ────────────────────────────────────────────────
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT c.conname INTO con_name
  FROM pg_constraint c
  JOIN pg_attribute a
    ON a.attrelid = c.conrelid
   AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'plan_items'::regclass
    AND c.contype = 'c'
    AND a.attname = 'item_type'
  LIMIT 1;

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE plan_items DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE plan_items
  ADD CONSTRAINT plan_items_item_type_check
  CHECK (item_type IN (
    'spot', 'meal', 'transport', 'manner', 'package',
    'lodging', 'shopping', 'activity', 'other'
  ));

-- ────────────────────────────────────────────────
-- 2. 並び順と時刻をまとめて反映する
--
--    AIの提案は「順番」と「時刻」を同時に変える。行ごとに UPDATE を
--    流すと途中で失敗した時に順番と時刻が食い違うので、1文にまとめる。
--    SECURITY INVOKER なので RLS はそのまま効く。
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_plan_schedule(item_ids uuid[], times text[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF array_length(item_ids, 1) IS DISTINCT FROM array_length(times, 1) THEN
    RAISE EXCEPTION 'item_ids と times の要素数が一致しません';
  END IF;

  -- "order" には (plan_id, day, order) の一意制約が掛かりうるので、
  -- 一度退避してから詰め直す
  UPDATE plan_items SET "order" = "order" + 100000 WHERE id = ANY(item_ids);

  UPDATE plan_items p
     SET "order" = t.pos,
         scheduled_time = CASE
           WHEN t.time IS NULL OR t.time = '' THEN NULL
           ELSE t.time::time
         END
    FROM unnest(item_ids, times) WITH ORDINALITY AS t(id, time, pos)
   WHERE p.id = t.id;
END $$;

COMMENT ON FUNCTION apply_plan_schedule(uuid[], text[])
  IS 'AIの提案を反映する。並び順と開始時刻を1トランザクションで更新する';
