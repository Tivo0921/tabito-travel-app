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
  name: string;
  bio: string;
  avatar_url: string;
  location: string;
  languages: string[];
  rating: number;
  review_count: number;
}

export interface Package {
  id: string;
  title: string;
  description: string;
  short_description: string;
  image_url: string;
  guide_id: string;
  guide?: Guide;
  area: string;
  duration: string;
  price: number;
  currency: string;
  rating: number;
  review_count: number;
  spot_count: number;
  category: string;
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
  korean: string;
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
  location: string;
  start_date: string;
  end_date: string;
  items: PlanItem[];
  created_at: string;
}

export interface PlanItem {
  id: string;
  plan_id: string;
  day: number;
  order: number;
  type: 'spot' | 'activity' | 'meal' | 'transport';
  title: string;
  time?: string;
  duration_minutes?: number;
  manner_tip_id?: string;
  manner_tip?: MannerTip;
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
