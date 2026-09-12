-- ════════════════════════════════════════════════════════════════
-- 購入したパッケージを行程に展開できるようにする #16 段階1
--
-- 「買ったコースが自動で行程表になる」ところまで。AI は使わない。
-- spots を順番どおり plan_items に並べ、滞在時間から時刻を積むだけの
-- 決定的な処理にする（安いし壊れない）。
--
-- #24 で package_id を入れたとき、パッケージは「1個のブロック」として
-- 置く前提だったので、以下2つの制約を張った。展開するにはどちらも
-- 邪魔になるので緩める。
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────
-- 1. package_id を「由来」として全種別で持てるようにする
--
--    元の CHECK は item_type='package' の行にしか package_id を許さず、
--    展開したスポット行が「どのパッケージ由来か」を持てなかった。
--
--    ブロックとして描くか個別の予定として描くかは item_type が決めるので、
--    package_id を種別で縛る必要はない。むしろ由来が辿れるほうが、
--    「このスポットは渋谷ツアーのもの」と表示でき、まとめて消すこともできる。
-- ────────────────────────────────────────────────
ALTER TABLE plan_items
  DROP CONSTRAINT IF EXISTS plan_items_package_id_only_for_package;

COMMENT ON COLUMN plan_items.package_id IS
  '由来のパッケージ。item_type=''package'' ならブロック本体、それ以外なら展開元';

-- ────────────────────────────────────────────────
-- 2. 「1計画に同じパッケージは1つ」はブロックだけの制約にする
--
--    元のユニークインデックスは package_id だけを見ていたため、
--    同じパッケージから複数のスポット行を作れなかった。
--    二重追加を防ぎたいのはブロックの話なので、そこに限定する。
-- ────────────────────────────────────────────────
DROP INDEX IF EXISTS plan_items_unique_package_per_plan;

CREATE UNIQUE INDEX plan_items_unique_package_block_per_plan
  ON plan_items (plan_id, package_id)
  WHERE package_id IS NOT NULL AND item_type = 'package';

-- ────────────────────────────────────────────────
-- 3. その行が何に由来するかを記録する
--
--    手で足したのか、パッケージから展開したのかで、
--    まとめて消せるか・AIが動かしてよいかの判断が変わる。
--    'ai' は #16 段階3 で使う。今は入らない。
-- ────────────────────────────────────────────────
ALTER TABLE plan_items
  ADD COLUMN source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'package', 'ai'));

COMMENT ON COLUMN plan_items.source IS
  'manual=手入力 / package=パッケージから展開 / ai=AIが生成（#16 段階3）';

-- 既存のパッケージブロックは展開ではないので manual のままでよいが、
-- 由来が明確なので package にしておく
UPDATE plan_items SET source = 'package' WHERE item_type = 'package';

-- ────────────────────────────────────────────────
-- 4. アイテムにメモを持たせる
--
--    移動・食事・マナーメモは title しか無く、「何を食べるのか」
--    「どの電車に乗るのか」「何に気をつけるのか」を書く場所が無かった。
--
--    表示するだけの自由記述なので i18n の対象外。書いた言語のまま出す
--    （ガイド・記事などDB由来のコンテンツと同じ扱い）。
-- ────────────────────────────────────────────────
ALTER TABLE plan_items
  ADD COLUMN note text;

COMMENT ON COLUMN plan_items.note IS
  'ユーザーの自由記述。翻訳しない。#16 段階3 では AI の補足にも使う';

-- ────────────────────────────────────────────────
-- 5. 並べ替えを1往復・原子的にする
--
--    アプリ側で1件ずつ UPDATE していたため、
--      (a) 途中で失敗すると同じ日の中で並びが壊れる
--          （前半は新しい order、後半は古いまま）
--      (b) 10件の並べ替えで10往復する
--    という問題があった。挿入・展開も内部でこれを呼ぶので、
--    1操作で N+1 リクエストになっていた。
--
--    SECURITY INVOKER にする。呼び出したユーザーの権限で動くので、
--    plan_items の RLS（自分の plan のみ）がそのまま効く。
--    DEFINER にすると他人の計画も並べ替えられてしまう。
--
--    関数内は1トランザクションなので、途中で失敗すれば全部戻る。
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reorder_plan_items(item_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- 一度退避してから振り直す。(plan_id, day, order) に一意制約は無いが、
  -- 直接書き換えると途中経過で同じ order が並び、順序が不定な瞬間ができる
  UPDATE plan_items
  SET "order" = "order" + 100000
  WHERE id = ANY(item_ids);

  UPDATE plan_items p
  SET "order" = t.pos
  FROM (SELECT id, ordinality AS pos FROM unnest(item_ids) WITH ORDINALITY AS u(id, ordinality)) AS t
  WHERE p.id = t.id;
END $$;

COMMENT ON FUNCTION reorder_plan_items(uuid[]) IS
  '渡された順に plan_items.order を 1..N へ振り直す。SECURITY INVOKER なので RLS がそのまま効く';
