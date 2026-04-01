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
  language: 'ko',
  created_at: '2024-01-15',
};

export const guides: Guide[] = [
  {
    id: 'guide-1',
    name: 'Mina Kim',
    bio: '도쿄에서 5년째 살고 있는 미나입니다. 현지인만 아는 숨은 맛집과 카페를 소개해드릴게요!',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    location: '도쿄',
    languages: ['한국어', '일본어', '영어'],
    rating: 4.9,
    review_count: 127,
  },
  {
    id: 'guide-2',
    name: 'Junho Park',
    bio: '오사카 현지 가이드 준호입니다. 오사카의 진짜 맛과 문화를 알려드릴게요.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    location: '오사카',
    languages: ['한국어', '일본어'],
    rating: 4.8,
    review_count: 89,
  },
  {
    id: 'guide-3',
    name: 'Soyeon Lee',
    bio: '교토에서 일본 전통 문화를 공부하고 있어요. 교토의 아름다움을 함께 나눠요.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
    location: '교토',
    languages: ['한국어', '일본어', '영어'],
    rating: 4.9,
    review_count: 156,
  },
];

export const packages: Package[] = [
  {
    id: 'pkg-1',
    title: '처음 도쿄 - 1일 로컬 가이드',
    description: '도쿄를 처음 방문하는 분들을 위한 완벽한 하루 코스입니다. 시부야, 하라주쿠, 신주쿠의 핵심 스팟을 현지인의 시선으로 안내해드립니다. 관광객 트랩을 피하고 진짜 도쿄를 경험하세요.',
    short_description: '도쿄 첫 방문자를 위한 완벽한 하루',
    image_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop',
    guide_id: 'guide-1',
    guide: guides[0],
    area: '도쿄',
    duration: '1일',
    price: 15000,
    currency: 'KRW',
    rating: 4.9,
    review_count: 127,
    spot_count: 6,
    category: '도시 탐험',
    tags: ['첫방문', '필수코스', '현지맛집'],
    features: ['짧은 가이드 영상', '현지 팁', '지도 링크', '일본어 회화', '매너 가이드'],
    tutorial_video_url: 'https://example.com/tutorial-tokyo',
    created_at: '2024-01-01',
  },
  {
    id: 'pkg-2',
    title: '오사카 먹방 투어',
    description: '오사카의 진짜 맛을 찾아서! 도톤보리부터 현지인만 아는 숨은 맛집까지, 오사카의 식도락을 완벽하게 즐기는 코스입니다.',
    short_description: '오사카 현지 맛집 완전 정복',
    image_url: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&h=600&fit=crop',
    guide_id: 'guide-2',
    guide: guides[1],
    area: '오사카',
    duration: '반나절',
    price: 12000,
    currency: 'KRW',
    rating: 4.8,
    review_count: 89,
    spot_count: 5,
    category: '맛집',
    tags: ['맛집', '로컬푸드', '도톤보리'],
    features: ['짧은 가이드 영상', '현지 팁', '지도 링크', '일본어 회화'],
    created_at: '2024-01-05',
  },
  {
    id: 'pkg-3',
    title: '교토 전통 문화 체험',
    description: '천년 고도 교토의 아름다운 전통을 체험하세요. 기온 거리, 청수사, 후시미 이나리까지 교토의 정수를 담은 코스입니다.',
    short_description: '교토의 전통과 아름다움을 만나다',
    image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=600&fit=crop',
    guide_id: 'guide-3',
    guide: guides[2],
    area: '교토',
    duration: '1일',
    price: 18000,
    currency: 'KRW',
    rating: 4.9,
    review_count: 156,
    spot_count: 7,
    category: '문화',
    tags: ['전통', '사찰', '기모노'],
    features: ['짧은 가이드 영상', '현지 팁', '지도 링크', '일본어 회화', '매너 가이드'],
    tutorial_video_url: 'https://example.com/tutorial-kyoto',
    created_at: '2024-01-10',
  },
  {
    id: 'pkg-4',
    title: '시부야 & 하라주쿠 트렌드 투어',
    description: '도쿄의 가장 트렌디한 지역을 탐험하세요. 최신 패션, 카페, 숨은 명소를 현지 감각으로 안내합니다.',
    short_description: '도쿄 트렌드의 중심을 걷다',
    image_url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&h=600&fit=crop',
    guide_id: 'guide-1',
    guide: guides[0],
    area: '도쿄',
    duration: '반나절',
    price: 10000,
    currency: 'KRW',
    rating: 4.7,
    review_count: 73,
    spot_count: 5,
    category: '쇼핑',
    tags: ['트렌드', '패션', '카페'],
    features: ['짧은 가이드 영상', '현지 팁', '지도 링크'],
    created_at: '2024-01-15',
  },
];

export const spots: Spot[] = [
  {
    id: 'spot-1',
    package_id: 'pkg-1',
    order: 1,
    name: '시부야 스크램블 교차로',
    description: '세계에서 가장 유명한 교차로에서 도쿄 여행을 시작하세요. 아침 일찍 방문하면 덜 붐비고 사진 찍기 좋아요.',
    image_url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&h=600&fit=crop',
    video_url: 'https://example.com/video-shibuya',
    local_tips: [
      '아침 8시 전에 방문하면 한적해요',
      '스타벅스 2층에서 교차로 전경을 볼 수 있어요',
      '하치코 동상에서 사진 찍는 건 필수!',
    ],
    japanese_phrases: [
      {
        japanese: 'すみません、写真を撮ってもらえますか？',
        reading: '스미마센, 샤신오 톳테모라에마스카?',
        korean: '실례합니다, 사진 찍어주실 수 있나요?',
        context: '다른 사람에게 사진 부탁할 때',
      },
      {
        japanese: 'ここで写真を撮ってもいいですか？',
        reading: '코코데 샤신오 톳테모 이이데스카?',
        korean: '여기서 사진 찍어도 되나요?',
        context: '촬영 허가를 구할 때',
      },
    ],
    etiquette_tips: [
      '교차로 중앙에서 멈춰서 사진을 찍지 마세요',
      '보행 신호를 꼭 지켜주세요',
      '우산을 쓸 때는 다른 사람에게 부딪히지 않게 조심하세요',
    ],
    map_url: 'https://maps.google.com/?q=Shibuya+Crossing',
    shop_url: 'https://www.shibuya109.jp',
    duration_minutes: 30,
  },
  {
    id: 'spot-2',
    package_id: 'pkg-1',
    order: 2,
    name: '센터가이 골목 맛집',
    description: '현지인들이 즐겨 찾는 숨은 라멘 맛집입니다. 관광객 줄 없이 진짜 도쿄 라멘을 맛볼 수 있어요.',
    image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=600&fit=crop',
    video_url: 'https://example.com/video-ramen',
    local_tips: [
      '티켓 자판기로 주문하세요',
      '면 굵기, 국물 진하기를 선택할 수 있어요',
      '반숙 계란 토핑 추천!',
    ],
    japanese_phrases: [
      {
        japanese: 'かためでお願いします',
        reading: '카타메데 오네가이시마스',
        korean: '면을 딱딱하게 해주세요',
        context: '라멘 주문시 면 굳기 요청',
      },
      {
        japanese: 'おいしかったです',
        reading: '오이시캇타데스',
        korean: '맛있었습니다',
        context: '식사 후 인사',
      },
    ],
    etiquette_tips: [
      '라멘은 소리 내어 먹어도 괜찮아요 - 오히려 예의!',
      '국물은 남겨도 되지만, 면은 다 먹는 게 좋아요',
      '먹고 난 후 빨리 자리를 비워주세요 (회전율이 중요)',
    ],
    map_url: 'https://maps.google.com/?q=Shibuya+Center+Street',
    duration_minutes: 45,
  },
  {
    id: 'spot-3',
    package_id: 'pkg-1',
    order: 3,
    name: '하라주쿠 타케시타 거리',
    description: '일본 유스 컬처의 중심지! 독특한 패션, 귀여운 소품, 맛있는 크레페까지 모든 것이 있는 거리입니다.',
    image_url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop',
    video_url: 'https://example.com/video-harajuku',
    local_tips: [
      '평일 오전에 방문하면 여유롭게 구경할 수 있어요',
      '마리온 크레페는 꼭 먹어보세요',
      '골목골목 숨은 가게들이 많아요',
    ],
    japanese_phrases: [
      {
        japanese: '試着してもいいですか？',
        reading: '시차쿠시테모 이이데스카?',
        korean: '입어봐도 될까요?',
        context: '옷 피팅 요청',
      },
      {
        japanese: 'これください',
        reading: '코레 쿠다사이',
        korean: '이거 주세요',
        context: '물건 구매할 때',
      },
    ],
    etiquette_tips: [
      '가게 안에서 사진 찍기 전에 꼭 허락을 구하세요',
      '길거리 음식은 걸으면서 먹지 말고 한 곳에서 드세요',
      '쓰레기는 쓰레기통이 나올 때까지 들고 다니세요',
    ],
    map_url: 'https://maps.google.com/?q=Takeshita+Street',
    duration_minutes: 60,
  },
  {
    id: 'spot-4',
    package_id: 'pkg-1',
    order: 4,
    name: '메이지 신궁',
    description: '도심 속 고요한 숲, 메이지 신궁에서 일본의 정신을 느껴보세요. 하라주쿠역 바로 옆에 있어 접근성도 좋습니다.',
    image_url: 'https://images.unsplash.com/photo-1583766395091-2eb9994ed094?w=800&h=600&fit=crop',
    video_url: 'https://example.com/video-meiji',
    local_tips: [
      '토리이(신사 문)를 지날 때는 가장자리로 걸으세요',
      '에마(소원 목패)에 소원을 적어보세요',
      '오미쿠지(운세)도 체험해보세요',
    ],
    japanese_phrases: [
      {
        japanese: 'お参りの仕方を教えてください',
        reading: '오마이리노 시카타오 오시에테쿠다사이',
        korean: '참배 방법을 알려주세요',
        context: '신사 참배 방법 문의',
      },
    ],
    etiquette_tips: [
      '신사 입구의 손 씻는 곳에서 손과 입을 정결히 하세요',
      '참배 순서: 2번 절, 2번 박수, 1번 절',
      '사진 촬영 금지 구역을 확인하세요',
    ],
    map_url: 'https://maps.google.com/?q=Meiji+Shrine',
    duration_minutes: 45,
  },
  {
    id: 'spot-5',
    package_id: 'pkg-1',
    order: 5,
    name: '신주쿠 오모이데 요코초',
    description: '좁은 골목에 작은 선술집들이 빼곡히! 현지 직장인들과 어울려 야키토리와 맥주를 즐기세요.',
    image_url: 'https://images.unsplash.com/photo-1554797589-7241bb691973?w=800&h=600&fit=crop',
    video_url: 'https://example.com/video-omoide',
    local_tips: [
      '저녁 6시 이후에 분위기가 살아나요',
      '자리가 좁으니 가방은 작게 들고 가세요',
      '주인장과 눈 맞추며 "오마카세"로 주문해보세요',
    ],
    japanese_phrases: [
      {
        japanese: 'おまかせでお願いします',
        reading: '오마카세데 오네가이시마스',
        korean: '알아서 해주세요 (추천 메뉴로)',
        context: '메뉴를 주인장에게 맡길 때',
      },
      {
        japanese: 'とりあえずビール',
        reading: '토리아에즈 비루',
        korean: '우선 맥주로요',
        context: '첫 음료 주문',
      },
    ],
    etiquette_tips: [
      '테이블 차지(오토시)가 있을 수 있어요 - 이건 정상이에요',
      '담배 연기가 많을 수 있어요',
      '큰 소리로 떠들지 않기',
    ],
    map_url: 'https://maps.google.com/?q=Omoide+Yokocho+Shinjuku',
    duration_minutes: 90,
  },
  {
    id: 'spot-6',
    package_id: 'pkg-1',
    order: 6,
    name: '신주쿠 교엔',
    description: '하루의 마무리는 아름다운 정원에서. 신주쿠의 빌딩 숲 속 평화로운 오아시스입니다.',
    image_url: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&h=600&fit=crop',
    local_tips: [
      '입장료 500엔이에요',
      '봄에는 벚꽃, 가을에는 단풍이 아름다워요',
      '피크닉 도시락을 준비해도 좋아요',
    ],
    japanese_phrases: [
      {
        japanese: '入場券をください',
        reading: '뉴조켄오 쿠다사이',
        korean: '입장권 주세요',
        context: '입장권 구매',
      },
    ],
    etiquette_tips: [
      '음주와 흡연이 금지되어 있어요',
      '드론 촬영 금지',
      '식물을 꺾거나 만지지 마세요',
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
      language: 'ko',
      created_at: '2024-02-01',
    },
    rating: 5,
    comment: '정말 유용했어요! 현지인만 아는 팁들이 많아서 관광객 함정을 피할 수 있었어요. 일본어 회화도 바로 써먹었습니다.',
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
      language: 'ko',
      created_at: '2024-02-10',
    },
    rating: 5,
    comment: '매너 가이드가 정말 도움이 많이 됐어요. 라멘집에서 어떻게 해야하는지 미리 알고 가니까 자신감이 생겼어요!',
    created_at: '2024-03-20',
  },
];

export const mannerCategories: MannerCategory[] = [
  {
    id: 'manner-1',
    name: '공항',
    description: '일본 공항에서의 기본 매너',
    icon: 'Plane',
    image_url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=300&fit=crop',
  },
  {
    id: 'manner-2',
    name: '음식점',
    description: '식당에서 지켜야 할 에티켓',
    icon: 'Utensils',
    image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
  },
  {
    id: 'manner-3',
    name: '대중교통',
    description: '전철, 버스 이용 매너',
    icon: 'Train',
    image_url: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=400&h=300&fit=crop',
  },
  {
    id: 'manner-4',
    name: '관광지',
    description: '신사, 사찰, 명소에서의 예절',
    icon: 'Landmark',
    image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=300&fit=crop',
  },
  {
    id: 'manner-5',
    name: '쇼핑',
    description: '가게와 편의점 이용 팁',
    icon: 'ShoppingBag',
    image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
  },
  {
    id: 'manner-6',
    name: '숙소',
    description: '호텔, 료칸에서의 매너',
    icon: 'Hotel',
    image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop',
  },
];

export const mannerTips: MannerTip[] = [
  {
    id: 'tip-1',
    category_id: 'manner-2',
    title: '식사 전 인사',
    description: '일본에서 식사 전에는 "이타다키마스"라고 말하고, 식사 후에는 "고치소사마데시타"라고 인사합니다. 이는 음식과 만든 분에 대한 감사의 표현입니다.',
    image_url: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=400&h=300&fit=crop',
    do_tips: [
      '식사 전 "이타다키마스" 말하기',
      '젓가락은 밥 위에 꽂지 않기',
      '국수는 소리 내어 먹어도 OK',
    ],
    dont_tips: [
      '젓가락으로 음식 전달하지 않기',
      '그릇을 들고 먹지 않기 (밥그릇 제외)',
      '팁 주지 않기 (오히려 실례)',
    ],
  },
  {
    id: 'tip-2',
    category_id: 'manner-3',
    title: '전철 이용 매너',
    description: '일본 전철은 매우 조용합니다. 전화 통화, 큰 소리로 대화하는 것을 삼가고, 우선석 근처에서는 휴대폰을 무음으로 설정하세요.',
    image_url: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=400&h=300&fit=crop',
    do_tips: [
      '휴대폰은 무음 모드로',
      '짐은 앞에 안거나 선반 위에',
      '내리는 사람 먼저 하차 후 승차',
    ],
    dont_tips: [
      '전화 통화하지 않기',
      '큰 소리로 대화하지 않기',
      '다리 벌려 앉지 않기',
    ],
  },
  {
    id: 'tip-3',
    category_id: 'manner-4',
    title: '신사 참배 방법',
    description: '신사에서의 올바른 참배 순서를 알아두면 더 의미 있는 방문이 됩니다. 토리이 앞에서 가볍게 목례하고 시작하세요.',
    image_url: 'https://images.unsplash.com/photo-1583766395091-2eb9994ed094?w=400&h=300&fit=crop',
    do_tips: [
      '토리이 앞에서 목례하기',
      '참도 가장자리로 걷기',
      '2례 2박수 1례 순서 지키기',
    ],
    dont_tips: [
      '참도 중앙으로 걷지 않기 (신의 길)',
      '큰 소리로 떠들지 않기',
      '촬영 금지 구역에서 사진 찍지 않기',
    ],
  },
];

export const magazineArticles: MagazineArticle[] = [
  {
    id: 'article-1',
    title: '도쿄 현지인이 추천하는 숨은 카페 5곳',
    excerpt: '관광객은 모르는 현지인들의 아지트를 소개합니다.',
    image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop',
    category: '카페',
    read_time: 5,
    created_at: '2024-03-01',
  },
  {
    id: 'article-2',
    title: '일본 편의점 200% 활용법',
    excerpt: '편의점에서 꼭 사야 할 아이템과 이용 팁을 총정리했습니다.',
    image_url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=600&fit=crop',
    category: '팁',
    read_time: 7,
    created_at: '2024-03-05',
  },
  {
    id: 'article-3',
    title: '교토 단풍 명소 완벽 가이드',
    excerpt: '가을 교토의 아름다움을 제대로 즐기는 방법.',
    image_url: 'https://images.unsplash.com/photo-1522623349500-de37a56ea2a5?w=800&h=600&fit=crop',
    category: '여행',
    read_time: 8,
    created_at: '2024-03-10',
  },
];

export const communityRoutes: CommunityRoute[] = [
  {
    id: 'route-1',
    title: '도쿄 빈티지 샵 투어',
    description: '시모키타자와와 코엔지의 빈티지 샵을 돌아보는 하루 코스',
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    author: currentUser,
    likes: 234,
    created_at: '2024-03-12',
  },
  {
    id: 'route-2',
    title: '오사카 야경 포인트',
    description: '현지인만 아는 오사카 야경 명소 모음',
    image_url: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&h=600&fit=crop',
    author: {
      id: 'user-4',
      name: 'Hyejin',
      email: 'hyejin@example.com',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop',
      language: 'ko',
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
