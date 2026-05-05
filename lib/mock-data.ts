// Mock data for TABITO MVP
// TODO: Replace with Supabase queries when backend is ready

import type {
  User,
  Guide,
  Package,
  Spot,
  Review,
  MannerCategory,
  MannerTip,
  MagazineArticle,
  CommunityRoute,
  JapanesePhrase,
} from './types';

export const currentUser: User = {
  id: 'user-1',
  name: 'Yoon',
  email: 'yoon@example.com',
  avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
  language: 'ja',
  created_at: '2024-01-15',
};

export const guides: Guide[] = [
  {
    id: 'guide-1',
    name: 'Mina Kim',
    bio: '東京在住5年のミナです。地元の人しか知らない隠れグルメやカフェをご紹介します！',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    location: '東京',
    languages: ['日本語', '英語'],
    rating: 4.9,
    review_count: 127,
  },
  {
    id: 'guide-2',
    name: 'Junho Park',
    bio: '大阪在住ガイドのジュノです。大阪の本物の味と文化をお伝えします。',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    location: '大阪',
    languages: ['日本語'],
    rating: 4.8,
    review_count: 89,
  },
  {
    id: 'guide-3',
    name: 'Soyeon Lee',
    bio: '京都で日本の伝統文化を学んでいます。京都の美しさを一緒に分かち合いましょう。',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
    location: '京都',
    languages: ['日本語', '英語'],
    rating: 4.9,
    review_count: 156,
  },
];

export const packages: Package[] = [
  {
    id: 'pkg-1',
    title: 'はじめての東京 - 1日ローカルガイド',
    description: '東京を初めて訪れる方のための完璧な1日コースです。渋谷・原宿・新宿の主要スポットを現地人の目線でご案内します。観光客トラップを避け、本物の東京を体験しましょう。',
    short_description: '東京初訪問者のための完璧な1日',
    image_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop',
    guide_id: 'guide-1',
    guide: guides[0],
    area: '東京',
    duration: '1日',
    price: 3000,
    currency: 'JPY',
    rating: 4.9,
    review_count: 127,
    spot_count: 6,
    category: '都市探検',
    tags: ['初訪問', '必須コース', '現地グルメ'],
    features: ['ショートガイド動画', '現地tips', 'マップリンク', '日本語会話', 'マナーガイド'],
    tutorial_video_url: 'https://example.com/tutorial-tokyo',
    created_at: '2024-01-01',
  },
  {
    id: 'pkg-2',
    title: '大阪グルメツアー',
    description: '大阪の本物の味を求めて！道頓堀から地元の人しか知らない隠れグルメまで、大阪の食を完璧に楽しむコースです。',
    short_description: '大阪の現地グルメを完全制覇',
    image_url: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&h=600&fit=crop',
    guide_id: 'guide-2',
    guide: guides[1],
    area: '大阪',
    duration: '半日',
    price: 2500,
    currency: 'JPY',
    rating: 4.8,
    review_count: 89,
    spot_count: 5,
    category: 'グルメ',
    tags: ['グルメ', 'ローカルフード', '道頓堀'],
    features: ['ショートガイド動画', '現地tips', 'マップリンク', '日本語会話'],
    created_at: '2024-01-05',
  },
  {
    id: 'pkg-3',
    title: '京都伝統文化体験',
    description: '千年の都・京都の美しい伝統を体験しましょう。祇園・清水寺・伏見稲荷まで、京都の精髄を詰め込んだコースです。',
    short_description: '京都の伝統と美しさに出会う',
    image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=600&fit=crop',
    guide_id: 'guide-3',
    guide: guides[2],
    area: '京都',
    duration: '1日',
    price: 4000,
    currency: 'JPY',
    rating: 4.9,
    review_count: 156,
    spot_count: 7,
    category: '文化',
    tags: ['伝統', '寺社', '着物'],
    features: ['ショートガイド動画', '現地tips', 'マップリンク', '日本語会話', 'マナーガイド'],
    tutorial_video_url: 'https://example.com/tutorial-kyoto',
    created_at: '2024-01-10',
  },
  {
    id: 'pkg-4',
    title: '渋谷 & 原宿トレンドツアー',
    description: '東京で最もトレンディなエリアを探検しましょう。最新ファッション・カフェ・隠れスポットを現地感覚でご案内します。',
    short_description: '東京トレンドの中心を歩く',
    image_url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&h=600&fit=crop',
    guide_id: 'guide-1',
    guide: guides[0],
    area: '東京',
    duration: '半日',
    price: 2000,
    currency: 'JPY',
    rating: 4.7,
    review_count: 73,
    spot_count: 5,
    category: 'ショッピング',
    tags: ['トレンド', 'ファッション', 'カフェ'],
    features: ['ショートガイド動画', '現地tips', 'マップリンク'],
    created_at: '2024-01-15',
  },
];

export const spots: Spot[] = [
  {
    id: 'spot-1',
    package_id: 'pkg-1',
    order: 1,
    name: '渋谷スクランブル交差点',
    description: '世界で最も有名な交差点から東京の旅をスタートしましょう。早朝に訪れると人が少なく、写真も撮りやすいです。',
    image_url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&h=600&fit=crop',
    video_url: 'https://example.com/video-shibuya',
    local_tips: [
      '朝8時前に訪れると空いています',
      'スターバックス2階から交差点の全景が見えます',
      'ハチ公像での写真撮影は必須！',
    ],
    japanese_phrases: [
      {
        japanese: 'すみません、写真を撮ってもらえますか？',
        reading: 'すみません、しゃしんをとってもらえますか？',
        meaning: '他の人に写真をお願いするときに使います',
        context: '写真撮影をお願いするとき',
      },
      {
        japanese: 'ここで写真を撮ってもいいですか？',
        reading: 'ここでしゃしんをとってもいいですか？',
        meaning: '撮影許可を求めるときに使います',
        context: '撮影許可を求めるとき',
      },
    ],
    etiquette_tips: [
      '交差点の中央で立ち止まって写真を撮らないでください',
      '歩行者信号を必ず守りましょう',
      '傘をさすときは他の人にぶつからないよう注意しましょう',
    ],
    map_url: 'https://maps.google.com/?q=Shibuya+Crossing',
    shop_url: 'https://www.shibuya109.jp',
    duration_minutes: 30,
  },
  {
    id: 'spot-2',
    package_id: 'pkg-1',
    order: 2,
    name: 'センター街の隠れグルメ',
    description: '地元の人が通う隠れラーメン店です。観光客の行列なしに、本物の東京ラーメンが味わえます。',
    image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=600&fit=crop',
    video_url: 'https://example.com/video-ramen',
    local_tips: [
      '券売機で注文してください',
      '麺の硬さやスープの濃さを選べます',
      '半熟卵のトッピングがおすすめ！',
    ],
    japanese_phrases: [
      {
        japanese: 'かためでお願いします',
        reading: 'かためでおねがいします',
        meaning: '麺を硬めにしてほしいときに使います',
        context: 'ラーメン注文時の麺の硬さリクエスト',
      },
      {
        japanese: 'おいしかったです',
        reading: 'おいしかったです',
        meaning: '食事後に感謝を伝える挨拶です',
        context: '食事後の挨拶',
      },
    ],
    etiquette_tips: [
      'ラーメンは音を立てて食べてもOK — むしろ礼儀！',
      'スープを残してもいいですが、麺は全部食べましょう',
      '食べ終わったら席を早めに空けましょう（回転率が大切）',
    ],
    map_url: 'https://maps.google.com/?q=Shibuya+Center+Street',
    duration_minutes: 45,
  },
  {
    id: 'spot-3',
    package_id: 'pkg-1',
    order: 3,
    name: '原宿竹下通り',
    description: '日本ユースカルチャーの中心地！個性的なファッション・かわいい雑貨・おいしいクレープまで、なんでもある通りです。',
    image_url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop',
    video_url: 'https://example.com/video-harajuku',
    local_tips: [
      '平日の午前中に訪れるとゆっくり見て回れます',
      'マリオンクレープは必食です',
      '路地裏に隠れたお店がたくさんあります',
    ],
    japanese_phrases: [
      {
        japanese: '試着してもいいですか？',
        reading: 'しちゃくしてもいいですか？',
        meaning: '服を試着したいときに使います',
        context: '洋服の試着をお願いするとき',
      },
      {
        japanese: 'これください',
        reading: 'これください',
        meaning: '商品を購入するときに使います',
        context: '商品を購入するとき',
      },
    ],
    etiquette_tips: [
      'お店の中で写真を撮る前に必ず許可を求めましょう',
      '食べ歩きはせず、一か所でいただきましょう',
      'ゴミはゴミ箱が見つかるまで持ち歩きましょう',
    ],
    map_url: 'https://maps.google.com/?q=Takeshita+Street',
    duration_minutes: 60,
  },
  {
    id: 'spot-4',
    package_id: 'pkg-1',
    order: 4,
    name: '明治神宮',
    description: '都会の中の静かな森、明治神宮で日本の精神を感じましょう。原宿駅のすぐ隣でアクセスも便利です。',
    image_url: 'https://images.unsplash.com/photo-1583766395091-2eb9994ed094?w=800&h=600&fit=crop',
    video_url: 'https://example.com/video-meiji',
    local_tips: [
      '鳥居をくぐるときは端を歩きましょう',
      '絵馬に願いを書いてみましょう',
      'おみくじも体験してみてください',
    ],
    japanese_phrases: [
      {
        japanese: 'お参りの仕方を教えてください',
        reading: 'おまいりのしかたをおしえてください',
        meaning: '参拝の順序を尋ねるときに使います',
        context: '神社参拝の方法を尋ねるとき',
      },
    ],
    etiquette_tips: [
      '神社入口の手水舎で手と口を清めましょう',
      '参拝の順序：二礼・二拍手・一礼',
      '撮影禁止エリアを確認しましょう',
    ],
    map_url: 'https://maps.google.com/?q=Meiji+Shrine',
    duration_minutes: 45,
  },
  {
    id: 'spot-5',
    package_id: 'pkg-1',
    order: 5,
    name: '新宿思い出横丁',
    description: '狭い路地に小さな居酒屋がひしめき合っています！地元のサラリーマンと一緒に焼き鳥とビールを楽しみましょう。',
    image_url: 'https://images.unsplash.com/photo-1554797589-7241bb691973?w=800&h=600&fit=crop',
    video_url: 'https://example.com/video-omoide',
    local_tips: [
      '夕方6時以降に雰囲気が盛り上がります',
      '席が狭いので小さめのカバンで来ましょう',
      '店主と目を合わせて「おまかせ」で注文してみましょう',
    ],
    japanese_phrases: [
      {
        japanese: 'おまかせでお願いします',
        reading: 'おまかせでおねがいします',
        meaning: '店主のおすすめに任せるときに使います',
        context: 'メニューを店主に任せるとき',
      },
      {
        japanese: 'とりあえずビール',
        reading: 'とりあえずびーる',
        meaning: '最初の飲み物としてビールを頼むときに使います',
        context: '最初の飲み物を注文するとき',
      },
    ],
    etiquette_tips: [
      'テーブルチャージ（お通し）がある場合があります — これは普通のことです',
      'タバコの煙が多い場合があります',
      '大声で騒がないようにしましょう',
    ],
    map_url: 'https://maps.google.com/?q=Omoide+Yokocho+Shinjuku',
    duration_minutes: 90,
  },
  {
    id: 'spot-6',
    package_id: 'pkg-1',
    order: 6,
    name: '新宿御苑',
    description: '1日の締めくくりは美しい庭園で。新宿のビル群の中にある平和なオアシスです。',
    image_url: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&h=600&fit=crop',
    local_tips: [
      '入場料500円です',
      '春は桜、秋は紅葉が美しいです',
      'ピクニックのお弁当を持参してもいいですね',
    ],
    japanese_phrases: [
      {
        japanese: '入場券をください',
        reading: 'にゅうじょうけんをください',
        meaning: '入場券を購入するときに使います',
        context: '入場券の購入',
      },
    ],
    etiquette_tips: [
      '飲酒と喫煙は禁止されています',
      'ドローン撮影禁止',
      '植物を折ったり触ったりしないでください',
    ],
    map_url: 'https://maps.google.com/?q=Shinjuku+Gyoen',
    duration_minutes: 60,
  },
];

export const reviews: Review[] = [
  {
    id: 'review-1',
    package_id: 'pkg-1',
    user_id: 'user-2',
    user: {
      id: 'user-2',
      name: 'Jihye',
      email: 'jihye@example.com',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop',
      language: 'ja',
      created_at: '2024-02-01',
    },
    rating: 5,
    comment: 'とても役に立ちました！地元の人しか知らないtipsが多くて、観光客トラップを避けられました。日本語会話もすぐに使えました。',
    created_at: '2024-03-15',
  },
  {
    id: 'review-2',
    package_id: 'pkg-1',
    user_id: 'user-3',
    user: {
      id: 'user-3',
      name: 'Minsu',
      email: 'minsu@example.com',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
      language: 'ja',
      created_at: '2024-02-10',
    },
    rating: 5,
    comment: 'マナーガイドがとても役立ちました。ラーメン屋でどうすればいいか事前に知っていたので自信がつきました！',
    created_at: '2024-03-20',
  },
];

export const mannerCategories: MannerCategory[] = [
  {
    id: 'manner-1',
    name: '空港',
    description: '日本の空港での基本マナー',
    icon: 'Plane',
    image_url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=300&fit=crop',
  },
  {
    id: 'manner-2',
    name: '飲食店',
    description: 'レストランで守るべきエチケット',
    icon: 'Utensils',
    image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
  },
  {
    id: 'manner-3',
    name: '公共交通',
    description: '電車・バス利用マナー',
    icon: 'Train',
    image_url: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=400&h=300&fit=crop',
  },
  {
    id: 'manner-4',
    name: '観光地',
    description: '神社・寺院・名所でのマナー',
    icon: 'Landmark',
    image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=300&fit=crop',
  },
  {
    id: 'manner-5',
    name: 'ショッピング',
    description: 'お店やコンビニ利用のtips',
    icon: 'ShoppingBag',
    image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
  },
  {
    id: 'manner-6',
    name: '宿泊',
    description: 'ホテル・旅館でのマナー',
    icon: 'Hotel',
    image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop',
  },
];

export const mannerTips: MannerTip[] = [
  {
    id: 'tip-1',
    category_id: 'manner-2',
    title: '食事前の挨拶',
    description: '日本では食事前に「いただきます」と言い、食事後には「ごちそうさまでした」と挨拶します。これは食べ物と作ってくれた方への感謝の表現です。',
    image_url: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=400&h=300&fit=crop',
    do_tips: [
      '食事前に「いただきます」と言う',
      'お箸をご飯に立てない',
      '麺類は音を立てて食べてもOK',
    ],
    dont_tips: [
      'お箸で食べ物を渡さない',
      '器を持って食べない（茶碗を除く）',
      'チップを渡さない（むしろ失礼）',
    ],
  },
  {
    id: 'tip-2',
    category_id: 'manner-3',
    title: '電車利用マナー',
    description: '日本の電車はとても静かです。電話での通話や大声での会話は控え、優先席付近ではスマートフォンをマナーモードにしましょう。',
    image_url: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=400&h=300&fit=crop',
    do_tips: [
      'スマートフォンはマナーモードに',
      '荷物は前に抱えるか棚の上に',
      '降りる人が先に降りてから乗車する',
    ],
    dont_tips: [
      '電話での通話をしない',
      '大声で話さない',
      '足を広げて座らない',
    ],
  },
  {
    id: 'tip-3',
    category_id: 'manner-4',
    title: '神社参拝の方法',
    description: '神社での正しい参拝の手順を知っておくと、より意味深い訪問になります。鳥居の前で軽くお辞儀をしてから始めましょう。',
    image_url: 'https://images.unsplash.com/photo-1583766395091-2eb9994ed094?w=400&h=300&fit=crop',
    do_tips: [
      '鳥居の前でお辞儀をする',
      '参道の端を歩く',
      '二礼二拍手一礼の順序を守る',
    ],
    dont_tips: [
      '参道の中央を歩かない（神の道）',
      '大声で騒がない',
      '撮影禁止エリアで写真を撮らない',
    ],
  },
];

export const magazineArticles: MagazineArticle[] = [
  {
    id: 'article-1',
    title: '東京の地元民おすすめ隠れカフェ5選',
    excerpt: '観光客には知られていない地元の隠れ家をご紹介します。',
    image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop',
    category: 'カフェ',
    read_time: 5,
    created_at: '2024-03-01',
  },
  {
    id: 'article-2',
    title: '日本コンビニ200%活用法',
    excerpt: 'コンビニで必ず買うべきアイテムと利用tipsを徹底まとめ。',
    image_url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=600&fit=crop',
    category: 'Tips',
    read_time: 7,
    created_at: '2024-03-05',
  },
  {
    id: 'article-3',
    title: '京都紅葉スポット完全ガイド',
    excerpt: '秋の京都の美しさをしっかり楽しむ方法。',
    image_url: 'https://images.unsplash.com/photo-1522623349500-de37a56ea2a5?w=800&h=600&fit=crop',
    category: '旅行',
    read_time: 8,
    created_at: '2024-03-10',
  },
];

export const communityRoutes: CommunityRoute[] = [
  {
    id: 'route-1',
    title: '東京ヴィンテージショップツアー',
    description: '下北沢と高円寺のヴィンテージショップを巡る1日コース',
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    author: currentUser,
    likes: 234,
    created_at: '2024-03-12',
  },
  {
    id: 'route-2',
    title: '大阪夜景スポット',
    description: '地元の人しか知らない大阪の夜景名所まとめ',
    image_url: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&h=600&fit=crop',
    author: {
      id: 'user-4',
      name: 'Hyejin',
      email: 'hyejin@example.com',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop',
      language: 'ja',
      created_at: '2024-01-20',
    },
    likes: 189,
    created_at: '2024-03-08',
  },
];

// Helper function to get package by ID
// TODO: Replace with Supabase query
export function getPackageById(id: string): Package | undefined {
  return packages.find(pkg => pkg.id === id);
}

// Helper function to get spots by package ID
// TODO: Replace with Supabase query
export function getSpotsByPackageId(packageId: string): Spot[] {
  return spots.filter(spot => spot.package_id === packageId).sort((a, b) => a.order - b.order);
}

// Helper function to get reviews by package ID
// TODO: Replace with Supabase query
export function getReviewsByPackageId(packageId: string): Review[] {
  return reviews.filter(review => review.package_id === packageId);
}

// Helper function to get manner tips by category ID
// TODO: Replace with Supabase query
export function getMannerTipsByCategoryId(categoryId: string): MannerTip[] {
  return mannerTips.filter(tip => tip.category_id === categoryId);
}
