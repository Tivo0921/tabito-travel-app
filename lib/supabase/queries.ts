import { createClient } from './client';
import type {
  Guide,
  Package,
  Spot,
  JapanesePhrase,
  Review,
  MannerCategory,
  MannerTip,
  MagazineArticle,
  CommunityRoute,
  Plan,
  PlanItem,
  Purchase,
  CreatorSpotInput,
} from '@/lib/types';

const DEFAULT_LANG = 'ja';

function minutesToDuration(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes >= 480) return `${Math.round(minutes / 480)}日`;
  if (minutes >= 240) return '半日';
  return `${minutes}分`;
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
      area: row.area,
      duration: minutesToDuration(row.duration_minutes),
      price: row.price,
      currency: row.currency,
      rating: Number(row.rating),
      review_count: row.review_count,
      spot_count: row.spot_count,
      category: row.category ?? '',
      tags: row.tags,
      features: row.features,
      tutorial_video_url: row.tutorial_video_url ?? undefined,
      created_at: row.created_at,
    } satisfies Package;
  });
}

export async function getPackageById(id: string, lang = DEFAULT_LANG): Promise<Package | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('packages')
    .select(`
      *,
      package_translations!inner(title, description, short_description),
      guides(
        id, location, languages, rating, review_count, avatar_url,
        guide_translations(name, bio)
      )
    `)
    .eq('id', id)
    .eq('package_translations.language', lang)
    .single();

  if (error || !data) {
    console.error('getPackageById error:', error);
    return null;
  }

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
    area: data.area,
    duration: minutesToDuration(data.duration_minutes),
    price: data.price,
    currency: data.currency,
    rating: Number(data.rating),
    review_count: data.review_count,
    spot_count: data.spot_count,
    category: data.category ?? '',
    tags: data.tags,
    features: data.features,
    tutorial_video_url: data.tutorial_video_url ?? undefined,
    created_at: data.created_at,
  } satisfies Package;
}

// ────────────────────────────────────────────────
// Spots
// ────────────────────────────────────────────────

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
    .single();

  if (error || !data) {
    console.error('getMannerCategoryById error:', error);
    return null;
  }

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
    .single();

  if (error || !data) {
    console.error('getMannerTipById error:', error);
    return null;
  }

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
        name: profile?.display_name ?? 'Anonymous',
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
    .single();

  if (error || !data) {
    console.error('getMagazineArticleById error:', error);
    return null;
  }

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
    .single();

  if (error || !data) {
    console.error('getCommunityRouteById error:', error);
    return null;
  }

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
      name: profile?.display_name ?? 'TABITOユーザー',
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
  const { data, error } = await supabase
    .from('plan_items')
    .select('*')
    .eq('plan_id', planId)
    .order('day', { ascending: true })
    .order('order', { ascending: true });

  if (error || !data) {
    console.error('getPlanItems error:', error);
    return [];
  }

  return data.map((row) => ({
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
  } satisfies PlanItem));
}

export async function addPlanItem(
  planId: string,
  day: number,
  item_type: PlanItem['item_type'],
  title: string,
  scheduled_time?: string,
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
  } satisfies PlanItem;
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
      area: row.area,
      duration: minutesToDuration(row.duration_minutes),
      price: row.price,
      currency: row.currency,
      rating: Number(row.rating),
      review_count: row.review_count,
      spot_count: row.spot_count,
      category: row.category ?? '',
      tags: row.tags,
      features: row.features,
      tutorial_video_url: row.tutorial_video_url ?? undefined,
      created_at: row.created_at,
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
  const { data } = await supabase
    .from('purchases')
    .select('id')
    .eq('package_id', packageId)
    .eq('status', 'completed')
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

  const { data, error } = await supabase
    .from('guides')
    .select('*, guide_translations(name, bio)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;

  const t = Array.isArray(data.guide_translations)
    ? data.guide_translations[0]
    : data.guide_translations;

  return {
    id: data.id,
    user_id: data.user_id ?? undefined,
    name: t?.name ?? '',
    bio: t?.bio ?? '',
    avatar_url: data.avatar_url ?? '',
    location: data.location,
    languages: data.languages,
    rating: Number(data.rating),
    review_count: data.review_count,
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
    console.error('registerAsGuide translation error:', transError);
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

export async function getMyCreatorPackages(): Promise<Package[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('packages')
    .select(`
      *,
      package_translations(title, description, short_description),
      guides!inner(id, user_id)
    `)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('getMyCreatorPackages error:', error);
    return [];
  }

  return data.map((row) => {
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
      area: row.area,
      duration: minutesToDuration(row.duration_minutes),
      price: row.price,
      currency: row.currency,
      rating: Number(row.rating),
      review_count: row.review_count,
      spot_count: row.spot_count,
      category: row.category ?? '',
      tags: row.tags ?? [],
      features: row.features ?? [],
      tutorial_video_url: row.tutorial_video_url ?? undefined,
      created_at: row.created_at,
      status: row.status,
    } as Package & { status: string };
  });
}

export async function createCreatorPackage(
  guideId: string,
  title: string,
  area: string,
  price: number,
  shortDescription: string,
  description: string,
  category: string,
  imageUrl: string,
  durationMinutes: number | null,
): Promise<string | null> {
  const supabase = createClient();

  const { data: pkg, error: pkgError } = await supabase
    .from('packages')
    .insert({
      guide_id: guideId,
      area,
      price,
      currency: 'JPY',
      category: category || null,
      image_url: imageUrl || null,
      duration_minutes: durationMinutes,
      status: 'draft',
      tags: [],
      features: [],
    })
    .select()
    .single();

  if (pkgError || !pkg) {
    console.error('createCreatorPackage error:', pkgError);
    return null;
  }

  await supabase.from('package_translations').insert({
    package_id: pkg.id,
    language: 'ja',
    title,
    short_description: shortDescription,
    description,
  });

  return pkg.id;
}

export async function updateCreatorPackage(
  packageId: string,
  title: string,
  area: string,
  price: number,
  shortDescription: string,
  description: string,
  category: string,
  imageUrl: string,
  durationMinutes: number | null,
): Promise<void> {
  const supabase = createClient();

  await supabase.from('packages').update({
    area,
    price,
    category: category || null,
    image_url: imageUrl || null,
    duration_minutes: durationMinutes,
  }).eq('id', packageId);

  await supabase.from('package_translations').upsert({
    package_id: packageId,
    language: 'ja',
    title,
    short_description: shortDescription,
    description,
  }, { onConflict: 'package_id,language' });
}

export async function setPackageStatus(
  packageId: string,
  status: 'draft' | 'published',
): Promise<void> {
  const supabase = createClient();
  await supabase.from('packages').update({ status }).eq('id', packageId);
}

export async function deleteCreatorPackage(packageId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('packages').delete().eq('id', packageId);
}

export async function getCreatorPackageWithSpots(
  packageId: string,
): Promise<{ pkg: (Package & { status: string }) | null; spots: Spot[] }> {
  const supabase = createClient();

  const [pkgResult, spotsResult] = await Promise.all([
    supabase
      .from('packages')
      .select(`*, package_translations(title, description, short_description)`)
      .eq('id', packageId)
      .single(),
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

  if (pkgResult.error || !pkgResult.data) return { pkg: null, spots: [] };

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
    area: row.area,
    duration: minutesToDuration(row.duration_minutes),
    price: row.price,
    currency: row.currency,
    rating: Number(row.rating),
    review_count: row.review_count,
    spot_count: row.spot_count,
    category: row.category ?? '',
    tags: row.tags ?? [],
    features: row.features ?? [],
    tutorial_video_url: row.tutorial_video_url ?? undefined,
    created_at: row.created_at,
    status: row.status,
  } as Package & { status: string };

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

  return { pkg, spots };
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

  await supabase.from('spot_translations').insert({
    spot_id: spot.id,
    language: 'ja',
    name: input.name,
    description: input.description,
    local_tips: input.local_tips.filter(Boolean),
    etiquette_tips: input.etiquette_tips.filter(Boolean),
  });

  for (let i = 0; i < input.phrases.length; i++) {
    const phrase = input.phrases[i];
    if (!phrase.japanese.trim()) continue;
    const { data: p } = await supabase
      .from('japanese_phrases')
      .insert({ spot_id: spot.id, japanese: phrase.japanese, reading: phrase.reading, order: i + 1 })
      .select()
      .single();
    if (p) {
      await supabase.from('japanese_phrase_translations').insert({
        phrase_id: p.id, language: 'ja', meaning: phrase.meaning, context: null,
      });
    }
  }

  await supabase.from('packages').update({ spot_count: order }).eq('id', packageId);

  return spot.id;
}

export async function updateCreatorSpot(
  spotId: string,
  packageId: string,
  input: CreatorSpotInput,
): Promise<void> {
  const supabase = createClient();

  await supabase.from('spots').update({
    image_url: input.image_url || null,
    video_url: input.video_url || null,
    duration_minutes: input.duration_minutes || null,
    map_url: input.map_url || null,
    shop_url: input.shop_url || null,
  }).eq('id', spotId);

  await supabase.from('spot_translations').upsert({
    spot_id: spotId,
    language: 'ja',
    name: input.name,
    description: input.description,
    local_tips: input.local_tips.filter(Boolean),
    etiquette_tips: input.etiquette_tips.filter(Boolean),
  }, { onConflict: 'spot_id,language' });

  // フレーズは削除してから再挿入
  const { data: oldPhrases } = await supabase
    .from('japanese_phrases')
    .select('id')
    .eq('spot_id', spotId);

  if (oldPhrases && oldPhrases.length > 0) {
    await supabase
      .from('japanese_phrases')
      .delete()
      .in('id', oldPhrases.map((p) => p.id));
  }

  for (let i = 0; i < input.phrases.length; i++) {
    const phrase = input.phrases[i];
    if (!phrase.japanese.trim()) continue;
    const { data: p } = await supabase
      .from('japanese_phrases')
      .insert({ spot_id: spotId, japanese: phrase.japanese, reading: phrase.reading, order: i + 1 })
      .select()
      .single();
    if (p) {
      await supabase.from('japanese_phrase_translations').insert({
        phrase_id: p.id, language: 'ja', meaning: phrase.meaning, context: null,
      });
    }
  }
  void packageId;
}

export async function deleteCreatorSpot(
  spotId: string,
  packageId: string,
): Promise<void> {
  const supabase = createClient();
  await supabase.from('spots').delete().eq('id', spotId);
  const { count } = await supabase
    .from('spots')
    .select('id', { count: 'exact', head: true })
    .eq('package_id', packageId);
  await supabase.from('packages').update({ spot_count: count ?? 0 }).eq('id', packageId);
}
