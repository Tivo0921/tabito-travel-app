-- ════════════════════════════════════════════════════════════════
-- エリア / カテゴリのマスタ化（FK正規化）
--   これまで packages.area / packages.category は生テキストで、
--   UIの選択肢が explore・creator に別々に直書きされ食い違っていた。
--   単一のマスタ表を作り、packages を FK 参照に正規化する。
--   閲覧: 全員（公開マスターデータ）／ 書き込み: SERVICE ROLE のみ
-- ════════════════════════════════════════════════════════════════

-- ── マスタ表 ──────────────────────────────────────────────
CREATE TABLE areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE areas IS 'パッケージのエリア分類マスタ（公開）';

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE categories IS 'パッケージのカテゴリ分類マスタ（公開）';

-- ── シード（決定的UUID: 0012=areas, 0013=categories）─────────
INSERT INTO areas (id, name, sort_order) VALUES
  ('00000000-0000-0000-0012-000000000001', '東京',   1),
  ('00000000-0000-0000-0012-000000000002', '大阪',   2),
  ('00000000-0000-0000-0012-000000000003', '京都',   3),
  ('00000000-0000-0000-0012-000000000004', '横浜',   4),
  ('00000000-0000-0000-0012-000000000005', '名古屋', 5),
  ('00000000-0000-0000-0012-000000000006', '福岡',   6),
  ('00000000-0000-0000-0012-000000000007', '札幌',   7),
  ('00000000-0000-0000-0012-000000000008', 'その他', 99);

INSERT INTO categories (id, name, sort_order) VALUES
  ('00000000-0000-0000-0013-000000000001', '都市探検',     1),
  ('00000000-0000-0000-0013-000000000002', 'グルメ',       2),
  ('00000000-0000-0000-0013-000000000003', '文化・歴史',   3),
  ('00000000-0000-0000-0013-000000000004', 'ショッピング', 4),
  ('00000000-0000-0000-0013-000000000005', '自然',         5),
  ('00000000-0000-0000-0013-000000000006', 'エンタメ',     6);

-- ── packages に FK 列を追加 ───────────────────────────────
ALTER TABLE packages ADD COLUMN area_id uuid REFERENCES areas (id);
ALTER TABLE packages ADD COLUMN category_id uuid REFERENCES categories (id);

-- ── 既存テキスト値からバックフィル ───────────────────────────
UPDATE packages p SET area_id = a.id
  FROM areas a WHERE a.name = p.area;

-- 既存データの category は旧ラベル '文化' → 新ラベル '文化・歴史' へ寄せる
UPDATE packages p SET category_id = c.id
  FROM categories c
  WHERE c.name = p.category
     OR (p.category = '文化' AND c.name = '文化・歴史');

-- area は必須。バックフィル完了後に NOT NULL を付与
ALTER TABLE packages ALTER COLUMN area_id SET NOT NULL;

-- ── インデックス張り替え ─────────────────────────────────
DROP INDEX IF EXISTS idx_packages_area;
CREATE INDEX idx_packages_area_id ON packages (area_id);
CREATE INDEX idx_packages_category_id ON packages (category_id);

-- ── 旧テキスト列を削除（完全正規化）─────────────────────────
ALTER TABLE packages DROP COLUMN area;
ALTER TABLE packages DROP COLUMN category;

-- ── RLS: 公開読み取り ────────────────────────────────────
ALTER TABLE areas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "areas_select_public"
  ON areas FOR SELECT
  USING (true);

CREATE POLICY "categories_select_public"
  ON categories FOR SELECT
  USING (true);
