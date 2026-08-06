import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * ロゴ画像は透明余白をトリム済みなので、指定した高さ＝実際の絵の高さになる。
 * 横型ロゴの中で「TABITO」の文字が占める高さは全体の約 36%。
 * 例: h-12(48px) → 文字高 約17px = 旧 text-2xl 太字とほぼ同じ見え方。
 */
const LOGO_SIZES = {
  sm: 'h-9',  // 36px / 文字高 約13px — ページ内ヘッダー
  md: 'h-12', // 48px / 文字高 約17px — 標準
  lg: 'h-16', // 64px / 文字高 約23px — エラー・メンテナンス画面
  xl: 'h-22', // 88px / 文字高 約31px — ログイン等のブランド見せ場
} as const;

const MARK_SIZES = {
  sm: 'w-12 h-12',    // 48px
  md: 'w-20 h-20',    // 80px
  lg: 'w-28 h-28',    // 112px
  xl: 'w-36 h-36',    // 144px
  '2xl': 'w-56 h-56', // 224px — オンボーディングの主役表示
} as const;

type LogoSize = keyof typeof LOGO_SIZES;
type MarkSize = keyof typeof MARK_SIZES;

/** アイコン + ワードマークの横型ロゴ */
export function Logo({
  size = 'md',
  variant = 'red',
  className,
  priority = false,
}: {
  size?: LogoSize;
  /** ダーク背景／モノクロ用に黒バージョンを使う */
  variant?: 'red' | 'black';
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={variant === 'black' ? '/brand/logo-black.png' : '/brand/logo-red.png'}
      alt="TABITO"
      width={900}
      height={310}
      priority={priority}
      className={cn('w-auto object-contain', LOGO_SIZES[size], className)}
    />
  );
}

/**
 * アイコンのみ（角丸の赤いアプリアイコン）。
 * 角丸は画像の透過部分に焼き込み済みなので CSS では丸めない（小サイズで角が削れるため）。
 * 影を付けたい場合は形に沿う drop-shadow-* を className で渡すこと。
 */
export function LogoMark({
  size = 'md',
  className,
  priority = false,
}: {
  size?: MarkSize;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/mark.png"
      alt="TABITO"
      width={768}
      height={768}
      priority={priority}
      className={cn('object-contain', MARK_SIZES[size], className)}
    />
  );
}
