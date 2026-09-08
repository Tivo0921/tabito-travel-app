// TABITO Data Types
// These types are designed to map directly to Supabase tables later

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  language: 'ko' | 'ja' | 'en';
  created_at: string;
}

export interface Guide {
  id: string;
  user_id?: string;
  name: string;
  bio: string;
  avatar_url: string;
  location: string;
  languages: string[];
  rating: number;
  review_count: number;
}

export interface CreatorSpotInput {
  name: string;
  description: string;
  image_url: string;
  video_url: string;
  duration_minutes: number;
  map_url: string;
  shop_url: string;
  local_tips: string[];
  etiquette_tips: string[];
  phrases: { japanese: string; reading: string; meaning: string }[];
}

export interface Area {
  id: string;
  name: string;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface Package {
  id: string;
  title: string;
  description: string;
  short_description: string;
  image_url: string;
  guide_id: string;
  guide?: Guide;
  area: string;          // 表示用の名前（areas.name を JOIN で解決）
  area_id?: string;      // 編集フォーム用の FK
  /** 分。表示用の整形は lib/i18n/format.ts の formatDuration に集約する */
  duration_minutes: number | null;
  price: number;
  currency: string;
  rating: number;
  review_count: number;
  spot_count: number;
  category: string;      // 表示用の名前（categories.name を JOIN で解決）
  category_id?: string | null; // 編集フォーム用の FK
  tags: string[];
  features: string[];
  tutorial_video_url?: string;
  created_at: string;
}

export interface Spot {
  id: string;
  package_id: string;
  order: number;
  name: string;
  description: string;
  image_url: string;
  video_url?: string;
  local_tips: string[];
  japanese_phrases: JapanesePhrase[];
  etiquette_tips: string[];
  map_url: string;
  shop_url?: string;
  duration_minutes: number;
}

export interface JapanesePhrase {
  japanese: string;
  reading: string;
  meaning: string;
  context: string;
}

export interface Review {
  id: string;
  package_id: string;
  user_id: string;
  user?: User;
  rating: number;
  comment: string;
  created_at: string;
}

export interface SavedItem {
  id: string;
  user_id: string;
  item_type: 'package' | 'spot' | 'manner';
  item_id: string;
  created_at: string;
}

export interface MannerCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  image_url: string;
}

export interface MannerTip {
  id: string;
  category_id: string;
  title: string;
  description: string;
  image_url?: string;
  do_tips: string[];
  dont_tips: string[];
}

export interface Plan {
  id: string;
  user_id: string;
  title: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface PlanItem {
  id: string;
  plan_id: string;
  day: number;
  order: number;
  item_type: 'spot' | 'meal' | 'transport' | 'manner' | 'package';
  title: string;
  scheduled_time: string | null;
  duration_minutes: number | null;
  spot_id: string | null;
  manner_tip_id: string | null;
  /** item_type === 'package' の行だけが持つ（DB の CHECK で保証） */
  package_id: string | null;
  /** 表示用にJOINで解決したパッケージ情報。行そのものには無い */
  package?: PlanItemPackage;
}

/** 計画に置いたパッケージブロックの表示情報 */
export interface PlanItemPackage {
  id: string;
  title: string;
  image_url: string;
  area: string;
  spot_count: number;
  duration_minutes: number | null;
  guide_name: string;
}

export interface Purchase {
  id: string;
  package_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'refunded';
  purchased_at: string;
}

export interface MagazineArticle {
  id: string;
  title: string;
  excerpt: string;
  image_url: string;
  category: string;
  read_time: number;
  created_at: string;
}

export interface CommunityRoute {
  id: string;
  title: string;
  description: string;
  image_url: string;
  author: User;
  likes: number;
  created_at: string;
}

// ────────────────────────────────────────────────
// Chat (購入者 ↔ クリエイター)
// ────────────────────────────────────────────────

export interface ChatThread {
  id: string;
  purchase_id: string;
  package_id: string;
  buyer_id: string;
  creator_id: string;
  status: 'open' | 'read_only' | 'closed';
  last_message_at: string | null;
  created_at: string;
}

/** 一覧表示用。相手の名前とパッケージ名を添えたスレッド */
export interface ChatThreadSummary extends ChatThread {
  package_title: string;
  package_image_url: string | null;
  /** ログイン中のユーザーから見た相手 */
  partner_name: string;
  partner_avatar_url: string | null;
  last_message_body: string | null;
  unread_count: number;
}

/**
 * メッセージ一覧の1行。
 * 購入直後でまだ誰も発言していない場合はスレッドが無いので thread_id は null になる。
 * その行を開いた時点でスレッドを作る。
 */
export interface ChatListItem {
  thread_id: string | null;
  package_id: string;
  package_title: string;
  partner_name: string;
  partner_avatar_url: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}
