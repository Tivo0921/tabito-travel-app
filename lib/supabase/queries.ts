import { createClient } from './client';
import type {
  Guide,
  Package,
  PackagePlace,
  Spot,
  JapanesePhrase,
  Review,
  MannerCategory,
  MannerTip,
  MagazineArticle,
  CommunityRoute,
  Plan,
  PlanItem,
  PlanItemPackage,
  Purchase,
  CreatorSpotInput,
  Area,
  Category,
  ChatThread,
  ChatThreadSummary,
  ChatMessage,
  ChatListItem,
} from '@/lib/types';

const DEFAULT_LANG = 'ja';

// ────────────────────────────────────────────────
// Taxonomy (エリア / カテゴリ マスタ)
// ────────────────────────────────────────────────

export async function getAreas(): Promise<Area[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('areas')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true });

  if (error || !data) {
    console.error('getAreas error:', error);
    return [];
  }
  return data as Area[];
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true });

  if (error || !data) {
    console.error('getCategories error:', error);
    return [];
  }
  return data as Category[];
}

// packages 埋め込みリレーションから area/category の名前を取り出すヘルパー
function relName(rel: unknown): string {
  if (!rel) return '';
  const obj = Array.isArray(rel) ? rel[0] : rel;
  return (obj as { name?: string } | undefined)?.name ?? '';
}

// ────────────────────────────────────────────────
// Packages
// ────────────────────────────────────────────────

export async function getPackages(lang = DEFAULT_LANG): Promise<Package[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('packages')
    .select(`
      *,
      areas(name),
      categories(name),
      package_translations!inner(title, description, short_description),
      guides(
        id, location, languages, rating, review_count, avatar_url,
        guide_translations(name, bio)
      )
    `)
    .eq('status', 'published')
    .eq('package_translations.language', lang)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('getPackages error:', error);
    return [];
  }

  return data.map((row) => {
    const t = Array.isArray(row.package_translations)
      ? row.package_translations[0]
      : row.package_translations;
    const guide = Array.isArray(row.guides) ? row.guides[0] : row.guides;
    const gt = guide && Array.isArray(guide.guide_translations)
      ? guide.guide_translations[0]
      : guide?.guide_translations;

    return {
      id: row.id,
      title: t?.title ?? '',
      description: t?.description ?? '',
      short_description: t?.short_description ?? '',
      image_url: row.image_url ?? '',
      guide_id: row.guide_id,
      guide: guide ? {
        id: guide.id,
        name: gt?.name ?? '',
        bio: gt?.bio ?? '',
        avatar_url: guide.avatar_url ?? '',
        location: guide.location,
        languages: guide.languages,
        rating: Number(guide.rating),
        review_count: guide.review_count,
      } as Guide : undefined,
      area: relName(row.areas),
      area_id: row.area_id,
      duration_minutes: row.duration_minutes,
      price: row.price,
      currency: row.currency,
      rating: Number(row.rating),
      review_count: row.review_count,
      spot_count: row.spot_count,
      category: relName(row.categories),
      category_id: row.category_id,
      tags: row.tags,
      features: row.features,
      tutorial_video_url: row.tutorial_video_url ?? undefined,
      created_at: row.created_at,
      ...packagePlaces(row),
    } satisfies Package;
  });
}

export async function getPackageById(id: string, lang = DEFAULT_LANG): Promise<Package | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('packages')
    .select(`
      *,
      areas(name),
      categories(name),
      package_translations!inner(title, description, short_description),
      guides(
        id, location, languages, rating, review_count, avatar_url,
        guide_translations(name, bio)
      )
    `)
    .eq('id', id)
    .eq('package_translations.language', lang)
    .maybeSingle();

  if (error) {
    console.error('getPackageById error:', error.message, error);
    return null;
  }
  // 該当なしは正常系（呼び出し側が「見つかりません」を表示する）
  if (!data) return null;

  const t = Array.isArray(data.package_translations)
    ? data.package_translations[0]
    : data.package_translations;
  const guide = Array.isArray(data.guides) ? data.guides[0] : data.guides;
  const gt = guide && Array.isArray(guide.guide_translations)
    ? guide.guide_translations[0]
    : guide?.guide_translations;

  return {
    id: data.id,
    title: t?.title ?? '',
    description: t?.description ?? '',
    short_description: t?.short_description ?? '',
    image_url: data.image_url ?? '',
    guide_id: data.guide_id,
    guide: guide ? {
      id: guide.id,
      name: gt?.name ?? '',
      bio: gt?.bio ?? '',
      avatar_url: guide.avatar_url ?? '',
      location: guide.location,
      languages: guide.languages,
      rating: Number(guide.rating),
      review_count: guide.review_count,
    } as Guide : undefined,
    area: relName(data.areas),
    area_id: data.area_id,
    duration_minutes: data.duration_minutes,
    price: data.price,
    currency: data.currency,
    rating: Number(data.rating),
    review_count: data.review_count,
    spot_count: data.spot_count,
    category: relName(data.categories),
    category_id: data.category_id,
    tags: data.tags,
    features: data.features,
    tutorial_video_url: data.tutorial_video_url ?? undefined,
    created_at: data.created_at,
    ...packagePlaces(data),
  } satisfies Package;
}

// ────────────────────────────────────────────────
// Spots
// ────────────────────────────────────────────────

/**
 * numeric 列を number|null に寄せる。
 * PostgREST は numeric を文字列で返すことがあり、そのまま渡すと
 * 距離計算が文字列連結になる。空文字・NaN も null に倒す。
 */
function coord(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * パッケージの開始/終了地点を組み立てる。
 * DB の CHECK で4点セットは揃っている前提だが、片方でも欠けたら
 * null にして「未設定」に倒す。半端な地点を経路計算に渡さない。
 */
function packagePlace(
  placeId: string | null,
  name: string | null,
  lat: unknown,
  lng: unknown,
): PackagePlace | null {
  if (!placeId || !name) return null;
  const latitude = coord(lat);
  const longitude = coord(lng);
  if (latitude === null || longitude === null) return null;
  return { place_id: placeId, name, latitude, longitude };
}

/** Package のマッパー全部で同じ2項目を作るのでまとめる */
function packagePlaces(row: {
  start_place_id: string | null;
  start_place_name: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
  end_place_id: string | null;
  end_place_name: string | null;
  end_latitude: number | null;
  end_longitude: number | null;
}): Pick<Package, 'start_place' | 'end_place'> {
  return {
    start_place: packagePlace(row.start_place_id, row.start_place_name, row.start_latitude, row.start_longitude),
    end_place: packagePlace(row.end_place_id, row.end_place_name, row.end_latitude, row.end_longitude),
  };
}

export async function getSpotsByPackageId(packageId: string, lang = DEFAULT_LANG): Promise<Spot[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('spots')
    .select(`
      *,
      spot_translations!inner(name, description, local_tips, etiquette_tips),
      japanese_phrases(
        id, japanese, reading, order,
        japanese_phrase_translations(meaning, context)
      )
    `)
    .eq('package_id', packageId)
    .eq('spot_translations.language', lang)
    .order('order', { ascending: true });

  if (error || !data) {
    console.error('getSpotsByPackageId error:', error);
    return [];
  }

  return data.map((row) => {
    const t = Array.isArray(row.spot_translations)
      ? row.spot_translations[0]
      : row.spot_translations;

    const phrases: JapanesePhrase[] = (row.japanese_phrases ?? [])
      .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
      .map((p: {
        japanese: string;
        reading: string | null;
        japanese_phrase_translations: Array<{ meaning: string; context: string | null }> | { meaning: string; context: string | null };
      }) => {
        const pt = Array.isArray(p.japanese_phrase_translations)
          ? p.japanese_phrase_translations[0]
          : p.japanese_phrase_translations;
        return {
          japanese: p.japanese,
          reading: p.reading ?? '',
          meaning: pt?.meaning ?? '',
          context: pt?.context ?? '',
        } satisfies JapanesePhrase;
      });

    return {
      id: row.id,
      package_id: row.package_id,
      order: row.order,
      name: t?.name ?? '',
      description: t?.description ?? '',
      image_url: row.image_url ?? '',
      video_url: row.video_url ?? undefined,
      local_tips: t?.local_tips ?? [],
      japanese_phrases: phrases,
      etiquette_tips: t?.etiquette_tips ?? [],
      map_url: row.map_url ?? '',
      shop_url: row.shop_url ?? undefined,
      duration_minutes: row.duration_minutes ?? 0,
    } satisfies Spot;
  });
}

// ────────────────────────────────────────────────
// Reviews
// ────────────────────────────────────────────────

/**
 * 自分がそのパッケージに書いたレビュー。無ければ null。
 * reviews は UNIQUE(package_id, user_id) なので1人1件。
 */
export async function getMyReview(packageId: string): Promise<Review | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('reviews')
    .select('id, package_id, user_id, rating, comment, created_at')
    .eq('package_id', packageId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('getMyReview error:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    package_id: data.package_id,
    user_id: data.user_id,
    rating: data.rating,
    comment: data.comment ?? '',
    created_at: data.created_at,
  } as Review;
}

/**
 * レビューを投稿・更新する。
 *
 * RLS(reviews_insert_purchased)が「status='completed' の購入者のみ」を
 * 保証しているので、ここで購入判定を重ねない。弾かれたときは
 * 42501 が返るので、所有権の問題と通信障害を見分けられる。
 *
 * UNIQUE(package_id, user_id) があるので upsert。書き直しも同じ経路で通る。
 *
 * packages.rating / review_count は DB のトリガーが再計算するので、
 * ここでは触らない（#33）。
 */
export async function submitReview(
  packageId: string,
  rating: number,
  comment: string,
): Promise<SaveResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'forbidden';

  // DB の CHECK と同じ範囲。弾かれてから「保存できません」と出すより、
  // 送る前に止める
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return 'error';

  const { data, error } = await supabase
    .from('reviews')
    .upsert(
      { package_id: packageId, user_id: user.id, rating, comment: comment.trim() || null },
      { onConflict: 'package_id,user_id' },
    )
    .select('id');

  if (error) {
    // 42501 = RLS に弾かれた。購入していないパッケージへの投稿
    console.error('submitReview failed:', error.code, error.message);
    return error.code === '42501' ? 'forbidden' : 'error';
  }
  if (!data || data.length === 0) {
    console.error('submitReview failed: 0 rows affected');
    return 'forbidden';
  }
  return 'ok';
}

export async function getReviewsByPackageId(packageId: string): Promise<Review[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      profiles(id, display_name, avatar_url, native_language, created_at)
    `)
    .eq('package_id', packageId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('getReviewsByPackageId error:', error);
    return [];
  }

  return data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      package_id: row.package_id,
      user_id: row.user_id,
      user: profile ? {
        id: profile.id,
        name: profile.display_name ?? 'Anonymous',
        email: '',
        avatar_url: profile.avatar_url ?? undefined,
        language: (profile.native_language ?? 'ja') as 'ko' | 'ja' | 'en',
        created_at: profile.created_at,
      } : undefined,
      rating: row.rating,
      comment: row.comment ?? '',
      created_at: row.created_at,
    } satisfies Review;
  });
}

// ────────────────────────────────────────────────
// Manner Categories & Tips
// ────────────────────────────────────────────────

export async function getMannerCategories(lang = DEFAULT_LANG): Promise<MannerCategory[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('manner_categories')
    .select(`
      *,
      manner_category_translations!inner(name, description)
    `)
    .eq('manner_category_translations.language', lang)
    .order('sort_order', { ascending: true });

  if (error || !data) {
    console.error('getMannerCategories error:', error);
    return [];
  }

  return data.map((row) => {
    const t = Array.isArray(row.manner_category_translations)
      ? row.manner_category_translations[0]
      : row.manner_category_translations;
    return {
      id: row.id,
      name: t?.name ?? '',
      description: t?.description ?? '',
      icon: row.icon ?? '',
      image_url: row.image_url ?? '',
    } satisfies MannerCategory;
  });
}

export async function getMannerCategoryById(categoryId: string, lang = DEFAULT_LANG): Promise<MannerCategory | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('manner_categories')
    .select(`
      *,
      manner_category_translations!inner(name, description)
    `)
    .eq('id', categoryId)
    .eq('manner_category_translations.language', lang)
    .maybeSingle();

  if (error) {
    console.error('getMannerCategoryById error:', error.message, error);
    return null;
  }
  if (!data) return null;

  const t = Array.isArray(data.manner_category_translations)
    ? data.manner_category_translations[0]
    : data.manner_category_translations;

  return {
    id: data.id,
    name: t?.name ?? '',
    description: t?.description ?? '',
    icon: data.icon ?? '',
    image_url: data.image_url ?? '',
  } satisfies MannerCategory;
}

export async function getMannerTips(lang = DEFAULT_LANG): Promise<MannerTip[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('manner_tips')
    .select(`
      *,
      manner_tip_translations!inner(title, description, do_tips, dont_tips)
    `)
    .eq('manner_tip_translations.language', lang)
    .order('sort_order', { ascending: true });

  if (error || !data) {
    console.error('getMannerTips error:', error);
    return [];
  }

  return data.map((row) => {
    const t = Array.isArray(row.manner_tip_translations)
      ? row.manner_tip_translations[0]
      : row.manner_tip_translations;
    return {
      id: row.id,
      category_id: row.category_id,
      title: t?.title ?? '',
      description: t?.description ?? '',
      image_url: row.image_url ?? undefined,
      do_tips: t?.do_tips ?? [],
      dont_tips: t?.dont_tips ?? [],
    } satisfies MannerTip;
  });
}

export async function getMannerTipsByCategoryId(categoryId: string, lang = DEFAULT_LANG): Promise<MannerTip[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('manner_tips')
    .select(`
      *,
      manner_tip_translations!inner(title, description, do_tips, dont_tips)
    `)
    .eq('category_id', categoryId)
    .eq('manner_tip_translations.language', lang)
    .order('sort_order', { ascending: true });

  if (error || !data) {
    console.error('getMannerTipsByCategoryId error:', error);
    return [];
  }

  return data.map((row) => {
    const t = Array.isArray(row.manner_tip_translations)
      ? row.manner_tip_translations[0]
      : row.manner_tip_translations;
    return {
      id: row.id,
      category_id: row.category_id,
      title: t?.title ?? '',
      description: t?.description ?? '',
      image_url: row.image_url ?? undefined,
      do_tips: t?.do_tips ?? [],
      dont_tips: t?.dont_tips ?? [],
    } satisfies MannerTip;
  });
}

export async function getMannerTipById(tipId: string, lang = DEFAULT_LANG): Promise<MannerTip | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('manner_tips')
    .select(`
      *,
      manner_tip_translations!inner(title, description, do_tips, dont_tips)
    `)
    .eq('id', tipId)
    .eq('manner_tip_translations.language', lang)
    .maybeSingle();

  if (error) {
    console.error('getMannerTipById error:', error.message, error);
    return null;
  }
  if (!data) return null;

  const t = Array.isArray(data.manner_tip_translations)
    ? data.manner_tip_translations[0]
    : data.manner_tip_translations;

  return {
    id: data.id,
    category_id: data.category_id,
    title: t?.title ?? '',
    description: t?.description ?? '',
    image_url: data.image_url ?? undefined,
    do_tips: t?.do_tips ?? [],
    dont_tips: t?.dont_tips ?? [],
  } satisfies MannerTip;
}

// ────────────────────────────────────────────────
// Magazine Articles
// ────────────────────────────────────────────────

export async function getMagazineArticles(lang = DEFAULT_LANG): Promise<MagazineArticle[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('magazine_articles')
    .select(`
      *,
      magazine_article_translations!inner(title, excerpt)
    `)
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .eq('magazine_article_translations.language', lang)
    .order('published_at', { ascending: false });

  if (error || !data) {
    console.error('getMagazineArticles error:', error);
    return [];
  }

  return data.map((row) => {
    const t = Array.isArray(row.magazine_article_translations)
      ? row.magazine_article_translations[0]
      : row.magazine_article_translations;
    return {
      id: row.id,
      title: t?.title ?? '',
      excerpt: t?.excerpt ?? '',
      image_url: row.image_url ?? '',
      category: row.category ?? '',
      read_time: row.read_time_minutes ?? 0,
      created_at: row.created_at,
    } satisfies MagazineArticle;
  });
}

// ────────────────────────────────────────────────
// Community Routes
// ────────────────────────────────────────────────

export async function getCommunityRoutes(lang = DEFAULT_LANG): Promise<CommunityRoute[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('community_routes')
    .select(`
      *,
      community_route_translations!inner(title, description),
      profiles(id, display_name, avatar_url, native_language, created_at)
    `)
    .eq('community_route_translations.language', lang)
    .order('likes_count', { ascending: false });

  if (error || !data) {
    console.error('getCommunityRoutes error:', error);
    return [];
  }

  return data.map((row) => {
    const t = Array.isArray(row.community_route_translations)
      ? row.community_route_translations[0]
      : row.community_route_translations;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      title: t?.title ?? '',
      description: t?.description ?? '',
      image_url: row.image_url ?? '',
      author: {
        id: profile?.id ?? '',
        name: profile?.display_name ?? 'TABITO',
        email: '',
        avatar_url: profile?.avatar_url ?? undefined,
        language: ((profile?.native_language) ?? 'ja') as 'ko' | 'ja' | 'en',
        created_at: profile?.created_at ?? '',
      },
      likes: row.likes_count,
      created_at: row.created_at,
    } satisfies CommunityRoute;
  });
}

export async function getMagazineArticleById(id: string, lang = DEFAULT_LANG): Promise<(MagazineArticle & { content: string }) | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('magazine_articles')
    .select('*, magazine_article_translations!inner(title, excerpt, content)')
    .eq('id', id)
    .eq('magazine_article_translations.language', lang)
    .maybeSingle();

  if (error) {
    console.error('getMagazineArticleById error:', error.message, error);
    return null;
  }
  if (!data) return null;

  const t = Array.isArray(data.magazine_article_translations)
    ? data.magazine_article_translations[0]
    : data.magazine_article_translations;

  return {
    id: data.id,
    title: t?.title ?? '',
    excerpt: t?.excerpt ?? '',
    content: t?.content ?? '',
    image_url: data.image_url ?? '',
    category: data.category ?? '',
    read_time: data.read_time_minutes ?? 0,
    created_at: data.created_at,
  };
}

export async function getCommunityRouteById(id: string, lang = DEFAULT_LANG): Promise<CommunityRoute | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('community_routes')
    .select(`
      *,
      community_route_translations!inner(title, description),
      profiles(id, display_name, avatar_url, native_language, created_at)
    `)
    .eq('id', id)
    .eq('community_route_translations.language', lang)
    .maybeSingle();

  if (error) {
    console.error('getCommunityRouteById error:', error.message, error);
    return null;
  }
  if (!data) return null;

  const t = Array.isArray(data.community_route_translations)
    ? data.community_route_translations[0]
    : data.community_route_translations;
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

  return {
    id: data.id,
    title: t?.title ?? '',
    description: t?.description ?? '',
    image_url: data.image_url ?? '',
    author: {
      id: profile?.id ?? '',
      name: profile?.display_name ?? 'TABITO',
      email: '',
      avatar_url: profile?.avatar_url ?? undefined,
      language: ((profile?.native_language) ?? 'ja') as 'ko' | 'ja' | 'en',
      created_at: profile?.created_at ?? '',
    },
    likes: data.likes_count,
    created_at: data.created_at,
  };
}

// ────────────────────────────────────────────────
// Plans (旅行計画)
// ────────────────────────────────────────────────

/**
 * plan_items にぶら下げたパッケージ行を表示用に整える。
 * PostgREST は 1対1 のリレーションでも配列で返すことがあるので、
 * 呼び出し側で形を揃えてから渡す前提にしている。
 */
function planItemPackage(row: {
  id: string;
  image_url: string | null;
  spot_count: number;
  duration_minutes: number | null;
  areas: unknown;
  package_translations: unknown;
  guides: unknown;
}): PlanItemPackage {
  const t = Array.isArray(row.package_translations)
    ? row.package_translations[0]
    : row.package_translations;
  const guide = Array.isArray(row.guides) ? row.guides[0] : row.guides;
  const guideTrans = guide
    ? (Array.isArray(guide.guide_translations) ? guide.guide_translations[0] : guide.guide_translations)
    : null;

  return {
    id: row.id,
    title: (t as { title?: string } | null)?.title ?? '',
    image_url: row.image_url ?? '',
    area: relName(row.areas),
    spot_count: row.spot_count,
    duration_minutes: row.duration_minutes,
    guide_name: (guideTrans as { name?: string } | null)?.name ?? '',
  } satisfies PlanItemPackage;
}

export async function getMyPlans(): Promise<Plan[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('getMyPlans error:', error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    location: row.location,
    start_date: row.start_date,
    end_date: row.end_date,
    created_at: row.created_at,
  } satisfies Plan));
}

export async function createPlan(
  title: string,
  location: string,
  start_date: string,
  end_date: string,
): Promise<Plan | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('plans')
    .insert({ user_id: user.id, title, location: location || null, start_date: start_date || null, end_date: end_date || null })
    .select()
    .single();

  if (error || !data) {
    console.error('createPlan error:', error);
    return null;
  }

  return {
    id: data.id,
    user_id: data.user_id,
    title: data.title,
    location: data.location,
    start_date: data.start_date,
    end_date: data.end_date,
    created_at: data.created_at,
  } satisfies Plan;
}

export async function deletePlan(planId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('plans').delete().eq('id', planId);
}

export async function getPlanItems(planId: string): Promise<PlanItem[]> {
  const supabase = createClient();
  // パッケージブロックは中身（画像・エリア・スポット数・ガイド名）を
  // 出したいので一緒に引く。package_id が無い行では null になる。
  const { data, error } = await supabase
    .from('plan_items')
    .select(`
      *,
      packages(
        id, image_url, spot_count, duration_minutes,
        areas(name),
        package_translations(title),
        guides(guide_translations(name))
      )
    `)
    .eq('plan_id', planId)
    // package_translations は 'ja' しか入らない（createCreatorPackage /
    // updateCreatorPackage が language: 'ja' 固定で書く）。UIロケールで
    // 絞ると en/ko でタイトルが空になる。CLAUDE.md のとおり、DB由来の
    // コンテンツは投稿された言語のまま出す
    .eq('packages.package_translations.language', DEFAULT_LANG)
    .order('day', { ascending: true })
    .order('order', { ascending: true });

  if (error || !data) {
    console.error('getPlanItems error:', error);
    return [];
  }

  return data.map((row) => {
    const pkg = Array.isArray(row.packages) ? row.packages[0] : row.packages;
    return {
      id: row.id,
      plan_id: row.plan_id,
      day: row.day,
      order: row.order,
      item_type: row.item_type as PlanItem['item_type'],
      title: row.title,
      scheduled_time: row.scheduled_time,
      duration_minutes: row.duration_minutes,
      spot_id: row.spot_id,
      manner_tip_id: row.manner_tip_id,
      package_id: row.package_id,
      source: row.source as PlanItem['source'],
      note: row.note,
      // パッケージが削除されると package_id は SET NULL になり、
      // タイトルだけが行に残る。ここも undefined になるので、
      // 表示側は「もう無いパッケージ」として描ける
      package: pkg ? planItemPackage(pkg) : undefined,
    } satisfies PlanItem;
  });
}

export async function addPlanItem(
  planId: string,
  day: number,
  item_type: PlanItem['item_type'],
  title: string,
  scheduled_time?: string,
  duration_minutes?: number | null,
  note?: string | null,
): Promise<PlanItem | null> {
  const supabase = createClient();

  // 同じdayの最後のorderを取得
  const { data: existing } = await supabase
    .from('plan_items')
    .select('order')
    .eq('plan_id', planId)
    .eq('day', day)
    .order('order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].order + 1 : 1;

  const { data, error } = await supabase
    .from('plan_items')
    .insert({
      plan_id: planId,
      day,
      order: nextOrder,
      item_type,
      title,
      scheduled_time: scheduled_time || null,
      // 移動や食事にも所要時間を持たせる。終了時刻が出ないと
      // 次の予定を何時から置けるのか分からない
      duration_minutes: duration_minutes ?? null,
      note: note?.trim() || null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('addPlanItem error:', error);
    return null;
  }

  return {
    id: data.id,
    plan_id: data.plan_id,
    day: data.day,
    order: data.order,
    item_type: data.item_type as PlanItem['item_type'],
    title: data.title,
    scheduled_time: data.scheduled_time,
    duration_minutes: data.duration_minutes,
    spot_id: data.spot_id,
    manner_tip_id: data.manner_tip_id,
    package_id: data.package_id,
    source: data.source as PlanItem['source'],
    note: data.note,
  } satisfies PlanItem;
}

/**
 * 計画に置ける購入済みパッケージ。
 * 有料コンテンツの中身が計画経由で漏れないよう、購入したものだけを返す。
 * status = 'completed' に限る（pending は決済が通っていない）。
 */
export async function getPurchasedPackagesForPlan(): Promise<PlanItemPackage[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('purchases')
    .select(`
      package_id,
      packages!inner(
        id, image_url, spot_count, duration_minutes,
        areas(name),
        package_translations(title),
        guides(guide_translations(name))
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    // ここも同じ。UIロケールでは絞らない（getPlanItems のコメント参照）
    .eq('packages.package_translations.language', DEFAULT_LANG)
    .order('purchased_at', { ascending: false });

  if (error || !data) {
    console.error('getPurchasedPackagesForPlan error:', error);
    return [];
  }

  return data
    .map((row) => (Array.isArray(row.packages) ? row.packages[0] : row.packages))
    .filter((pkg): pkg is NonNullable<typeof pkg> => Boolean(pkg))
    .map(planItemPackage);
}

/**
 * 計画にパッケージをブロックとして置く。
 *
 * タイトルは行に焼き付ける。パッケージが後で削除されると
 * package_id は SET NULL になるが、「何を置いていたか」は残る。
 *
 * 所要時間もここで写す。行程の時刻計算に使うので、
 * パッケージ側が後から変わっても既に組んだ予定が動かない方が良い。
 */
export type AddPlanPackageResult =
  | { ok: true; item: PlanItem }
  | { ok: false; reason: 'duplicate' | 'error' };

export async function addPlanPackage(
  planId: string,
  day: number,
  pkg: PlanItemPackage,
  scheduledTime?: string,
): Promise<AddPlanPackageResult> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from('plan_items')
    .select('order')
    .eq('plan_id', planId)
    .eq('day', day)
    .order('order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].order + 1 : 1;

  const { data, error } = await supabase
    .from('plan_items')
    .insert({
      plan_id: planId,
      day,
      order: nextOrder,
      item_type: 'package',
      title: pkg.title,
      package_id: pkg.id,
      duration_minutes: pkg.duration_minutes,
      scheduled_time: scheduledTime || null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('addPlanPackage error:', error?.code, error?.message);
    // 23505 = plan_items_unique_package_per_plan 違反。
    // 「既に入っている」かを呼び出し側の手元の状態から推測すると、
    // 別タブで追加された場合など手元が古いときに誤った文言になる。
    // DB が返した理由をそのまま渡す。
    return { ok: false, reason: error?.code === '23505' ? 'duplicate' : 'error' };
  }

  const item = {
    id: data.id,
    plan_id: data.plan_id,
    day: data.day,
    order: data.order,
    item_type: 'package',
    title: data.title,
    scheduled_time: data.scheduled_time,
    duration_minutes: data.duration_minutes,
    spot_id: data.spot_id,
    manner_tip_id: data.manner_tip_id,
    package_id: data.package_id,
    source: data.source as PlanItem['source'],
    note: data.note,
    package: pkg,
  } satisfies PlanItem;

  return { ok: true, item };
}

export type ExpandPackageResult =
  | { ok: true; items: PlanItem[] }
  | { ok: false; reason: 'no-spots' | 'error' };

/**
 * パッケージを行程に展開する。#16 段階1
 *
 * spots を順番どおり plan_items に並べ、滞在時間から時刻を積むだけ。
 * **AI は使わない。** 決定的にしておけば安いし壊れないし、
 * ユーザーが結果を予測できる。
 *
 * ブロック1行を、スポットN行に置き換える。置き換えなので
 * 「展開したのにブロックも残る」二重表示にはならない。
 *
 * 開始時刻はブロックが持っていた scheduled_time を引き継ぐ。
 * 時刻が無い場合は時刻なしで並べる（勝手に9:00などを置かない。
 * ユーザーが決めた予定に見えてしまう）。
 */
export async function expandPackageIntoPlan(
  blockItem: PlanItem,
): Promise<ExpandPackageResult> {
  const supabase = createClient();
  if (!blockItem.package_id) return { ok: false, reason: 'error' };

  const spots = await getSpotsByPackageId(blockItem.package_id);
  if (spots.length === 0) return { ok: false, reason: 'no-spots' };

  // 開始時刻。無ければ時刻なしで並べる
  let cursor: number | null = null;
  if (blockItem.scheduled_time) {
    const [h, m] = blockItem.scheduled_time.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) cursor = h * 60 + m;
  }

  const rows = spots.map((spot, i) => {
    let scheduled: string | null = null;
    if (cursor !== null && cursor < 24 * 60) {
      scheduled = `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`;
      cursor += spot.duration_minutes || 0;
    }
    return {
      plan_id: blockItem.plan_id,
      day: blockItem.day,
      // ブロックの位置に差し込む。後続アイテムとの前後関係は order の
      // 小数を使えないので、ブロックの order から連番で詰める
      order: blockItem.order + i,
      item_type: 'spot' as const,
      title: spot.name,
      scheduled_time: scheduled,
      duration_minutes: spot.duration_minutes || null,
      spot_id: spot.id,
      package_id: blockItem.package_id,
      source: 'package' as const,
    };
  });

  const { data, error } = await supabase.from('plan_items').insert(rows).select('*');

  if (error || !data) {
    console.error('expandPackageIntoPlan insert failed:', error?.code, error?.message);
    return { ok: false, reason: 'error' };
  }

  // 元のブロックを消す。先に消すと、insert が失敗したときに
  // 行程からパッケージが消えて何も残らない
  const { error: delError } = await supabase
    .from('plan_items')
    .delete()
    .eq('id', blockItem.id);

  if (delError) {
    // 展開は成功しているので全体は失敗にしない。ブロックが残るだけ。
    // ユーザーは手で消せる
    console.error('expandPackageIntoPlan: block delete failed:', delError.message);
  }

  return {
    ok: true,
    items: data.map((row) => ({
      id: row.id,
      plan_id: row.plan_id,
      day: row.day,
      order: row.order,
      item_type: row.item_type as PlanItem['item_type'],
      title: row.title,
      scheduled_time: row.scheduled_time,
      duration_minutes: row.duration_minutes,
      spot_id: row.spot_id,
      manner_tip_id: row.manner_tip_id,
      package_id: row.package_id,
      source: row.source as PlanItem['source'],
      note: row.note,
    } satisfies PlanItem)),
  };
}

/**
 * その日のアイテムを指定した並びに揃える。#16
 *
 * order は int なので、間に挿し込むための小数が使えない。
 * 1日ぶんを 1..N に振り直す。1日のアイテム数はたかが知れているので、
 * 小数で詰めていって桁が枯れるより単純で壊れない。
 *
 * 一部だけ失敗すると順序が壊れるので、失敗したらその旨を返して
 * 呼び出し側に引き直させる。
 */
export async function reorderPlanItems(orderedIds: string[]): Promise<boolean> {
  const supabase = createClient();
  if (orderedIds.length === 0) return true;

  // PostgREST に複文トランザクションが無いので1件ずつ。順序の書き換えは
  // 同じ日の中だけで完結し、失敗しても他の日に波及しない
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('plan_items')
      .update({ order: i + 1 })
      .eq('id', orderedIds[i]);
    if (error) {
      console.error('reorderPlanItems failed:', orderedIds[i], error.message);
      return false;
    }
  }
  return true;
}

/**
 * 指定位置にアイテムを足す。
 *
 * position は「その日の何番目に入れるか」（0 始まり）。
 * 末尾に足すだけだと、あとから間に入れたいときに全部作り直しになる。
 *
 * 挿入後にその日を 1..N へ振り直す。呼び出し側は戻り値の並びで
 * 画面を更新する。
 */
export async function insertPlanItemAt(
  planId: string,
  day: number,
  position: number,
  item_type: PlanItem['item_type'],
  title: string,
  scheduled_time?: string,
  duration_minutes?: number | null,
  note?: string | null,
): Promise<PlanItem | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('plan_items')
    .insert({
      plan_id: planId,
      day,
      // いったん末尾より大きい値で入れ、このあと振り直す。
      // 既存と衝突しない値ならなんでもよい
      order: 100000 + position,
      item_type,
      title,
      scheduled_time: scheduled_time || null,
      duration_minutes: duration_minutes ?? null,
      note: note?.trim() || null,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('insertPlanItemAt failed:', error?.code, error?.message);
    return null;
  }

  return {
    id: data.id,
    plan_id: data.plan_id,
    day: data.day,
    order: data.order,
    item_type: data.item_type as PlanItem['item_type'],
    title: data.title,
    scheduled_time: data.scheduled_time,
    duration_minutes: data.duration_minutes,
    spot_id: data.spot_id,
    manner_tip_id: data.manner_tip_id,
    package_id: data.package_id,
    source: data.source as PlanItem['source'],
    note: data.note,
  } satisfies PlanItem;
}

/**
 * 展開したスポット行を、パッケージのブロック1行に戻す。#16
 *
 * 展開時に package_id と source='package' を残しているので、
 * 「この計画のこのパッケージ由来の行」だけを選んで畳める。
 * 手で足した予定（source='manual'）は巻き込まない。
 *
 * 先頭行の時刻と、展開行の所要時間の合計をブロックに引き継ぐ。
 * 展開→折りたたみを往復しても、開始時刻と所要時間が保たれる。
 */
export async function collapsePackageInPlan(
  planId: string,
  packageId: string,
  packageTitle: string,
): Promise<PlanItem | null> {
  const supabase = createClient();

  const { data: rows, error } = await supabase
    .from('plan_items')
    .select('id, day, order, scheduled_time, duration_minutes')
    .eq('plan_id', planId)
    .eq('package_id', packageId)
    .eq('source', 'package')
    .neq('item_type', 'package')
    .order('day')
    .order('order');

  if (error || !rows || rows.length === 0) {
    console.error('collapsePackageInPlan: nothing to collapse', error?.message);
    return null;
  }

  const first = rows[0];
  const total = rows.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);

  const { data: block, error: insertError } = await supabase
    .from('plan_items')
    .insert({
      plan_id: planId,
      day: first.day,
      order: first.order,
      item_type: 'package',
      title: packageTitle,
      scheduled_time: first.scheduled_time,
      duration_minutes: total || null,
      package_id: packageId,
      source: 'package',
    })
    .select('*')
    .single();

  if (insertError || !block) {
    console.error('collapsePackageInPlan insert failed:', insertError?.code, insertError?.message);
    return null;
  }

  // ブロックを作れてから消す。逆順だと、insert に失敗したときに
  // 行程からパッケージが丸ごと消える
  const { error: delError } = await supabase
    .from('plan_items')
    .delete()
    .in('id', rows.map((r) => r.id));

  if (delError) {
    console.error('collapsePackageInPlan delete failed:', delError.message);
    // ブロックと展開行が二重に残る。呼び出し側が引き直せば実態が見える
  }

  // 表示用のパッケージ情報を付けて返す。これが無いと PackageBlock が
  // 「パッケージが無い＝削除された」と判断して、消えていないのに
  // 「配信を終了しました」を出してしまう
  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select(`
      id, image_url, spot_count, duration_minutes,
      areas(name),
      package_translations(title),
      guides(guide_translations(name))
    `)
    .eq('id', packageId)
    .eq('package_translations.language', DEFAULT_LANG)
    .maybeSingle();

  if (pkgError) console.error('collapsePackageInPlan package fetch failed:', pkgError.message);

  return {
    id: block.id,
    plan_id: block.plan_id,
    day: block.day,
    order: block.order,
    item_type: 'package',
    title: block.title,
    scheduled_time: block.scheduled_time,
    duration_minutes: block.duration_minutes,
    spot_id: block.spot_id,
    manner_tip_id: block.manner_tip_id,
    package_id: block.package_id,
    source: block.source as PlanItem['source'],
    note: block.note,
    package: pkgRow ? planItemPackage(pkgRow) : undefined,
  } satisfies PlanItem;
}

/**
 * アイテムのメモを書き換える。
 * 「何を食べるか」「どの電車か」「何に気をつけるか」を残す欄。#16
 */
export async function updatePlanItemNote(itemId: string, note: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('plan_items')
    .update({ note: note.trim() || null })
    .eq('id', itemId)
    .select('id');

  // RLS に弾かれると error ではなく0件で返る。0件を成功にすると
  // 「保存した」のに残っていない状態になる
  if (error || !data || data.length === 0) {
    console.error('updatePlanItemNote failed:', error?.message ?? '0 rows affected');
    return false;
  }
  return true;
}

export async function deletePlanItem(itemId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('plan_items').delete().eq('id', itemId);
}

// ────────────────────────────────────────────────
// Saved Items (保存済み)
// ────────────────────────────────────────────────

export async function getSavedPackages(lang = DEFAULT_LANG): Promise<Package[]> {
  const supabase = createClient();

  const { data: saved, error: savedError } = await supabase
    .from('saved_items')
    .select('item_id')
    .eq('item_type', 'package');

  if (savedError || !saved || saved.length === 0) return [];

  const ids = saved.map((s) => s.item_id);

  const { data, error } = await supabase
    .from('packages')
    .select(`
      *,
      areas(name),
      categories(name),
      package_translations!inner(title, description, short_description),
      guides(
        id, location, languages, rating, review_count, avatar_url,
        guide_translations(name, bio)
      )
    `)
    .in('id', ids)
    .eq('package_translations.language', lang);

  if (error || !data) {
    console.error('getSavedPackages error:', error);
    return [];
  }

  return data.map((row) => {
    const t = Array.isArray(row.package_translations) ? row.package_translations[0] : row.package_translations;
    const guide = Array.isArray(row.guides) ? row.guides[0] : row.guides;
    const gt = guide && Array.isArray(guide.guide_translations) ? guide.guide_translations[0] : guide?.guide_translations;
    return {
      id: row.id,
      title: t?.title ?? '',
      description: t?.description ?? '',
      short_description: t?.short_description ?? '',
      image_url: row.image_url ?? '',
      guide_id: row.guide_id,
      guide: guide ? {
        id: guide.id,
        name: gt?.name ?? '',
        bio: gt?.bio ?? '',
        avatar_url: guide.avatar_url ?? '',
        location: guide.location,
        languages: guide.languages,
        rating: Number(guide.rating),
        review_count: guide.review_count,
      } as Guide : undefined,
      area: relName(row.areas),
      area_id: row.area_id,
      duration_minutes: row.duration_minutes,
      price: row.price,
      currency: row.currency,
      rating: Number(row.rating),
      review_count: row.review_count,
      spot_count: row.spot_count,
      category: relName(row.categories),
      category_id: row.category_id,
      tags: row.tags,
      features: row.features,
      tutorial_video_url: row.tutorial_video_url ?? undefined,
      created_at: row.created_at,
      ...packagePlaces(row),
    } satisfies Package;
  });
}

export async function isPackageSaved(packageId: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from('saved_items')
    .select('item_id')
    .eq('item_type', 'package')
    .eq('item_id', packageId)
    .maybeSingle();
  return !!data;
}

export async function savePackage(packageId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('saved_items').insert({ user_id: user.id, item_type: 'package', item_id: packageId });
}

export async function unsavePackage(packageId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('saved_items').delete().eq('user_id', user.id).eq('item_type', 'package').eq('item_id', packageId);
}

// ────────────────────────────────────────────────
// Purchases (購入)
// ────────────────────────────────────────────────

export async function hasPurchased(packageId: string): Promise<boolean> {
  const supabase = createClient();
  // 自分の購入だけが見えるのは RLS (purchases_select_own) が保証している。
  // 同一パッケージの再購入で複数行になりうるので limit(1) が必須。
  // これが無いと maybeSingle() が「2行ある」エラーを返し、購入済みなのに false になる。
  const { data } = await supabase
    .from('purchases')
    .select('id')
    .eq('package_id', packageId)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function purchasePackage(packageId: string, amount: number): Promise<Purchase | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('purchases')
    .insert({
      user_id: user.id,
      package_id: packageId,
      amount,
      currency: 'JPY',
      status: 'completed',
    })
    .select()
    .single();

  if (error || !data) {
    console.error('purchasePackage error:', error);
    return null;
  }

  return {
    id: data.id,
    package_id: data.package_id,
    amount: data.amount,
    currency: data.currency,
    status: data.status as Purchase['status'],
    purchased_at: data.purchased_at,
  } satisfies Purchase;
}

// ────────────────────────────────────────────────
// Creator (ガイド側コンテンツ管理)
// ────────────────────────────────────────────────

export async function getMyGuideProfile(): Promise<Guide | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // maybeSingle() は該当2件以上でエラーになる。guides.user_id に UNIQUE が無く
  // 1ユーザーが複数行を持ち得るため、それだと登録済みでも null が返り、
  // 画面が「未登録」と判断して登録フォームを出し続ける（登録するたび行が増える）。
  // 最古の1件を代表として返す。#12
  const { data, error } = await supabase
    .from('guides')
    .select('*, guide_translations(name, bio)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('getMyGuideProfile error:', error.message, error);
    return null;
  }
  const row = data?.[0];
  if (!row) return null;

  const t = Array.isArray(row.guide_translations)
    ? row.guide_translations[0]
    : row.guide_translations;

  return {
    id: row.id,
    user_id: row.user_id ?? undefined,
    name: t?.name ?? '',
    bio: t?.bio ?? '',
    avatar_url: row.avatar_url ?? '',
    location: row.location,
    languages: row.languages,
    rating: Number(row.rating),
    review_count: row.review_count,
  };
}

export async function registerAsGuide(
  name: string,
  location: string,
  bio: string,
): Promise<Guide | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 既に登録済みなら作らない。無条件に insert すると、表示側が詰まって
  // 登録フォームが出続けたときに行が際限なく増える。#12
  const existing = await getMyGuideProfile();
  if (existing) return existing;

  // 入口で正規化する。ここで潰しておかないと、DB には trim 済みが入るのに
  // 戻り値は生の値、という画面とDBのずれが起きる
  name = name.trim();
  location = location.trim();
  bio = bio.trim();

  const avatarUrl = user.user_metadata?.avatar_url ?? null;

  const { data: guide, error: guideError } = await supabase
    .from('guides')
    .insert({
      user_id: user.id,
      location,
      languages: ['ja', 'ko'],
      avatar_url: avatarUrl,
    })
    .select()
    .single();

  if (guideError || !guide) {
    console.error('registerAsGuide guide error:', guideError);
    return null;
  }

  const { error: transError } = await supabase
    .from('guide_translations')
    .insert({ guide_id: guide.id, language: 'ja', name, bio });

  if (transError) {
    // 名前の無い guides 行を残さない。
    // 残すと (1) UNIQUE 制約で以後の再登録が弾かれ、早期 return もあるので
    // ユーザーは自力で復旧できず、(2) 重複統合の際に「古い方を残す」規則の
    // 巻き添えで、名前のある行が消えて名前なしの行が生き残りうる。#12
    console.error('registerAsGuide translation error:', transError);
    // RLS に弾かれた DELETE は error ではなく0件で返る。error だけを見ると、
    // 行が残っているのに「消せた」ことになってしまう。
    const { data: rolledBack, error: rollbackError } = await supabase
      .from('guides')
      .delete()
      .eq('id', guide.id)
      .select('id');
    if (rollbackError || !rolledBack || rolledBack.length === 0) {
      // ここまで来ると手で消すしかない。IDを残しておく。
      console.error('registerAsGuide rollback failed:', guide.id, rollbackError?.message ?? '0 rows affected');
    }
    return null;
  }

  return {
    id: guide.id,
    user_id: guide.user_id ?? undefined,
    name,
    bio,
    avatar_url: guide.avatar_url ?? '',
    location: guide.location,
    languages: guide.languages,
    rating: 0,
    review_count: 0,
  };
}

/**
 * 管理ダッシュボード用。未認証も取得失敗も `[]` に潰さず reason で返す。
 * 空配列に潰すと、ログインが切れただけ／通信に失敗しただけなのに
 * 「パッケージ0件」の画面が出て、原因も再ログイン導線も分からない。
 *
 * `status` を戻り値の型に含めておく。呼び出し側で `as unknown as` を
 * 挟むと、戻り値の形を変えても tsc が検出しなくなる。
 */
export type MyCreatorPackagesResult = {
  packages: (Package & { status: string })[];
  reason: 'ok' | 'unauthenticated' | 'error';
};

/**
 * クリエイタープロフィールの編集内容。
 * 今回は名前・自己紹介・拠点のみ。アバターと対応言語は登録時のまま。#34
 */
export interface GuideProfileInput {
  name: string;
  bio: string;
  location: string;
}

/**
 * 自分のクリエイタープロフィールを更新する。
 *
 * guides への update 経路がこれまで無く、登録時に打ち間違えると直せなかった。
 * 削除はパッケージを持っていると外部キーで止まるため、実質修正不能だった。#34
 *
 * RLS(guides_update_self / guide_translations_update_own)は既にあるので
 * マイグレーションは要らない。ただし RLS に弾かれた UPDATE は error ではなく
 * 0件で返るので、.select() で影響行を見ないと「保存できた」ことになってしまう。
 */
export async function updateMyGuideProfile(
  input: GuideProfileInput,
): Promise<SaveResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'forbidden';

  // 前後の空白は保存しない。バリデーションは trim して見ているのに
  // 保存だけ生の値だと、見た目は通るのに空白付きで入る
  const name = input.name.trim();
  const bio = input.bio.trim();
  const location = input.location.trim();

  const { data, error } = await supabase
    .from('guides')
    .update({ location })
    .eq('user_id', user.id)
    .select('id');

  // 0件 = 自分のガイドではない/存在しない。error = 通信・サーバー側。
  // 同じ文言にすると、一時的な通信エラーで所有権を疑わせることになる。
  if (error) {
    console.error('updateMyGuideProfile failed:', error.message);
    return 'error';
  }
  if (!data || data.length === 0) {
    console.error('updateMyGuideProfile failed: 0 rows affected');
    return 'forbidden';
  }

  const guideId = data[0].id;

  // 登録時に翻訳 insert が落ちていると行が無いことがあるので upsert。
  // その場合も編集画面から復旧できる。
  const { error: tError } = await supabase
    .from('guide_translations')
    .upsert(
      { guide_id: guideId, language: DEFAULT_LANG, name, bio },
      { onConflict: 'guide_id,language' },
    );

  if (tError) {
    // guides 側はコミット済み。拠点だけ変わって名前が古いまま残る。
    // PostgREST では複文トランザクションを張れないため、根治は RPC 化(#22)。
    console.error('updateMyGuideProfile translation failed:', tError.message);
    return 'partial';
  }

  return 'ok';
}

export async function getMyCreatorPackages(): Promise<MyCreatorPackagesResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { packages: [], reason: 'unauthenticated' };

  // 自分のガイドのものだけ返す。
  // packages の SELECT ポリシーは公開コンテンツを全員に開放しているので、
  // ここで絞らないと他人のパッケージまで管理画面に並び、統計にも数えられ、
  // そこから編集画面に入れてしまう。
  const { data, error } = await supabase
    .from('packages')
    .select(`
      *,
      areas(name),
      categories(name),
      package_translations(title, description, short_description),
      guides!inner(id, user_id)
    `)
    .eq('guides.user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) {
    // 取得できなかったことを 'ok' で返すと「0件」と区別が付かず、
    // 無言失敗がここだけ残る。
    console.error('getMyCreatorPackages error:', error);
    return { packages: [], reason: 'error' };
  }

  const packages = data.map((row) => {
    const t = Array.isArray(row.package_translations)
      ? row.package_translations[0]
      : row.package_translations;
    return {
      id: row.id,
      title: t?.title ?? '',
      description: t?.description ?? '',
      short_description: t?.short_description ?? '',
      image_url: row.image_url ?? '',
      guide_id: row.guide_id,
      area: relName(row.areas),
      area_id: row.area_id,
      duration_minutes: row.duration_minutes,
      price: row.price,
      currency: row.currency,
      rating: Number(row.rating),
      review_count: row.review_count,
      spot_count: row.spot_count,
      category: relName(row.categories),
      category_id: row.category_id,
      tags: row.tags ?? [],
      features: row.features ?? [],
      tutorial_video_url: row.tutorial_video_url ?? undefined,
      created_at: row.created_at,
      status: row.status,
      ...packagePlaces(row),
    } satisfies Package & { status: string };
  });

  return { packages, reason: 'ok' };
}

/**
 * 新規作成の結果。`string | null` だと「他人のガイドID（=所有権）」と
 * 「通信・サーバー側の失敗」が同じ null に潰れ、一時的なエラーでも
 * 所有権を疑う文言を出すことになる。
 */
export type CreatePackageResult =
  | { id: string; result: 'ok' }
  | { id: null; result: 'forbidden' | 'error' };

/**
 * パッケージの基本情報の入力。
 *
 * 位置引数を並べていたが、開始/終了地点で項目が増えて17個になり
 * 実用に耐えなくなったのでオブジェクトにまとめた。呼び出し元は
 * クリエイターの編集画面1箇所だけ。
 *
 * 地点は未設定（null）を許す。既存パッケージは全て未設定から始まり、
 * 設定しなくても保存できる必要がある。
 */
export interface CreatorPackageInput {
  title: string;
  areaId: string;
  price: number;
  shortDescription: string;
  description: string;
  categoryId: string;
  imageUrl: string;
  durationMinutes: number | null;
  startPlace: PackagePlace | null;
  endPlace: PackagePlace | null;
}

/**
 * 地点を DB の列に展開する。
 * 4点セットで入るか、4つとも null。DB の CHECK と同じ約束を守る。
 */
function placeColumns(prefix: 'start' | 'end', place: PackagePlace | null) {
  return {
    [`${prefix}_place_id`]: place?.place_id ?? null,
    [`${prefix}_place_name`]: place?.name ?? null,
    [`${prefix}_latitude`]: place?.latitude ?? null,
    [`${prefix}_longitude`]: place?.longitude ?? null,
  };
}

export async function createCreatorPackage(
  guideId: string,
  input: CreatorPackageInput,
): Promise<CreatePackageResult> {
  const supabase = createClient();

  const { data: pkg, error: pkgError } = await supabase
    .from('packages')
    .insert({
      guide_id: guideId,
      area_id: input.areaId,
      price: input.price,
      currency: 'JPY',
      category_id: input.categoryId || null,
      image_url: input.imageUrl || null,
      duration_minutes: input.durationMinutes,
      status: 'draft',
      tags: [],
      features: [],
      ...placeColumns('start', input.startPlace),
      ...placeColumns('end', input.endPlace),
    })
    .select()
    .single();

  if (pkgError || !pkg) {
    // INSERT が RLS(WITH CHECK) に弾かれると 42501 が返る。0件で返る
    // UPDATE と違い、ここはエラーコードで所有権と通信障害を見分けられる。
    console.error('createCreatorPackage error:', pkgError);
    return { id: null, result: pkgError?.code === '42501' ? 'forbidden' : 'error' };
  }

  const { error: transError } = await supabase.from('package_translations').insert({
    package_id: pkg.id,
    language: 'ja',
    title: input.title,
    short_description: input.shortDescription,
    description: input.description,
  });

  if (transError) {
    // タイトルの無いパッケージを残さない。createCreatorSpot と同じ補償削除。
    // package_translations は packages への FK が ON DELETE CASCADE。
    console.error('createCreatorPackage translation failed:', transError.message);
    const { data: rolledBack, error: rbError } = await supabase
      .from('packages')
      .delete()
      .eq('id', pkg.id)
      .select('id');
    if (rbError || !rolledBack || rolledBack.length === 0) {
      console.error('createCreatorPackage rollback failed:', pkg.id, rbError?.message ?? '0 rows affected');
    }
    return { id: null, result: 'error' };
  }

  return { id: pkg.id, result: 'ok' };
}

/**
 * 保存の結果。失敗を1つの false に潰すと、原因の違う失敗に
 * 同じ文言（所有権を疑う文言）を出すことになる。
 * - forbidden: 自分のコンテンツではない（RLS が0件で返した）
 * - error:     通信・サーバー側の失敗。やり直せば直りうる
 * - partial:   一部だけ保存された。#22 で RPC 化して解消する
 */
export type SaveResult = 'ok' | 'forbidden' | 'error' | 'partial';

export async function updateCreatorPackage(
  packageId: string,
  input: CreatorPackageInput,
): Promise<SaveResult> {
  const supabase = createClient();

  // RLS に弾かれても HTTP 200 / 0件 が返るだけでエラーにならない。
  // .select() で影響行を受け取り、0件なら失敗として扱う。
  // これをしないと他人のパッケージを編集して「保存済み ✓」が出てしまう。
  const { data, error } = await supabase.from('packages').update({
    area_id: input.areaId,
    price: input.price,
    category_id: input.categoryId || null,
    image_url: input.imageUrl || null,
    duration_minutes: input.durationMinutes,
    ...placeColumns('start', input.startPlace),
    ...placeColumns('end', input.endPlace),
  }).eq('id', packageId).select('id');

  // 0件 = 自分のものではない。error = 通信・サーバー側の失敗。
  // どちらも「自分が作成したコンテンツか確認してください」と出すと、
  // 一時的なネットワークエラーで所有権を疑わせることになる。
  if (error) {
    console.error('updateCreatorPackage failed:', error.message);
    return 'error';
  }
  if (!data || data.length === 0) {
    console.error('updateCreatorPackage failed: 0 rows affected');
    return 'forbidden';
  }

  const { error: tError } = await supabase.from('package_translations').upsert({
    package_id: packageId,
    language: 'ja',
    title: input.title,
    short_description: input.shortDescription,
    description: input.description,
  }, { onConflict: 'package_id,language' });

  if (tError) {
    // packages 側は既にコミット済み。エリア・価格などだけ保存され、
    // タイトル・説明が古いまま残る。PostgREST では複文トランザクションを
    // 張れないため、ここは RPC 化しないと解けない。#22
    console.error('updateCreatorPackage translation failed:', tError.message);
    return 'partial';
  }
  return 'ok';
}

export async function setPackageStatus(
  packageId: string,
  status: 'draft' | 'published',
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('packages')
    .update({ status })
    .eq('id', packageId)
    .select('id');
  if (error || !data || data.length === 0) {
    console.error('setPackageStatus failed:', error?.message ?? '0 rows affected');
    return false;
  }
  return true;
}

export async function deleteCreatorPackage(packageId: string): Promise<boolean> {
  const supabase = createClient();
  // 削除も RLS に弾かれると 204 / 0件 で返る。消えたかを確認する。
  const { data, error } = await supabase
    .from('packages')
    .delete()
    .eq('id', packageId)
    .select('id');
  if (error || !data || data.length === 0) {
    console.error('deleteCreatorPackage failed:', error?.message ?? '0 rows affected');
    return false;
  }
  return true;
}

/**
 * 編集画面用の取得。**自分のガイドのパッケージでなければ null を返す。**
 * URLを直接開かれても他人のコンテンツをフォームに載せないための防御。
 *
 * 取れなかった理由を `reason` で返す。未認証と「他人のもの」を同じ null に
 * 潰すと、セッション切れなのに「自分が作成したものか確認してください」と
 * 出て再ログイン導線が無くなる。呼び出し側で出し分けられるようにしておく。
 */
export type CreatorPackageResult = {
  pkg: (Package & { status: string }) | null;
  spots: Spot[];
  reason: 'ok' | 'unauthenticated' | 'notFound';
};

export async function getCreatorPackageWithSpots(
  packageId: string,
): Promise<CreatorPackageResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { pkg: null, spots: [], reason: 'unauthenticated' };

  const [pkgResult, spotsResult] = await Promise.all([
    supabase
      .from('packages')
      .select(`*, areas(name), categories(name), package_translations(title, description, short_description), guides!inner(user_id)`)
      .eq('id', packageId)
      .eq('guides.user_id', user.id)
      .maybeSingle(),
    supabase
      .from('spots')
      .select(`
        *,
        spot_translations(name, description, local_tips, etiquette_tips),
        japanese_phrases(id, japanese, reading, "order", japanese_phrase_translations(meaning, context))
      `)
      .eq('package_id', packageId)
      .order('order', { ascending: true }),
  ]);

  if (pkgResult.error) {
    console.error('getCreatorPackageWithSpots error:', pkgResult.error.message, pkgResult.error);
    return { pkg: null, spots: [], reason: 'notFound' };
  }
  // 他人のパッケージ、または存在しないIDのとき
  if (!pkgResult.data) return { pkg: null, spots: [], reason: 'notFound' };

  const row = pkgResult.data;
  const t = Array.isArray(row.package_translations)
    ? row.package_translations[0]
    : row.package_translations;

  const pkg = {
    id: row.id,
    title: t?.title ?? '',
    description: t?.description ?? '',
    short_description: t?.short_description ?? '',
    image_url: row.image_url ?? '',
    guide_id: row.guide_id,
    area: relName(row.areas),
    area_id: row.area_id,
    duration_minutes: row.duration_minutes,
    price: row.price,
    currency: row.currency,
    rating: Number(row.rating),
    review_count: row.review_count,
    spot_count: row.spot_count,
    category: relName(row.categories),
    category_id: row.category_id,
    tags: row.tags ?? [],
    features: row.features ?? [],
    tutorial_video_url: row.tutorial_video_url ?? undefined,
    created_at: row.created_at,
    status: row.status,
    ...packagePlaces(row),
  } satisfies Package & { status: string };

  const spots: Spot[] = (spotsResult.data ?? []).map((s) => {
    const st = Array.isArray(s.spot_translations)
      ? s.spot_translations[0]
      : s.spot_translations;
    const phrases: JapanesePhrase[] = (s.japanese_phrases ?? [])
      .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
      .map((p: {
        japanese: string; reading: string | null;
        japanese_phrase_translations: Array<{ meaning: string; context: string | null }> | { meaning: string; context: string | null };
      }) => {
        const pt = Array.isArray(p.japanese_phrase_translations)
          ? p.japanese_phrase_translations[0]
          : p.japanese_phrase_translations;
        return {
          japanese: p.japanese,
          reading: p.reading ?? '',
          meaning: pt?.meaning ?? '',
          context: pt?.context ?? '',
        };
      });
    return {
      id: s.id,
      package_id: s.package_id,
      order: s.order,
      name: st?.name ?? '',
      description: st?.description ?? '',
      image_url: s.image_url ?? '',
      video_url: s.video_url ?? undefined,
      local_tips: st?.local_tips ?? [],
      etiquette_tips: st?.etiquette_tips ?? [],
      japanese_phrases: phrases,
      map_url: s.map_url ?? '',
      shop_url: s.shop_url ?? undefined,
      duration_minutes: s.duration_minutes ?? 0,
    };
  });

  return { pkg, spots, reason: 'ok' };
}

export async function createCreatorSpot(
  packageId: string,
  order: number,
  input: CreatorSpotInput,
): Promise<string | null> {
  const supabase = createClient();

  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .insert({
      package_id: packageId,
      order,
      image_url: input.image_url || null,
      video_url: input.video_url || null,
      duration_minutes: input.duration_minutes || null,
      map_url: input.map_url || null,
      shop_url: input.shop_url || null,
    })
    .select()
    .single();

  if (spotError || !spot) {
    console.error('createCreatorSpot error:', spotError);
    return null;
  }

  // 名前の無いスポットを残さない。translation が落ちたのに id を返すと、
  // 公開パッケージに無名のスポットが並ぶ。registerAsGuide と同じ扱いにする。
  //
  // PostgREST は複文トランザクションを張れないので、ここでは
  // 「失敗したら spots 行を消す」補償削除で原子性に寄せている。
  // spot_translations と japanese_phrases は spots への FK が
  // ON DELETE CASCADE なので、行を1つ消せば道連れで消える。
  const rollback = async (why: string, detail?: unknown) => {
    console.error('createCreatorSpot rollback:', why, detail);
    // ここも0件を見る。error だけだと、RLS に弾かれて孤児のスポットが
    // 残っているのに「消せた」ことになる。
    const { data: rolledBack, error: rbError } = await supabase
      .from('spots').delete().eq('id', spot.id).select('id');
    if (rbError || !rolledBack || rolledBack.length === 0) {
      console.error('createCreatorSpot rollback failed:', spot.id, rbError?.message ?? '0 rows affected');
    }
    return null;
  };

  const { error: transError } = await supabase.from('spot_translations').insert({
    spot_id: spot.id,
    language: 'ja',
    name: input.name,
    description: input.description,
    local_tips: input.local_tips.filter(Boolean),
    etiquette_tips: input.etiquette_tips.filter(Boolean),
  });

  if (transError) return rollback('translation insert failed', transError.message);

  for (let i = 0; i < input.phrases.length; i++) {
    const phrase = input.phrases[i];
    if (!phrase.japanese.trim()) continue;
    const { data: p, error: phraseError } = await supabase
      .from('japanese_phrases')
      .insert({ spot_id: spot.id, japanese: phrase.japanese, reading: phrase.reading, order: i + 1 })
      .select()
      .single();
    if (phraseError || !p) return rollback('phrase insert failed', phraseError?.message);

    const { error: meaningError } = await supabase.from('japanese_phrase_translations').insert({
      phrase_id: p.id, language: 'ja', meaning: phrase.meaning, context: null,
    });
    if (meaningError) return rollback('phrase translation insert failed', meaningError.message);
  }

  const { error: countError } = await supabase
    .from('packages')
    .update({ spot_count: order })
    .eq('id', packageId);
  // spot_count は表示用の集計値。ここだけの失敗でスポットを捨てるのは
  // 割に合わないので、ログに残して保存自体は成功として返す。
  if (countError) console.error('createCreatorSpot spot_count update failed:', countError.message);

  return spot.id;
}

/**
 * スポット1件の保存。**原子的ではない。**
 *
 * PostgREST 経由では複文トランザクションを張れないため、途中で失敗すると
 * 「false を返す（＝保存できませんでした と出る）のに spots の UPDATE だけは
 * コミット済み」という状態が残りうる。各書き込みの成否を返すのは
 * 「黙って失敗する」のを止めるためで、部分更新そのものは解消していない。
 *
 * 正攻法は保存全体を SECURITY INVOKER の Postgres 関数にまとめること。#22
 */
export async function updateCreatorSpot(
  spotId: string,
  packageId: string,
  input: CreatorSpotInput,
): Promise<boolean> {
  const supabase = createClient();

  // RLS に弾かれた更新は error ではなく 0件 で返る。delete と同じく
  // .select() して実際に書けたかを確認する。void を返していると
  // 呼び出し側が失敗を検出できず、保存できていないのに閉じてしまう。
  const { data: updated, error: spotError } = await supabase.from('spots').update({
    image_url: input.image_url || null,
    video_url: input.video_url || null,
    duration_minutes: input.duration_minutes || null,
    map_url: input.map_url || null,
    shop_url: input.shop_url || null,
  }).eq('id', spotId).eq('package_id', packageId).select('id');

  if (spotError || !updated || updated.length === 0) {
    console.error('updateCreatorSpot spot failed:', spotError?.message ?? '0 rows affected');
    return false;
  }

  const { error: transError } = await supabase.from('spot_translations').upsert({
    spot_id: spotId,
    language: 'ja',
    name: input.name,
    description: input.description,
    local_tips: input.local_tips.filter(Boolean),
    etiquette_tips: input.etiquette_tips.filter(Boolean),
  }, { onConflict: 'spot_id,language' });

  if (transError) {
    console.error('updateCreatorSpot translation failed:', transError.message);
    return false;
  }

  // フレーズは削除してから再挿入。
  // select してから .in() で消す必要はない。1往復で済むうえ、
  // こちらはエラーも受け取れる（旧実装は削除の失敗を握り潰していた）。
  const { error: phraseDeleteError } = await supabase
    .from('japanese_phrases')
    .delete()
    .eq('spot_id', spotId);

  if (phraseDeleteError) {
    console.error('updateCreatorSpot phrase delete failed:', phraseDeleteError.message);
    return false;
  }

  for (let i = 0; i < input.phrases.length; i++) {
    const phrase = input.phrases[i];
    if (!phrase.japanese.trim()) continue;
    const { data: p, error: phraseError } = await supabase
      .from('japanese_phrases')
      .insert({ spot_id: spotId, japanese: phrase.japanese, reading: phrase.reading, order: i + 1 })
      .select()
      .single();
    // ここを握り潰すと、削除は通って挿入が落ちた場合に
    // フレーズが消えたまま「保存されました」になる
    if (phraseError || !p) {
      console.error('updateCreatorSpot phrase insert failed:', phraseError?.message ?? 'no row returned');
      return false;
    }

    const { error: meaningError } = await supabase.from('japanese_phrase_translations').insert({
      phrase_id: p.id, language: 'ja', meaning: phrase.meaning, context: null,
    });
    if (meaningError) {
      console.error('updateCreatorSpot phrase translation insert failed:', meaningError.message);
      return false;
    }
  }

  return true;
}

export async function deleteCreatorSpot(
  spotId: string,
  packageId: string,
): Promise<boolean> {
  const supabase = createClient();
  // updateCreatorSpot と同じく package_id でも絞る。RLS があるので
  // 権限の穴ではないが、同じ引数を取る関数で防御の深さを揃えておく。
  // 別パッケージのスポットIDを渡された場合も0件で弾ける。
  const { data, error } = await supabase
    .from('spots')
    .delete()
    .eq('id', spotId)
    .eq('package_id', packageId)
    .select('id');
  if (error || !data || data.length === 0) {
    console.error('deleteCreatorSpot failed:', error?.message ?? '0 rows affected');
    return false;
  }
  const { count } = await supabase
    .from('spots')
    .select('id', { count: 'exact', head: true })
    .eq('package_id', packageId);
  await supabase.from('packages').update({ spot_count: count ?? 0 }).eq('id', packageId);
  return true;
}

// ────────────────────────────────────────────────
// Chat (購入者 ↔ クリエイター)
//   アクセス制御は RLS が担保する。ここでは絞り込みを書かない箇所があるが、
//   参加者以外の行はそもそも返ってこない。
// ────────────────────────────────────────────────

/**
 * パッケージのクリエイター(profiles.id)を返す。
 * guides.user_id が null のシードガイドでは null になり、その場合チャットは提供しない。
 */
export async function getPackageCreatorUserId(packageId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('packages')
    .select('guides(user_id)')
    .eq('id', packageId)
    .maybeSingle();

  if (error) {
    console.error('getPackageCreatorUserId error:', error.message, error);
    return null;
  }
  const guide = Array.isArray(data?.guides) ? data.guides[0] : data?.guides;
  return (guide as { user_id: string | null } | undefined)?.user_id ?? null;
}

/**
 * 購入済みパッケージのスレッドを取得し、無ければ作る。
 * 未購入・クリエイター未紐付けの場合は null。
 */
export async function getOrCreateChatThread(packageId: string): Promise<ChatThread | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 完了済みの購入が要る（RLS で自分の分しか見えない）。
  // スレッドの一意制約は purchase_id なので、探すのも作るのもこれを基準にする。
  const { data: purchase } = await supabase
    .from('purchases')
    .select('id')
    .eq('package_id', packageId)
    .eq('status', 'completed')
    .order('purchased_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!purchase) return null;

  const { data: existing } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('purchase_id', purchase.id)
    .maybeSingle();
  if (existing) return existing as ChatThread;

  const creatorId = await getPackageCreatorUserId(packageId);
  if (!creatorId) return null;

  // 二重タップなどで同時に走っても片方が一意制約で落ちないよう、
  // UNIQUE が張られている purchase_id に対する upsert にする。
  // 競合に負けた側は行を返さないので、直後に読み直して同じスレッドに入れる。
  const { error } = await supabase
    .from('chat_threads')
    .upsert(
      {
        purchase_id: purchase.id,
        package_id: packageId,
        buyer_id: user.id,
        creator_id: creatorId,
      },
      { onConflict: 'purchase_id', ignoreDuplicates: true },
    );

  if (error) {
    console.error('getOrCreateChatThread error:', error.message, error);
    return null;
  }

  const { data: created, error: readError } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('purchase_id', purchase.id)
    .maybeSingle();

  if (readError) {
    console.error('getOrCreateChatThread read error:', readError.message, readError);
    return null;
  }
  return (created as ChatThread) ?? null;
}

/** ログイン中ユーザーが参加している全スレッド（購入者・クリエイター両方の立場を含む） */
export async function getChatThreads(): Promise<ChatThreadSummary[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('chat_threads')
    .select(`
      *,
      packages(image_url, package_translations(title, language)),
      buyer:profiles!chat_threads_buyer_id_fkey(display_name, avatar_url),
      creator:profiles!chat_threads_creator_id_fkey(display_name, avatar_url)
    `)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('getChatThreads error:', error.message, error);
    return [];
  }

  const threads = (data ?? []) as Record<string, unknown>[];
  if (threads.length === 0) return [];

  // 最新メッセージと未読数はSQL側で集計する。
  // 全メッセージを引いてクライアントで畳むと、PostgREST の1000行上限に当たった時点で
  // 古いスレッドの最新行が取れず、本文も未読バッジも消える。
  const { data: summaries, error: summaryError } = await supabase.rpc(
    'get_chat_thread_summaries',
  );

  if (summaryError) {
    // ここで握り潰すと、最新メッセージも未読数も無い状態のまま一覧が描かれ、
    // 全スレッドが「まだ会話が無い」ように見えてしまう。
    // マイグレーション未適用時にちょうどこれが起きるので、必ず表に出す。
    console.error('getChatThreads summary error:', summaryError.message, summaryError);
    throw new Error(`chat summary unavailable: ${summaryError.message}`);
  }

  const lastBody = new Map<string, string>();
  const unread = new Map<string, number>();
  for (const row of (summaries ?? []) as {
    thread_id: string;
    last_message_body: string | null;
    unread_count: number;
  }[]) {
    if (row.last_message_body) lastBody.set(row.thread_id, row.last_message_body);
    unread.set(row.thread_id, Number(row.unread_count) || 0);
  }

  return threads.map((t) => {
    const pkg = t.packages as { image_url: string | null; package_translations: unknown } | null;
    const translations = (Array.isArray(pkg?.package_translations)
      ? pkg?.package_translations
      : [pkg?.package_translations]) as { title: string; language: string }[] | undefined;
    // パッケージ名は投稿された言語のまま出す。日本語を優先し、無ければ先頭。
    const title =
      translations?.find((x) => x?.language === 'ja')?.title ?? translations?.[0]?.title ?? '';

    const isBuyer = t.buyer_id === user.id;
    const partner = (isBuyer ? t.creator : t.buyer) as
      | { display_name: string | null; avatar_url: string | null }
      | null;

    return {
      ...(t as unknown as ChatThread),
      package_title: title,
      package_image_url: pkg?.image_url ?? null,
      partner_name: partner?.display_name ?? '',
      partner_avatar_url: partner?.avatar_url ?? null,
      last_message_body: lastBody.get(t.id as string) ?? null,
      unread_count: unread.get(t.id as string) ?? 0,
    } satisfies ChatThreadSummary;
  });
}

export async function getChatThreadById(threadId: string): Promise<ChatThread | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('id', threadId)
    .maybeSingle();

  if (error) {
    console.error('getChatThreadById error:', error.message, error);
    return null;
  }
  return (data as ChatThread) ?? null;
}

export async function getChatMessages(threadId: string): Promise<ChatMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getChatMessages error:', error.message, error);
    return [];
  }
  return (data ?? []) as ChatMessage[];
}

export async function sendChatMessage(threadId: string, body: string): Promise<ChatMessage | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const trimmed = body.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ thread_id: threadId, sender_id: user.id, body: trimmed })
    .select()
    .single();

  if (error) {
    console.error('sendChatMessage error:', error.message, error);
    return null;
  }
  return data as ChatMessage;
}

/** スレッドを開いた／新着を見た時点で既読位置を進める */
export async function markChatThreadRead(threadId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 端末の時計で打つと、比較相手の created_at（サーバ生成）とずれて
  // 既読/未読が壊れる。時刻はDB側の now() に決めさせる。
  const { error } = await supabase.rpc('mark_chat_thread_read', { target_thread_id: threadId });

  if (error) console.error('markChatThreadRead error:', error.message, error);
}

/** ナビに出す全スレッド合計の未読数 */
export async function getTotalUnreadCount(): Promise<number> {
  // ナビのバッジ用。取得できないときはバッジを出さないだけで、
  // 呼び出し元を巻き込まない（一覧側では別途エラーを出している）。
  try {
    const threads = await getChatThreads();
    return threads.reduce((sum, t) => sum + t.unread_count, 0);
  } catch (e) {
    console.error('getTotalUnreadCount error:', e);
    return 0;
  }
}

/**
 * メッセージ一覧に出す行を組み立てる。
 * スレッドがあるものに加えて、「購入済みだがまだ会話が無い」相手も出す。
 * これが無いと購入直後に一覧が空のままで、チャットを始める入口が無くなる。
 */
export async function getChatListItems(): Promise<ChatListItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const threads = await getChatThreads();

  const items: ChatListItem[] = threads.map((t) => ({
    thread_id: t.id,
    package_id: t.package_id,
    package_title: t.package_title,
    partner_name: t.partner_name,
    partner_avatar_url: t.partner_avatar_url,
    last_message_body: t.last_message_body,
    last_message_at: t.last_message_at,
    unread_count: t.unread_count,
  }));

  // 購入済みでまだスレッドが無いパッケージ（RLSで自分の購入しか返らない）
  const { data: purchases, error } = await supabase
    .from('purchases')
    .select(`
      package_id,
      packages(
        package_translations(title, language),
        guides(user_id, guide_translations(name))
      )
    `)
    .eq('status', 'completed');

  if (error) {
    console.error('getChatListItems error:', error.message, error);
    return items;
  }

  const seen = new Set(items.map((i) => i.package_id));

  for (const row of purchases ?? []) {
    const packageId = row.package_id as string;
    if (seen.has(packageId)) continue;
    seen.add(packageId);

    const pkg = row.packages as Record<string, unknown> | null;
    const guide = (Array.isArray(pkg?.guides) ? pkg?.guides[0] : pkg?.guides) as
      | { user_id: string | null; guide_translations: unknown }
      | undefined;

    // クリエイター不在、または自分が作成者の場合はチャットが成立しない
    if (!guide?.user_id || guide.user_id === user.id) continue;

    const translations = (Array.isArray(pkg?.package_translations)
      ? pkg?.package_translations
      : [pkg?.package_translations]) as { title: string; language: string }[] | undefined;
    const title =
      translations?.find((x) => x?.language === 'ja')?.title ?? translations?.[0]?.title ?? '';

    const gt = (Array.isArray(guide.guide_translations)
      ? guide.guide_translations[0]
      : guide.guide_translations) as { name: string } | undefined;

    items.push({
      thread_id: null,
      package_id: packageId,
      package_title: title,
      partner_name: gt?.name ?? '',
      partner_avatar_url: null,
      last_message_body: null,
      last_message_at: null,
      unread_count: 0,
    });
  }

  // 直近のやり取り順。未会話（null）は末尾へ。
  return items.sort((a, b) => {
    if (a.last_message_at && b.last_message_at) {
      return a.last_message_at < b.last_message_at ? 1 : -1;
    }
    if (a.last_message_at) return -1;
    if (b.last_message_at) return 1;
    return 0;
  });
}
