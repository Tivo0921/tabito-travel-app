-- TABITO Initial Schema
-- Migration: 20260504000001_initial_schema

-- ────────────────────────────────────────────────
-- Extensions
-- ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────
-- Profiles (Supabase Auth と連携)
-- ────────────────────────────────────────────────
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  native_language varchar(10) NOT NULL DEFAULT 'ko',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'アプリユーザーのプロフィール。auth.usersと1:1で対応';

-- ────────────────────────────────────────────────
-- Guides (コンテンツ作成者 = 日本在住の韓国人)
-- ────────────────────────────────────────────────
CREATE TABLE guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE SET NULL,
  location text NOT NULL,          -- '東京', '大阪', '京都'
  languages text[] NOT NULL DEFAULT '{}',
  rating numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count int NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE guides IS '日本在住の韓国人ガイド';

CREATE TABLE guide_translations (
  guide_id uuid NOT NULL REFERENCES guides ON DELETE CASCADE,
  language varchar(10) NOT NULL,   -- 'ko', 'en', 'zh-TW'
  name text NOT NULL,
  bio text,
  PRIMARY KEY (guide_id, language)
);

COMMENT ON TABLE guide_translations IS 'ガイドのプロフィール翻訳（多言語対応）';

-- ────────────────────────────────────────────────
-- Packages (ガイドコース)
-- ────────────────────────────────────────────────
CREATE TABLE packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES guides ON DELETE CASCADE,
  area text NOT NULL,              -- '東京', '大阪'
  duration_minutes int,
  price int NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'JPY',
  category text,                   -- '都市探検', 'グルメ', '文化', 'ショッピング'
  tags text[] NOT NULL DEFAULT '{}',
  features text[] NOT NULL DEFAULT '{}',
  image_url text,
  tutorial_video_url text,
  rating numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count int NOT NULL DEFAULT 0,
  spot_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE packages IS 'ガイドが作成した旅行コース';

CREATE TABLE package_translations (
  package_id uuid NOT NULL REFERENCES packages ON DELETE CASCADE,
  language varchar(10) NOT NULL,
  title text NOT NULL,
  description text,
  short_description text,
  PRIMARY KEY (package_id, language)
);

COMMENT ON TABLE package_translations IS 'パッケージの翻訳（多言語対応）';

-- ────────────────────────────────────────────────
-- Spots (スポット)
-- ────────────────────────────────────────────────
CREATE TABLE spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages ON DELETE CASCADE,
  "order" int NOT NULL,
  map_url text,
  shop_url text,
  duration_minutes int,
  video_url text,                  -- Cloudflare Stream URL
  thumbnail_url text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, "order")
);

COMMENT ON TABLE spots IS 'パッケージ内の各スポット';

CREATE TABLE spot_translations (
  spot_id uuid NOT NULL REFERENCES spots ON DELETE CASCADE,
  language varchar(10) NOT NULL,
  name text NOT NULL,
  description text,
  local_tips text[] NOT NULL DEFAULT '{}',
  etiquette_tips text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (spot_id, language)
);

COMMENT ON TABLE spot_translations IS 'スポットの翻訳（多言語対応）';

-- ────────────────────────────────────────────────
-- Japanese Phrases (韓国人向け日本語フレーズ)
-- ────────────────────────────────────────────────
CREATE TABLE japanese_phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES spots ON DELETE CASCADE,
  japanese text NOT NULL,          -- 日本語テキスト
  reading text,                    -- ひらがな読み
  "order" int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE japanese_phrases IS '各スポットで使える日本語フレーズ';

CREATE TABLE japanese_phrase_translations (
  phrase_id uuid NOT NULL REFERENCES japanese_phrases ON DELETE CASCADE,
  language varchar(10) NOT NULL,   -- 'ko', 'en'
  meaning text NOT NULL,           -- フレーズの意味
  context text,                    -- どんな場面で使うか
  PRIMARY KEY (phrase_id, language)
);

COMMENT ON TABLE japanese_phrase_translations IS 'フレーズの意味・コンテキスト翻訳';

-- ────────────────────────────────────────────────
-- Manner Categories & Tips (マナーガイド)
-- ────────────────────────────────────────────────
CREATE TABLE manner_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icon text,                       -- lucide-react アイコン名
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE manner_categories IS 'マナーカテゴリ（空港・飲食店・交通など）';

CREATE TABLE manner_category_translations (
  category_id uuid NOT NULL REFERENCES manner_categories ON DELETE CASCADE,
  language varchar(10) NOT NULL,
  name text NOT NULL,
  description text,
  PRIMARY KEY (category_id, language)
);

CREATE TABLE manner_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES manner_categories ON DELETE CASCADE,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE manner_tips IS 'マナーTip（Do/Dont形式）';

CREATE TABLE manner_tip_translations (
  tip_id uuid NOT NULL REFERENCES manner_tips ON DELETE CASCADE,
  language varchar(10) NOT NULL,
  title text NOT NULL,
  description text,
  do_tips text[] NOT NULL DEFAULT '{}',
  dont_tips text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (tip_id, language)
);

-- ────────────────────────────────────────────────
-- Reviews (レビュー)
-- ────────────────────────────────────────────────
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, user_id)     -- 1ユーザー1レビュー
);

COMMENT ON TABLE reviews IS 'パッケージへのレビュー';

-- ────────────────────────────────────────────────
-- Purchases (購入履歴)
-- ────────────────────────────────────────────────
CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES packages ON DELETE RESTRICT,
  amount int NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'JPY',
  stripe_payment_intent_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
  purchased_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE purchases IS '課金済みパッケージの購入履歴';

-- ────────────────────────────────────────────────
-- Saved Items (保存済みアイテム)
-- ────────────────────────────────────────────────
CREATE TABLE saved_items (
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('package', 'manner_tip', 'route')),
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_type, item_id)
);

COMMENT ON TABLE saved_items IS 'お気に入り保存';

-- ────────────────────────────────────────────────
-- Plans (旅行計画)
-- ────────────────────────────────────────────────
CREATE TABLE plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  title text NOT NULL,
  location text,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE plans IS 'ユーザーが作成した旅行計画';

CREATE TABLE plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans ON DELETE CASCADE,
  day int NOT NULL,
  "order" int NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('spot', 'meal', 'transport', 'manner')),
  title text NOT NULL,
  scheduled_time time,
  duration_minutes int,
  spot_id uuid REFERENCES spots ON DELETE SET NULL,
  manner_tip_id uuid REFERENCES manner_tips ON DELETE SET NULL
);

COMMENT ON TABLE plan_items IS '旅行計画内のスケジュールアイテム';

-- ────────────────────────────────────────────────
-- Magazine Articles (マガジン)
-- ────────────────────────────────────────────────
CREATE TABLE magazine_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES profiles ON DELETE SET NULL,
  image_url text,
  read_time_minutes int,
  category text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE magazine_articles IS '旅行インサイト記事';

CREATE TABLE magazine_article_translations (
  article_id uuid NOT NULL REFERENCES magazine_articles ON DELETE CASCADE,
  language varchar(10) NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text,
  PRIMARY KEY (article_id, language)
);

-- ────────────────────────────────────────────────
-- Community Routes (コミュニティルート)
-- ────────────────────────────────────────────────
CREATE TABLE community_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES profiles ON DELETE SET NULL,
  image_url text,
  likes_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE community_routes IS 'ユーザーが共有したコース';

CREATE TABLE community_route_translations (
  route_id uuid NOT NULL REFERENCES community_routes ON DELETE CASCADE,
  language varchar(10) NOT NULL,
  title text NOT NULL,
  description text,
  PRIMARY KEY (route_id, language)
);

-- ────────────────────────────────────────────────
-- Indexes (クエリ最適化)
-- ────────────────────────────────────────────────
CREATE INDEX idx_packages_guide_id ON packages (guide_id);
CREATE INDEX idx_packages_area ON packages (area);
CREATE INDEX idx_packages_status ON packages (status);
CREATE INDEX idx_spots_package_id ON spots (package_id);
CREATE INDEX idx_spots_order ON spots (package_id, "order");
CREATE INDEX idx_japanese_phrases_spot_id ON japanese_phrases (spot_id);
CREATE INDEX idx_manner_tips_category_id ON manner_tips (category_id);
CREATE INDEX idx_reviews_package_id ON reviews (package_id);
CREATE INDEX idx_reviews_user_id ON reviews (user_id);
CREATE INDEX idx_purchases_user_id ON purchases (user_id);
CREATE INDEX idx_purchases_package_id ON purchases (package_id);
CREATE INDEX idx_saved_items_user_id ON saved_items (user_id);
CREATE INDEX idx_plans_user_id ON plans (user_id);
CREATE INDEX idx_plan_items_plan_id ON plan_items (plan_id);
