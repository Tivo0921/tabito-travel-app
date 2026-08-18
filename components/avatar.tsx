'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * 丸いアバター。画像が読めない時は頭文字にフォールバックする。
 *
 * 外部（Google等）のアバターURLは、退会・URL失効・ブラウザ拡張のブロックなどで
 * 普通に読み込みに失敗する。src の有無だけで分岐すると壊れた画像アイコンが出てしまう。
 */
export function Avatar({
  src,
  name,
  className,
  sizePx = 48,
}: {
  src: string | null | undefined;
  name: string;
  /** 大きさは呼び出し側で w-/h- を指定する */
  className?: string;
  /** next/image に渡す実ピクセル数 */
  sizePx?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden bg-[var(--primary-soft)] flex-shrink-0',
        className,
      )}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={name}
          width={sizePx}
          height={sizePx}
          // Googleのアバターは参照元によって拒否されることがある
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-semibold text-[var(--primary)]">
          {initial}
        </div>
      )}
    </div>
  );
}
