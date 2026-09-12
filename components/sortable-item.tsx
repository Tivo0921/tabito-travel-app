'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 並べ替えできる行。
 *
 * ハンドル（GripVertical）だけをドラッグ起点にしている。行全体を
 * 起点にすると、パッケージブロックのリンクや削除ボタンが押せなくなる。
 *
 * dnd-kit は PointerSensor を使うのでタッチでも動く。モバイルが基準の
 * 画面なので、HTML5 の drag-and-drop（タッチで動かない）は使えない。
 */
export function SortableItem({
  id,
  children,
  handleLabel,
  disabled = false,
  disabledHint,
}: {
  id: string;
  children: React.ReactNode;
  handleLabel: string;
  /** パッケージ由来の行など、並べ替えさせたくないもの */
  disabled?: boolean;
  disabledHint?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative flex gap-2', isDragging && 'z-10 opacity-80')}
    >
      {disabled ? (
        // ハンドルの幅ぶんは空けておく。行頭が揃わないと崩れて見える
        <span
          title={disabledHint}
          aria-label={disabledHint}
          className="flex-shrink-0 self-start mt-3 p-1 w-6 h-6 flex items-center justify-center"
        >
          <Lock className="w-3.5 h-3.5 text-gray-200" />
        </span>
      ) : (
        <button
          {...attributes}
          {...listeners}
          aria-label={handleLabel}
          // touch-none が無いと、ドラッグ中にページごとスクロールしてしまう
          className="touch-none flex-shrink-0 self-start mt-3 p-1 text-gray-300 hover:text-[var(--text-sub)] cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
