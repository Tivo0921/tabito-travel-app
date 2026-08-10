/**
 * 日本語辞書。これが全キーの正となる。
 * en/ko は `Record<TranslationKey, string>` 型なので、キーを足し忘れると tsc が落ちる。
 *
 * 埋め込み変数は {name} 形式で書く（例: '{count}件のガイド'）。
 */
export const ja = {
  // ナビゲーション
  'nav.home': 'ホーム',
  'nav.explore': '探索',
  'nav.plan': '計画',
  'nav.profile': 'プロフィール',
  'nav.settings': '設定',
  'nav.help': 'ヘルプ',

  // 共通
  'common.seeMore': 'もっと見る',
  'common.loading': '読み込み中...',
  'common.settings': '設定',
  'common.goHome': 'ホームへ',
  'common.readTime': '{min}分で読める',

  // ホーム
  'home.greeting': 'こんにちは！',
  'home.title': '日本旅行を、もっと深く',
  'home.searchPlaceholder': '都市、ガイド、キーワードで検索',
  'home.category.ai': 'AIおすすめ',
  'home.category.manner': 'マナーガイド',
  'home.category.magazine': 'マガジン',
  'home.category.saved': '保存済み',
  'home.section.packages': 'おすすめガイド',
  'home.section.packagesSub': '現地の先輩が厳選したコース',
  'home.section.magazine': 'マガジン',
  'home.section.magazineSub': '日本旅行のインサイト',
  'home.section.community': 'コミュニティルート',
  'home.section.communitySub': '旅行者がシェアしたコース',
  'home.likes': '{count} いいね',
  'home.manner.eyebrow': 'クイックマナーチェック',
  'home.manner.title': '日本旅行マナーガイド',
  'home.manner.desc': 'シーン別エチケットを事前にチェック',

  // 探索
  'explore.title': '探索',
  'explore.searchPlaceholder': 'ガイド、場所、キーワードで検索',
  'explore.tab.packages': 'ガイド',
  'explore.tab.magazine': 'マガジン',
  'explore.tab.community': 'コミュニティ',
  'explore.filter.area': 'エリア',
  'explore.filter.category': 'カテゴリ',
  'explore.filter.all': 'すべて',
  'explore.count.packages': '{count}件のガイド',
  'explore.count.articles': '{count}件の記事',
  'explore.count.routes': '{count}件のルート',
  'explore.empty.title': '検索結果がありません',
  'explore.empty.desc': '別のキーワードやフィルターをお試しください',

  // プロフィール
  'profile.title': 'プロフィール',
  'profile.guestUser': 'ゲストユーザー',
  'profile.pleaseLogin': 'ログインしてください',
  'profile.edit': '編集',
  'profile.stats.completed': '完了したガイド',
  'profile.stats.visited': '訪問した場所',
  'profile.stats.saved': '保存した項目',
  'profile.loginCta': 'ログインして機能をフル活用',
  'profile.tab.saved': '保存済み',
  'profile.tab.recent': '最近見た',
  'profile.empty.saved': '保存した項目がありません',
  'profile.empty.savedDesc': '気に入ったガイドを保存してみてください',
  'profile.empty.recent': '最近見た項目がありません',
  'profile.menu.creator': 'ガイド・クリエイター管理',
  'profile.logout': 'ログアウト',

  // 設定
  'settings.title': '設定',
  'settings.group.app': 'アプリ設定',
  'settings.group.support': 'サポート',
  'settings.group.account': 'アカウント',
  'settings.item.language': '言語設定',
  'settings.item.notifications': '通知設定',
  'settings.item.notificationsOn': 'オン',
  'settings.item.privacy': 'プライバシー設定',
  'settings.item.about': 'このアプリについて',
  'settings.item.terms': '利用規約',
  'settings.item.review': 'アプリを評価する',
  'settings.item.deleteAccount': 'アカウント削除',

  // チャット
  'chat.title': 'メッセージ',
  'chat.nav': 'メッセージ',
  'chat.askCreator': 'クリエイターに質問する',
  'chat.empty.title': 'メッセージはまだありません',
  'chat.empty.desc': 'ガイドを購入すると、作成したクリエイターに質問できます',
  'chat.inputPlaceholder': 'メッセージを入力',
  'chat.send': '送信',
  'chat.read': '既読',
  'chat.noMessages': 'まだメッセージがありません。気軽に質問してみましょう',
  'chat.threadNotFound': 'チャットが見つかりません',
  'chat.loadFailed': 'メッセージを送信できませんでした。通信状況を確認してもう一度お試しください',
  'chat.aboutPackage': '「{title}」について',
  'chat.readOnly': 'このチャットは終了しました。閲覧のみ可能です',
  'chat.startPrompt': 'メッセージを送ってみましょう',

  // 言語設定
  'language.title': '言語設定',
  'language.desc': 'アプリの表示言語を選んでください',
  'language.note': 'この設定はアプリの表示言語のみを変更します。ガイドや記事の本文は投稿された言語のまま表示されます。',
} as const;

export type TranslationKey = keyof typeof ja;
