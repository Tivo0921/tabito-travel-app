-- ════════════════════════════════════════════════════════════════
-- 旅行計画にパッケージをブロックとして置けるようにする #16
--
-- 計画は「購入したパッケージを日程の上に並べたもの」であり、
-- 各パッケージの中に現地での詳細な体験（spots）が入っている、という入れ子。
-- 計画側はメタな並べ替えだけを扱い、詳細はパッケージ側に委ねる。
--
-- plan_items には spot_id はあったが package_id が無く、
-- パッケージ単位で置くことができなかった。UI も自由入力の
-- タイトルしか追加できず、購入したものと計画が繋がっていなかった。
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────
-- 1. どのパッケージのブロックかを持たせる
--    ON DELETE SET NULL: パッケージが消えても行程からその行を
--    黙って消さない。タイトルは行に焼き付けてあるので、
--    「もう無いパッケージ」として残り、ユーザーが自分で消せる。
-- ────────────────────────────────────────────────
ALTER TABLE plan_items
  ADD COLUMN package_id uuid REFERENCES packages ON DELETE SET NULL;

COMMENT ON COLUMN plan_items.package_id IS
  '計画に置いたパッケージ。item_type = ''package'' の行だけが持つ';

-- ────────────────────────────────────────────────
-- 2. item_type に 'package' を足す
--    CHECK 制約は置き換えるしかないので drop してから作り直す。
--    ただし元の制約はカラム定義にインラインで書かれており、名前は
--    Postgres が自動で付けている。環境によって差が出うるので
--    名前を決め打ちせず、item_type に掛かっている CHECK を引いて消す。
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

  IF con_name IS NULL THEN
    RAISE EXCEPTION 'plan_items.item_type の CHECK 制約が見つかりません';
  END IF;

  EXECUTE format('ALTER TABLE plan_items DROP CONSTRAINT %I', con_name);
END $$;

ALTER TABLE plan_items
  ADD CONSTRAINT plan_items_item_type_check
  CHECK (item_type IN ('spot', 'meal', 'transport', 'manner', 'package'));

-- ────────────────────────────────────────────────
-- 3. package_id を持てるのは 'package' の行だけ
--    他の種別に紛れ込むと、表示側がブロックとして描くか
--    ただの予定として描くかを判断できなくなる。
--
--    ここで 'package' の行に package_id IS NOT NULL を要求してはいけない。
--    上の ON DELETE SET NULL と両立せず、パッケージを削除したときに
--    SET NULL の UPDATE がこの CHECK に弾かれて削除ごと失敗する。
--    （その場合 deleteCreatorPackage が false を返し、UI には
--      「自分が作成したコンテンツか確認してください」という
--      原因と無関係な文言が出る）
--
--    パッケージが消えた後は item_type='package' / package_id=NULL /
--    タイトルだけ残る、という行になる。表示側はこれを
--    「もう無いパッケージ」として描く。
-- ────────────────────────────────────────────────
ALTER TABLE plan_items
  ADD CONSTRAINT plan_items_package_id_only_for_package CHECK (
    item_type = 'package' OR package_id IS NULL
  );

-- ────────────────────────────────────────────────
-- 4. 同じ計画に同じパッケージを二重に置けないようにする
--    日をまたいで置きたくなる場面が無いとは言えないが、
--    誤操作で増える方が実害が大きい。必要になったら外す。
-- ────────────────────────────────────────────────
CREATE UNIQUE INDEX plan_items_unique_package_per_plan
  ON plan_items (plan_id, package_id)
  WHERE package_id IS NOT NULL;
