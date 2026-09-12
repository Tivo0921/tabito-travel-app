'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus,
  Calendar,
  MapPin,
  Package as PackageIcon,
  ListPlus,
  Sparkles,
  ChevronRight,
  Clock,
  Info,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  StickyNote,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  ArrowUpDown,
  Pencil,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { cn } from '@/lib/utils';
import { CTAButton } from '@/components/cta-button';
import {
  getMyPlans,
  createPlan,
  deletePlan,
  getPlanItems,
  addPlanItem,
  insertPlanItemAt,
  reorderPlanItems,
  applyPlanSchedule,
  updatePlanItem,
  deletePlanItem,
  getPurchasedPackagesForPlan,
  addPlanPackage,
  expandPackageIntoPlan,
  collapsePackageInPlan,
} from '@/lib/supabase/queries';
import type { Plan, PlanItem, PlanItemPackage } from '@/lib/types';
import { useT } from '@/lib/i18n/provider';
import { formatDuration } from '@/lib/i18n/format';
import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';

const ITEM_TYPES: { value: PlanItem['item_type']; labelKey: TranslationKey; icon: string }[] = [
  { value: 'spot', labelKey: 'plan.itemType.spot', icon: '📍' },
  { value: 'meal', labelKey: 'plan.itemType.meal', icon: '🍜' },
  { value: 'transport', labelKey: 'plan.itemType.transport', icon: '✈️' },
  { value: 'manner', labelKey: 'plan.itemType.manner', icon: '📝' },
  { value: 'lodging', labelKey: 'plan.itemType.lodging', icon: '🏨' },
  { value: 'shopping', labelKey: 'plan.itemType.shopping', icon: '🛍️' },
  { value: 'activity', labelKey: 'plan.itemType.activity', icon: '🎨' },
  { value: 'other', labelKey: 'plan.itemType.other', icon: '📌' },
];

/**
 * 開始時刻と所要時間から「10:00 – 11:00」を作る。
 * 所要時間が無ければ開始時刻だけ返す（勝手に終了時刻を作らない）。
 * 日をまたぐ場合も素直に翌日の時刻を出す。
 */
/** 助言の1区画。項目が無ければ何も描かない（空の見出しを出さない）#52 */
function AdviceSection({
  items,
  label,
  icon,
  tone,
}: {
  items: string[];
  label: string;
  icon: React.ReactNode;
  tone: 'warn' | 'primary' | 'muted';
}) {
  if (!items || items.length === 0) return null;

  const color =
    tone === 'warn' ? 'text-amber-600'
    : tone === 'primary' ? 'text-[var(--primary)]'
    : 'text-[var(--text-sub)]';

  return (
    <div className="p-4 bg-white rounded-xl">
      <div className={cn('flex items-center gap-1.5 mb-2', color)}>
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((line, i) => (
          <li key={i} className="text-sm text-[var(--text-main)] leading-relaxed flex gap-2">
            <span className={cn('flex-shrink-0', color)}>•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** /api/plan/advise の応答。平文ではなく形を固定して受け取る #52 */
type PlanAdvice = {
  concerns: string[];
  suggestions: string[];
  checks: string[];
  schedule: { day: number; itemIds: string[]; times: string[]; reason: string } | null;
};

function timeRange(scheduled: string | null, durationMinutes: number | null): string | null {
  if (!scheduled) return null;
  const start = scheduled.slice(0, 5);
  if (!durationMinutes) return start;
  const [h, m] = scheduled.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return start;
  const end = (h * 60 + m + durationMinutes) % (24 * 60);
  const endStr = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  return `${start} – ${endStr}`;
}

function typeIcon(type: string) {
  return ITEM_TYPES.find((t) => t.value === type)?.icon ?? '📍';
}

/**
 * タイトルを直してよい行か。
 *
 * パッケージ由来の行の名前を変えると、パッケージの中身を見たときと
 * 食い違う。順番を固定しているのと同じ理由で、名前も固定する。
 */
function canEditTitle(item: PlanItem): boolean {
  return item.source !== 'package' && item.item_type !== 'package';
}

function getDayCount(plan: Plan): number {
  if (!plan.start_date || !plan.end_date) return 1;
  const ms = new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

/**
 * 計画に置いたパッケージ1件。
 * 計画側はメタな並び（いつ・どの順で）だけを扱い、
 * 現地での詳細な体験はパッケージの中にあるので、そこへ入れるようにする。
 */
function PackageBlock({
  item,
  t,
  onExpand,
  expanding,
}: {
  item: PlanItem;
  t: ReturnType<typeof useT>;
  onExpand: () => void;
  expanding: boolean;
}) {
  const pkg = item.package;

  // pkg が無い理由は2つあり、ユーザーにとって意味が違う。
  //
  //   package_id IS NULL … パッケージ自体が削除された（ON DELETE SET NULL）。
  //                        タイトルだけが行に残る。もう戻らない
  //   package_id あり     … 行は生きているが JOIN が空。クリエイターが
  //                        下書きに戻した等で今は参照できないだけで、
  //                        再公開されれば戻る
  //
  // 後者に「削除されました」と出すと、消えていないものを消えたと言うことになる。
  if (!pkg) {
    const deleted = item.package_id === null;
    return (
      <div>
        <p className={cn(
          'font-medium text-[var(--muted)]',
          deleted && 'line-through',
        )}>
          {item.title}
        </p>
        <p className="text-xs text-[var(--muted)]">
          {t(deleted ? 'plan.package.removed' : 'plan.package.unavailable')}
        </p>
      </div>
    );
  }

  return (
    <Link href={`/package/${pkg.id}`} className="block group">
      <div className="flex gap-3">
        {pkg.image_url && (
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
            <Image src={pkg.image_url} alt="" fill className="object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors truncate">
            {pkg.title || item.title}
          </p>
          <p className="text-xs text-[var(--text-sub)] truncate">
            {[pkg.area, pkg.guide_name].filter(Boolean).join(' ・ ')}
          </p>
          <p className="text-xs text-[var(--primary)] font-medium flex items-center gap-0.5 mt-0.5">
            {t('plan.package.spots', { count: pkg.spot_count })}
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>
      </div>
    </Link>
  );
}

/** ブロックを各スポットの行に展開するボタン。#16 段階1 */
function ExpandPackageButton({
  onExpand,
  expanding,
  t,
}: {
  onExpand: () => void;
  expanding: boolean;
  t: ReturnType<typeof useT>;
}) {
  return (
    <button
      onClick={onExpand}
      disabled={expanding}
      className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-[var(--border)] rounded-lg text-xs text-[var(--text-sub)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
    >
      <ListPlus className="w-3.5 h-3.5" />
      {t(expanding ? 'plan.package.expanding' : 'plan.package.expand')}
    </button>
  );
}

export default function PlanPage() {
  const t = useT();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [activeDay, setActiveDay] = useState(1);
  const [aiPrompt, setAiPrompt] = useState('');
  // AI に今の行程を見てもらう #16
  const [advice, setAdvice] = useState<PlanAdvice | null>(null);
  const [applyingReorder, setApplyingReorder] = useState(false);
  // 提案を適用したあとの控えめな確認表示
  const [reorderApplied, setReorderApplied] = useState(false);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const [askingAi, setAskingAi] = useState(false);
  const [aiError, setAiError] = useState<'empty' | 'rate' | 'unavailable' | 'failed' | null>(null);

  // 新規プランモーダル（2ステップ）
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);

  // アイテム追加モーダル
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState<PlanItem['item_type']>('spot');
  const [newItemTime, setNewItemTime] = useState('');
  const [newItemDuration, setNewItemDuration] = useState('');
  // どこに挿し込むか。null = 末尾
  const [newItemNote, setNewItemNote] = useState('');
  const [insertAt, setInsertAt] = useState<number | null>(null);
  // 既存アイテムのメモ編集
  // 予定の編集。メモだけでなくタイトル・時刻・所要時間も直せる #16
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', time: '', duration: '', note: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFailed, setEditFailed] = useState(false);
  const [reorderError, setReorderError] = useState(false);
  const [splitWarning, setSplitWarning] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  // 購入済みパッケージをブロックとして置く #16
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [purchased, setPurchased] = useState<PlanItemPackage[]>([]);
  const [loadingPurchased, setLoadingPurchased] = useState(false);
  const [addingPackageId, setAddingPackageId] = useState<string | null>(null);
  const [packageError, setPackageError] = useState<'duplicate' | 'failed' | null>(null);

  // パッケージを行程に展開する #16 段階1
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [expandError, setExpandError] = useState<'no-spots' | 'failed' | null>(null);

  useEffect(() => {
    getMyPlans().then((data) => {
      setPlans(data);
      if (data.length > 0 && !selectedPlanId) {
        setSelectedPlanId(data[0].id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      getPlanItems(selectedPlanId).then(setPlanItems);
      setActiveDay(1);
    }
  }, [selectedPlanId]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const dayCount = selectedPlan ? getDayCount(selectedPlan) : 1;
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);
  const itemsForDay = planItems.filter((item) => item.day === activeDay)
    .sort((a, b) => a.order - b.order);

  /**
   * その日の最後の予定の「開始時刻 + 所要時間」を次の開始時刻として返す。
   * 時刻が1つも入っていない日は未指定のままにする（勝手に9:00などを
   * 置くと、ユーザーが決めた予定のように見えてしまう）。
   */
  const suggestedTime = (): string | undefined => {
    // itemsForDay は order 順。並べ替えると order 上の最後が
    // 時刻上の最後とは限らないので、終了時刻が最も遅いものを探す。
    let latestEnd = -1;
    for (const i of itemsForDay) {
      if (!i.scheduled_time) continue;
      const [hh, mm] = i.scheduled_time.split(':').map(Number);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue;
      const end = hh * 60 + mm + (i.duration_minutes ?? 0);
      if (end > latestEnd) latestEnd = end;
    }
    if (latestEnd < 0) return undefined;

    const total = latestEnd;
    // 日をまたぐ場合は提案しない。翌日の予定として置くべきなので、
    // 24:30 のような値を作らない
    if (total >= 24 * 60) return undefined;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const openNewPlanModal = () => {
    setWizardStep(1);
    setNewTitle('');
    setNewLocation('');
    setNewStart('');
    setNewEnd('');
    setCreateError(false);
    setShowNewPlan(true);
  };

  const handleCreatePlan = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    setCreateError(false);
    const plan = await createPlan(newTitle, newLocation, newStart, newEnd);
    if (plan) {
      setPlans((prev) => [plan, ...prev]);
      setSelectedPlanId(plan.id);
      setPlanItems([]);
      setShowNewPlan(false);
    } else {
      // 失敗してもモーダルを閉じていたため、何も起きていないのに
      // 成功したように見えていた。ログイン切れでも同じ見え方になる。
      // 閉じずに理由を出し、入力も捨てない
      setCreateError(true);
    }
    setCreating(false);
  };

  const handleDeletePlan = async (planId: string) => {
    await deletePlan(planId);
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    if (selectedPlanId === planId) {
      const remaining = plans.filter((p) => p.id !== planId);
      setSelectedPlanId(remaining.length > 0 ? remaining[0].id : null);
      setPlanItems([]);
    }
  };

  const handleAddItem = async () => {
    if (!selectedPlanId || !newItemTitle.trim()) return;
    setAddingItem(true);

    const duration = newItemDuration ? parseInt(newItemDuration, 10) : null;
    const position = insertAt ?? itemsForDay.length;

    const item = insertAt === null
      ? await addPlanItem(
          selectedPlanId, activeDay, newItemType, newItemTitle,
          newItemTime || undefined, duration, newItemNote,
        )
      : await insertPlanItemAt(
          selectedPlanId, activeDay, position, newItemType, newItemTitle,
          newItemTime || undefined, duration, newItemNote,
        );

    if (item) {
      // 挿し込んだ位置に置いてから、その日を 1..N に振り直す
      const next = [...itemsForDay];
      next.splice(position, 0, item);
      const renumbered = next.map((it, i) => ({ ...it, order: i + 1 }));
      setPlanItems((prev) => [
        ...prev.filter((i) => !(i.day === activeDay)),
        ...renumbered,
      ]);
      if (insertAt !== null) {
        const ok = await reorderPlanItems(renumbered.map((i) => i.id));
        if (!ok) {
          // 並び順だけDBと食い違うので、次回の読み込みで直る。
          // 黙って放置せず伝える
          setReorderError(true);
        }
      }
    }

    setNewItemTitle('');
    setNewItemType('spot');
    setNewItemTime('');
    setNewItemDuration('');
    setNewItemNote('');
    setInsertAt(null);
    setShowAddItem(false);
    setAddingItem(false);
  };

  /** 編集パネルを今の値で開く */
  const openEditor = (item: PlanItem) => {
    setEditFailed(false);
    setEditDraft({
      title: item.title,
      time: item.scheduled_time?.slice(0, 5) ?? '',
      duration: item.duration_minutes != null ? String(item.duration_minutes) : '',
      note: item.note ?? '',
    });
    setEditingId(item.id);
  };

  const handleSaveEdit = async (item: PlanItem) => {
    const title = editDraft.title.trim();
    // タイトルは NOT NULL。空のまま保存させると行が名無しになる
    if (canEditTitle(item) && title === '') {
      setEditFailed(true);
      return;
    }

    const durationRaw = editDraft.duration.trim();
    const duration = durationRaw === '' ? null : Number(durationRaw);
    if (duration !== null && (!Number.isFinite(duration) || duration < 0)) {
      setEditFailed(true);
      return;
    }

    setSavingEdit(true);
    setEditFailed(false);

    const note = editDraft.note.trim() || null;
    const scheduled_time = editDraft.time ? `${editDraft.time}:00` : null;
    const ok = await updatePlanItem(item.id, {
      // パッケージ由来のタイトルはパッケージの中身と揃えたいので送らない
      ...(canEditTitle(item) ? { title } : {}),
      scheduled_time,
      duration_minutes: duration,
      note,
    });

    if (ok) {
      setPlanItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                ...(canEditTitle(item) ? { title } : {}),
                scheduled_time,
                duration_minutes: duration,
                note,
              }
            : i,
        ),
      );
      setEditingId(null);
    } else {
      setEditFailed(true);
    }
    setSavingEdit(false);
  };

  const handleCollapsePackage = async (packageId: string, title: string) => {
    if (!selectedPlanId) return;

    // 畳むと展開行は削除され、ブロックが引き継ぐのは先頭の開始時刻と
    // 所要時間の合計だけ。メモや時刻の調整は失われる。
    // 展開したままの行なら黙って畳んでよいが、手を入れていたら確認する。
    // 常に確認すると、素直に畳みたいときに邪魔になる。
    const rows = itemsForDay.filter(
      (i) => i.package_id === packageId && i.source === 'package' && i.item_type !== 'package',
    );
    const edited = rows.some((i) => i.note);
    if (edited && !confirm(t('plan.package.collapseConfirm'))) return;

    setExpandingId(packageId);
    setExpandError(null);
    const block = await collapsePackageInPlan(selectedPlanId, packageId, title);
    if (block) {
      const rest = itemsForDay.filter(
        (i) => !(i.package_id === packageId && i.source === 'package' && i.item_type !== 'package'),
      );
      const insertPos = rest.findIndex((i) => i.order > block.order);
      const merged = insertPos < 0
        ? [...rest, block]
        : [...rest.slice(0, insertPos), block, ...rest.slice(insertPos)];
      const renumbered = merged.map((it, i) => ({ ...it, order: i + 1 }));

      setPlanItems((prev) => [...prev.filter((i) => i.day !== block.day), ...renumbered]);
      const ok = await reorderPlanItems(renumbered.map((i) => i.id));
      if (!ok) setReorderError(true);
    } else {
      setExpandError('failed');
    }
    setExpandingId(null);
  };

  // ドラッグで並べ替える。dnd-kit の PointerSensor はタッチでも動く
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 軽く触れただけで並べ替えが始まらないようにする。
      // リンクや削除ボタンのタップを奪わない
      activationConstraint: { distance: 6 },
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = itemsForDay.findIndex((i) => i.id === active.id);
    const newIndex = itemsForDay.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const moved = arrayMove(itemsForDay, oldIndex, newIndex).map((it, i) => ({ ...it, order: i + 1 }));

    // 同じパッケージ由来の行は連続していなければならない。
    // 間に別の予定が割り込むと、パッケージの中身を見たときの順番と
    // 食い違って見える
    const runs = new Map<string, number[]>();
    moved.forEach((it, i) => {
      if (it.source !== 'package' || !it.package_id) return;
      if (!runs.has(it.package_id)) runs.set(it.package_id, []);
      runs.get(it.package_id)!.push(i);
    });
    const splits = [...runs.values()].some(
      (idx) => idx[idx.length - 1] - idx[0] !== idx.length - 1,
    );
    if (splits) {
      setReorderError(false);
      setSplitWarning(true);
      return;
    }
    setSplitWarning(false);
    // 先に画面を動かす。往復を待たせるとドラッグの手応えが無くなる
    setPlanItems((prev) => [...prev.filter((i) => i.day !== activeDay), ...moved]);
    setReorderError(false);

    const ok = await reorderPlanItems(moved.map((i) => i.id));
    if (!ok) setReorderError(true);
  };

  const openAddPackage = async () => {
    setPackageError(null);
    setShowAddPackage(true);
    setLoadingPurchased(true);
    setPurchased(await getPurchasedPackagesForPlan());
    setLoadingPurchased(false);
  };

  const handleAddPackage = async (pkg: PlanItemPackage) => {
    if (!selectedPlanId) return;
    setAddingPackageId(pkg.id);
    setPackageError(null);
    const result = await addPlanPackage(selectedPlanId, activeDay, pkg, suggestedTime());
    if (result.ok) {
      setPlanItems((prev) => [...prev, result.item]);
      setShowAddPackage(false);
    } else {
      // 理由は DB が返したもの。手元の planItems から推測しない
      // （別タブで追加されていると手元が古く、誤った文言になる）
      setPackageError(result.reason === 'duplicate' ? 'duplicate' : 'failed');
    }
    setAddingPackageId(null);
  };

  const handleExpandPackage = async (item: PlanItem) => {
    setExpandingId(item.id);
    setExpandError(null);
    const result = await expandPackageIntoPlan(item);
    if (result.ok) {
      // 展開はブロックの order から連番で詰めるので、後続アイテムと
      // order がぶつかる。その日を 1..N に振り直して並びを確定させる
      const rest = itemsForDay.filter((i) => i.id !== item.id);
      const insertPos = rest.findIndex((i) => i.order > item.order);
      const merged = insertPos < 0
        ? [...rest, ...result.items]
        : [...rest.slice(0, insertPos), ...result.items, ...rest.slice(insertPos)];
      const renumbered = merged.map((it, i) => ({ ...it, order: i + 1 }));

      setPlanItems((prev) => [...prev.filter((i) => i.day !== item.day), ...renumbered]);
      const ok = await reorderPlanItems(renumbered.map((i) => i.id));
      if (!ok) setReorderError(true);
    } else {
      setExpandError(result.reason === 'no-spots' ? 'no-spots' : 'failed');
    }
    setExpandingId(null);
  };

  const handleAskAi = async () => {
    if (!selectedPlanId) return;
    setAskingAi(true);
    setAiError(null);
    setAdvice(null);
    try {
      const res = await fetch('/api/plan/advise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlanId, question: aiPrompt.trim() }),
      });
      if (res.status === 400) { setAiError('empty'); return; }
      if (res.status === 429) { setAiError('rate'); return; }
      if (res.status === 503) { setAiError('unavailable'); return; }
      if (!res.ok) { setAiError('failed'); return; }
      const data = (await res.json()) as PlanAdvice;
      const hasContent =
        data.concerns?.length || data.suggestions?.length || data.checks?.length || data.schedule;
      if (hasContent) setAdvice(data);
      else setAiError('failed');
    } catch {
      setAiError('failed');
    } finally {
      setAskingAi(false);
    }
  };

  const handleApplySchedule = async () => {
    if (!advice?.schedule) return;
    const { day, itemIds, times } = advice.schedule;
    setApplyingReorder(true);

    // 提案どおりに並べ替え、時刻も入れる。サーバ側で「IDの過不足が無い」
    //「パッケージの塊が分断されていない」「時刻が巻き戻らない」を
    // 検証済みなので、ここでは当てはめるだけ
    const byId = new Map(planItems.map((i) => [i.id, i]));
    const applied = itemIds
      .map((id, idx) => {
        const it = byId.get(id);
        if (!it) return null;
        return {
          ...it,
          order: idx + 1,
          scheduled_time: times[idx] ? `${times[idx]}:00` : null,
        };
      })
      .filter((i): i is PlanItem => Boolean(i));

    setPlanItems((prev) => [...prev.filter((i) => i.day !== day), ...applied]);
    const ok = await applyPlanSchedule(
      applied.map((i) => i.id),
      // DBに渡すのは "HH:MM"。空文字は「時刻なし」として扱われる
      applied.map((i) => i.scheduled_time?.slice(0, 5) ?? ''),
    );
    if (!ok) setReorderError(true);
    // 適用済みの提案は消す。残すと何度も押せてしまう
    setAdvice((prev) => (prev ? { ...prev, schedule: null } : prev));
    setReorderApplied(true);
    setApplyingReorder(false);
  };

  /** 前の質問を残して聞き直す。会話は保持していないので、毎回行程ごと送り直す */
  const handleAskAgain = () => {
    setAdvice(null);
    setAiError(null);
    setReorderApplied(false);
    aiInputRef.current?.focus();
  };

  /** 話題を変える。前の質問文も消す */
  const handleNewTopic = () => {
    setAdvice(null);
    setAiError(null);
    setReorderApplied(false);
    setAiPrompt('');
    aiInputRef.current?.focus();
  };

  const handleDeleteItem = async (itemId: string) => {
    await deletePlanItem(itemId);
    setPlanItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 lg:pt-10">
        <div className="flex items-center justify-between mb-2 lg:max-w-4xl">
          <h1 className="text-2xl font-bold text-[var(--text-main)] lg:text-3xl">{t('plan.title')}</h1>
          <button
            onClick={openNewPlanModal}
            className="p-2 bg-[var(--primary-soft)] rounded-full"
          >
            <Plus className="w-5 h-5 text-[var(--primary)]" />
          </button>
        </div>
        <p className="text-[var(--text-sub)]">{t('plan.subtitle')}</p>
      </header>

      {/* AI Prompt Box */}
      <div className="px-5 mb-6">
        {/* PCでは横いっぱいに伸ばさず、ヘッダーや計画一覧と同じ幅で揃える */}
        <div className="p-4 bg-gradient-to-r from-[var(--primary-soft)] to-[var(--accent)]/30 rounded-2xl lg:max-w-4xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
            <span className="font-semibold text-[var(--text-main)]">{t('plan.ai.title')}</span>
          </div>
          <div className="flex gap-2">
            <input
              ref={aiInputRef}
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={t('plan.ai.placeholder')}
              className="flex-1 px-4 py-3 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <button
              onClick={handleAskAi}
              disabled={!selectedPlanId || askingAi}
              aria-label={t('plan.ai.send')}
              className="p-3 bg-[var(--primary)] rounded-xl hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
            >
              {askingAi
                ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                : <Send className="w-5 h-5 text-white" />}
            </button>
          </div>

          {/* 行程を書き換えず、読み物として出す。手で組んだ予定を
              AI が黙って上書きするのは避ける #16 */}
          {advice && (
            <div className="mt-3 space-y-2">
              {/* 平文をそのまま流すと見出しや記号がモデル任せになる。
                  形を固定して、こちらで整形する #52 */}
              <AdviceSection
                items={advice.concerns}
                label={t('plan.ai.concerns')}
                icon={<AlertTriangle className="w-4 h-4" />}
                tone="warn"
              />
              <AdviceSection
                items={advice.suggestions}
                label={t('plan.ai.suggestions')}
                icon={<Lightbulb className="w-4 h-4" />}
                tone="primary"
              />
              <AdviceSection
                items={advice.checks}
                label={t('plan.ai.checks')}
                icon={<CheckCircle2 className="w-4 h-4" />}
                tone="muted"
              />

              {advice.schedule && (
                <div className="p-4 bg-white rounded-xl border border-[var(--primary)]/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ArrowUpDown className="w-4 h-4 text-[var(--primary)]" />
                    <span className="text-xs font-semibold text-[var(--primary)]">
                      {t('plan.ai.scheduleTitle', { day: advice.schedule.day })}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-main)] mb-3">{advice.schedule.reason}</p>

                  {/* 適用前に何がどう変わるか見せる。承認してから書き換える。
                      時刻が変わる行は、今の時刻と並べて出す */}
                  <ol className="space-y-1">
                    {advice.schedule.itemIds.map((id, i) => {
                      const it = planItems.find((x) => x.id === id);
                      if (!it) return null;
                      const now = it.scheduled_time?.slice(0, 5) ?? '';
                      const next = advice.schedule!.times[i] ?? '';
                      return (
                        <li key={id} className="text-xs text-[var(--text-sub)] flex gap-2">
                          <span className="text-[var(--muted)] flex-shrink-0">{i + 1}.</span>
                          <span className="flex-shrink-0 font-medium text-[var(--primary)] tabular-nums">
                            {next || '—'}
                          </span>
                          <span className="truncate">{it.title}</span>
                          {now && next && now !== next && (
                            <span className="flex-shrink-0 text-[var(--muted)] line-through tabular-nums">
                              {now}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {reorderApplied && (
                <p className="px-1 text-xs text-[var(--primary)] font-medium">
                  {t('plan.ai.reorderApplied')}
                </p>
              )}

              {/* 並べ替えの提案が無いときは、その旨を出す。ボタンが
                  出ないだけだと「壊れている」と思われる */}
              {!advice.schedule && !reorderApplied && (
                <p className="px-1 text-xs text-[var(--muted)]">{t('plan.ai.noReorder')}</p>
              )}

              {/* 読んだあとに何ができるかを出す。提案は承認したときだけ反映する */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleApplySchedule}
                  disabled={!advice.schedule || applyingReorder}
                  className="flex-1 min-w-[140px] py-2.5 px-3 bg-[var(--primary)] text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t(applyingReorder ? 'plan.ai.applying' : 'plan.ai.accept')}
                </button>
                <button
                  onClick={handleAskAgain}
                  disabled={applyingReorder}
                  className="flex-1 min-w-[120px] py-2.5 px-3 bg-white border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-sub)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                >
                  {t('plan.ai.askAgain')}
                </button>
                <button
                  onClick={handleNewTopic}
                  disabled={applyingReorder}
                  className="flex-1 min-w-[120px] py-2.5 px-3 bg-white border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-sub)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                >
                  {t('plan.ai.newTopic')}
                </button>
              </div>

              <p className="text-xs text-[var(--muted)] px-1">{t('plan.ai.generated')}</p>
            </div>
          )}

          {aiError && (
            <p role="alert" className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {t(
                aiError === 'empty' ? 'plan.ai.emptyPlan'
                : aiError === 'rate' ? 'plan.ai.rateLimited'
                : aiError === 'unavailable' ? 'plan.ai.unavailable'
                : 'plan.ai.failed'
              )}
            </p>
          )}
        </div>
      </div>

      {/* Plans */}
      {plans.length === 0 ? (
        <div className="px-5 lg:max-w-4xl">
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <Calendar className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
            <p className="text-[var(--text-main)] font-semibold mb-1">{t('plan.empty.title')}</p>
            <p className="text-sm text-[var(--text-sub)] mb-5">{t('plan.empty.desc')}</p>
            <button
              onClick={openNewPlanModal}
              className="px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold hover:bg-[var(--primary)]/90 transition-colors"
            >
              {t('plan.empty.cta')}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 space-y-4 mb-8 lg:max-w-4xl">
          {/* Plan selector */}
          {plans.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
                    selectedPlanId === plan.id
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-white text-[var(--text-sub)] shadow-sm'
                  )}
                >
                  {plan.title}
                </button>
              ))}
            </div>
          )}

          {/* Selected plan detail */}
          {selectedPlan && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Plan header */}
              <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-main)]">{selectedPlan.title}</h2>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-sub)] mt-1 flex-wrap">
                      {selectedPlan.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {selectedPlan.location}
                        </span>
                      )}
                      {selectedPlan.start_date && selectedPlan.end_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {selectedPlan.start_date} 〜 {selectedPlan.end_date}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePlan(selectedPlan.id)}
                    className="p-2 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Day tabs */}
              <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all',
                      activeDay === day
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-gray-100 text-[var(--text-sub)]'
                    )}
                  >
                    Day {day}
                  </button>
                ))}
              </div>

              {/* Items for active day */}
              <div className="p-4">
                {itemsForDay.length === 0 ? (
                  <p className="text-sm text-[var(--muted)] text-center py-4">
                    {t('plan.day.empty')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={itemsForDay.map((i) => i.id)}
                        strategy={verticalListSortingStrategy}
                      >
                    {itemsForDay.map((item, index) => (
                      <div key={item.id}>
                        {/* 行の前に挿し込む導線。末尾にしか足せないと、
                            間に予定を入れたいとき全部作り直しになる */}
                        <button
                          onClick={() => { setInsertAt(index); setShowAddItem(true); }}
                          aria-label={t('plan.item.insertHere')}
                          className="w-full h-5 flex items-center justify-center group"
                        >
                          <span className="w-full h-px bg-transparent group-hover:bg-[var(--primary)]/30 transition-colors" />
                          <Plus className="w-3.5 h-3.5 text-transparent group-hover:text-[var(--primary)] flex-shrink-0 transition-colors" />
                          <span className="w-full h-px bg-transparent group-hover:bg-[var(--primary)]/30 transition-colors" />
                        </button>
                      <SortableItem
                        id={item.id}
                        handleLabel={t('plan.item.dragHandle')}
                        // パッケージ由来の行は並べ替えさせない。ここで入れ替えると
                        // パッケージの中身を見たときの順番と食い違う
                        disabled={item.source === 'package'}
                        disabledHint={t('plan.item.lockedInPackage')}
                      >
                      <div className="relative flex gap-3">
                        {index !== itemsForDay.length - 1 && (
                          <div className="absolute left-[23px] top-10 w-0.5 h-[calc(100%+12px)] bg-gray-200" />
                        )}
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
                          item.item_type === 'package'
                            ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                            : 'bg-gray-100',
                        )}>
                          {item.item_type === 'package'
                            ? <PackageIcon className="w-5 h-5" />
                            : typeIcon(item.item_type)}
                        </div>

                        <div className="flex-1 pb-3 min-w-0">
                          {item.item_type === 'package' ? (
                            /* パッケージは「中に体験が入っている塊」なので、
                               ただの予定より情報量を持たせて開けるようにする */
                            <>
                              <PackageBlock
                                item={item}
                                t={t}
                                onExpand={() => handleExpandPackage(item)}
                                expanding={expandingId === item.id}
                              />
                              {item.package && (
                                <ExpandPackageButton
                                  onExpand={() => handleExpandPackage(item)}
                                  expanding={expandingId === item.id}
                                  t={t}
                                />
                              )}
                            </>
                          ) : (
                            <div>
                              <p className="font-medium text-[var(--text-main)]">{item.title}</p>
                              {/* 展開元が分かるようにする。手で足した予定と
                                  パッケージ由来を見分けられないと、まとめて消せない */}
                              {item.source === 'package' && item.package && (
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-[var(--muted)] truncate">
                                    {t('plan.package.fromPackage', { title: item.package.title })}
                                  </p>
                                  {/* 展開したままだと戻せないので、畳む導線を出す。
                                      同じパッケージ由来の行がまとめて1ブロックに戻る */}
                                  <button
                                    onClick={() => handleCollapsePackage(item.package_id!, item.package!.title)}
                                    disabled={expandingId === item.package_id}
                                    className="flex-shrink-0 text-xs text-[var(--primary)] font-medium hover:underline disabled:opacity-50"
                                  >
                                    {t('plan.package.collapse')}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          {item.scheduled_time && (
                            <p className="text-sm text-[var(--muted)] flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {timeRange(item.scheduled_time, item.duration_minutes)}
                              {item.duration_minutes ? ` ・ ${formatDuration(item.duration_minutes, t)}` : ''}
                            </p>
                          )}

                          {/* タイトル・時刻・所要時間・メモをまとめて直す。
                              メモしか直せないと、時間を1本ずらすだけで
                              作り直しになってしまう #16 */}
                          {editingId === item.id ? (
                            <div className="mt-2 space-y-2">
                              {canEditTitle(item) ? (
                                <input
                                  type="text"
                                  value={editDraft.title}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                                  placeholder={t('plan.item.titlePlaceholder')}
                                  maxLength={120}
                                  disabled={savingEdit}
                                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-60"
                                />
                              ) : (
                                <p className="text-xs text-[var(--muted)]">
                                  {t('plan.item.titleLockedInPackage')}
                                </p>
                              )}

                              <div className="flex gap-2">
                                <label className="flex-1">
                                  <span className="block text-xs text-[var(--muted)] mb-1">
                                    {t('plan.item.time')}
                                  </span>
                                  <input
                                    type="time"
                                    value={editDraft.time}
                                    onChange={(e) => setEditDraft((d) => ({ ...d, time: e.target.value }))}
                                    disabled={savingEdit}
                                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-60"
                                  />
                                </label>
                                <label className="flex-1">
                                  <span className="block text-xs text-[var(--muted)] mb-1">
                                    {t('plan.item.duration')}
                                  </span>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={1440}
                                    value={editDraft.duration}
                                    onChange={(e) => setEditDraft((d) => ({ ...d, duration: e.target.value }))}
                                    placeholder={t('plan.item.durationPlaceholder')}
                                    disabled={savingEdit}
                                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-60"
                                  />
                                </label>
                              </div>

                              <textarea
                                value={editDraft.note}
                                onChange={(e) => setEditDraft((d) => ({ ...d, note: e.target.value }))}
                                placeholder={t('plan.item.notePlaceholder')}
                                rows={2}
                                maxLength={500}
                                disabled={savingEdit}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none disabled:opacity-60"
                              />

                              {editFailed && (
                                <p role="alert" className="text-xs text-red-500">
                                  {t('plan.item.saveFailed')}
                                </p>
                              )}

                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setEditingId(null); setEditFailed(false); }}
                                  disabled={savingEdit}
                                  className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-xs disabled:opacity-50"
                                >
                                  {t('common.cancel')}
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(item)}
                                  disabled={savingEdit}
                                  className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs font-medium disabled:opacity-50"
                                >
                                  {t('common.save')}
                                </button>
                              </div>
                            </div>
                          ) : item.note ? (
                            <button
                              onClick={() => openEditor(item)}
                              className="mt-1.5 w-full text-left flex items-start gap-1.5 text-sm text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
                            >
                              <StickyNote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[var(--muted)]" />
                              <span className="whitespace-pre-wrap">{item.note}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openEditor(item)}
                              className="mt-1.5 flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                            >
                              <StickyNote className="w-3 h-3" />
                              {t('plan.item.addNote')}
                            </button>
                          )}
                        </div>

                        {/* 時刻やタイトルを直す導線。メモが無い行だと
                            編集に入る入口が見つからなかった */}
                        <button
                          onClick={() => (editingId === item.id ? setEditingId(null) : openEditor(item))}
                          aria-label={t('plan.item.editTitle')}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors self-start flex-shrink-0"
                        >
                          <Pencil className="w-4 h-4 text-[var(--muted)]" />
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors self-start flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                      </SortableItem>
                      </div>
                    ))}
                      </SortableContext>
                    </DndContext>

                    {/* 末尾に足す導線 */}
                    <button
                      onClick={() => { setInsertAt(null); setShowAddItem(true); }}
                      aria-label={t('plan.item.insertHere')}
                      className="w-full h-5 flex items-center justify-center group"
                    >
                      <span className="w-full h-px bg-transparent group-hover:bg-[var(--primary)]/30 transition-colors" />
                      <Plus className="w-3.5 h-3.5 text-transparent group-hover:text-[var(--primary)] flex-shrink-0 transition-colors" />
                      <span className="w-full h-px bg-transparent group-hover:bg-[var(--primary)]/30 transition-colors" />
                    </button>
                  </div>
                )}

                {splitWarning && (
                  <p role="alert" className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                    {t('plan.item.cannotSplitPackage')}
                  </p>
                )}

                {reorderError && (
                  <p role="alert" className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                    {t('plan.item.reorderFailed')}
                  </p>
                )}

                {expandError && (
                  <p role="alert" className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                    {t(expandError === 'no-spots' ? 'plan.package.expandNoSpots' : 'plan.package.expandFailed')}
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  {/* 購入したパッケージを置くのが主導線。自由入力より上に出す */}
                  <button
                    onClick={openAddPackage}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--primary)]/90 transition-colors"
                  >
                    <PackageIcon className="w-4 h-4" />
                    {t('plan.day.addPackage')}
                  </button>
                  <button
                    onClick={() => setShowAddItem(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--border)] rounded-xl text-sm text-[var(--text-sub)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {t('plan.day.addItem', { day: activeDay })}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Plan Modal（2ステップウィザード） */}
      {showNewPlan && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl flex flex-col max-h-[90vh]">
            {/* Handle + step indicator */}
            <div className="px-6 pt-5 pb-2 flex-shrink-0">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-center gap-2">
                <div className={cn('w-8 h-1.5 rounded-full transition-colors', wizardStep >= 1 ? 'bg-[var(--primary)]' : 'bg-gray-200')} />
                <div className={cn('w-8 h-1.5 rounded-full transition-colors', wizardStep >= 2 ? 'bg-[var(--primary)]' : 'bg-gray-200')} />
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {wizardStep === 1 && (
                <>
                  <h2 className="text-xl font-bold text-[var(--text-main)] mb-1">{t('plan.new.title')}</h2>
                  <p className="text-sm text-[var(--text-sub)] mb-5">{t('plan.new.desc')}</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-main)] mb-2">{t('plan.new.name')}</label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder={t('plan.new.namePlaceholder')}
                        autoFocus
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-main)] mb-2">{t('plan.new.destination')}</label>
                      <input
                        type="text"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder={t('plan.new.destinationPlaceholder')}
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                  </div>
                </>
              )}

              {wizardStep === 2 && (
                <>
                  <h2 className="text-xl font-bold text-[var(--text-main)] mb-1">{t('plan.new.dates')}</h2>
                  <p className="text-sm text-[var(--text-sub)] mb-5">{t('plan.new.dateSubtitle', { title: newTitle })}</p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-2">{t('plan.new.startDate')}</label>
                        <input
                          type="date"
                          value={newStart}
                          onChange={(e) => setNewStart(e.target.value)}
                          className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-2">{t('plan.new.endDate')}</label>
                        <input
                          type="date"
                          value={newEnd}
                          min={newStart}
                          onChange={(e) => setNewEnd(e.target.value)}
                          className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[var(--muted)]">{t('plan.new.dateNote')}</p>
                  </div>
                </>
              )}
            </div>

            {/* Sticky buttons */}
            <div className="px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] border-t border-gray-100 flex-shrink-0">
              {wizardStep === 1 && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewPlan(false)}
                    className="flex-1 py-3 border border-[var(--border)] rounded-2xl font-medium"
                  >
                    {t('common.cancel')}
                  </button>
                  <CTAButton
                    onClick={() => setWizardStep(2)}
                    className="flex-1"
                    disabled={!newTitle.trim()}
                  >
                    {t('common.next')}
                  </CTAButton>
                </div>
              )}
              {createError && (
                <p role="alert" className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {t('plan.new.failed')}
                </p>
              )}
              {wizardStep === 2 && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="flex-1 py-3 border border-[var(--border)] rounded-2xl font-medium"
                  >
                    {t('common.back')}
                  </button>
                  <CTAButton
                    onClick={handleCreatePlan}
                    className="flex-1"
                    disabled={creating}
                  >
                    {creating ? t('plan.new.creating') : t('plan.new.create')}
                  </CTAButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {/* 購入済みパッケージの選択 #16 */}
      {showAddPackage && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl flex flex-col max-h-[90vh]">
            <div className="px-6 pt-5 pb-2 flex-shrink-0">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
              <h2 className="text-xl font-bold text-[var(--text-main)] mt-2">
                {t('plan.package.pickTitle')}
              </h2>
              <p className="text-sm text-[var(--text-sub)] mt-1">
                {t('plan.package.pickDesc', { day: activeDay })}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {packageError && (
                <p role="alert" className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {t(packageError === 'duplicate' ? 'plan.package.duplicate' : 'plan.package.failed')}
                </p>
              )}

              {loadingPurchased ? (
                <p className="text-sm text-[var(--muted)] text-center py-8">{t('common.loading')}</p>
              ) : purchased.length === 0 ? (
                <div className="text-center py-8">
                  <PackageIcon className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
                  <p className="font-medium text-[var(--text-main)]">{t('plan.package.empty')}</p>
                  <p className="text-sm text-[var(--text-sub)] mt-1 mb-4">{t('plan.package.emptyDesc')}</p>
                  <Link
                    href="/explore"
                    className="inline-block px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold"
                  >
                    {t('plan.package.explore')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {purchased.map((pkg) => {
                    // 既にこの計画に入っているものは押せなくする。
                    // 押せてしまうと UNIQUE 制約でエラーになるだけで、
                    // なぜ入らないのかが分からない
                    const already = planItems.some((i) => i.package_id === pkg.id);
                    return (
                      <button
                        key={pkg.id}
                        onClick={() => handleAddPackage(pkg)}
                        disabled={already || addingPackageId !== null}
                        className={cn(
                          'w-full flex gap-3 p-3 rounded-2xl border text-left transition-colors',
                          already
                            ? 'border-[var(--border)] bg-gray-50 opacity-60'
                            : 'border-[var(--border)] hover:border-[var(--primary)]',
                          addingPackageId === pkg.id && 'opacity-50',
                        )}
                      >
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          {pkg.image_url ? (
                            <Image src={pkg.image_url} alt="" fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <PackageIcon className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 self-center">
                          <p className="font-medium text-[var(--text-main)] truncate">{pkg.title}</p>
                          <p className="text-xs text-[var(--text-sub)] truncate">
                            {[pkg.area, pkg.guide_name].filter(Boolean).join(' ・ ')}
                          </p>
                          <p className="text-xs text-[var(--muted)] mt-0.5">
                            {t('plan.package.spots', { count: pkg.spot_count })}
                            {pkg.duration_minutes ? ` ・ ${formatDuration(pkg.duration_minutes, t)}` : ''}
                          </p>
                        </div>
                        {already && (
                          <span className="self-center flex-shrink-0 text-xs text-[var(--muted)] font-medium">
                            {t('plan.package.added')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowAddPackage(false)}
                className="w-full py-3 border border-[var(--border)] rounded-2xl font-medium text-sm"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddItem && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl flex flex-col max-h-[90vh]">
            {/* Handle */}
            <div className="px-6 pt-5 pb-2 flex-shrink-0">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
              <h2 className="text-xl font-bold text-[var(--text-main)] mt-2">{t('plan.day.addItem', { day: activeDay })}</h2>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">{t('plan.item.type')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ITEM_TYPES.map((itemType) => (
                      <button
                        key={itemType.value}
                        onClick={() => setNewItemType(itemType.value)}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all',
                          newItemType === itemType.value
                            ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                            : 'border-[var(--border)] text-[var(--text-sub)]'
                        )}
                      >
                        <span>{itemType.icon}</span>
                        {t(itemType.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">{t('plan.item.title')}</label>
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder={t('plan.item.titlePlaceholder')}
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-2">{t('plan.item.time')}</label>
                    <input
                      type="time"
                      value={newItemTime}
                      onChange={(e) => setNewItemTime(e.target.value)}
                      className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div>
                    {/* 所要時間が無いと終了時刻が出ず、次の予定を何時から
                        置けるのか分からない。移動や食事にも必要 */}
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-2">{t('plan.item.duration')}</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={5}
                      value={newItemDuration}
                      onChange={(e) => setNewItemDuration(e.target.value)}
                      placeholder={t('plan.item.durationPlaceholder')}
                      className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                </div>
                <div>
                  {/* 何を食べるか・どの電車か・注意点を残す欄 #16 */}
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">{t('plan.item.note')}</label>
                  <textarea
                    value={newItemNote}
                    onChange={(e) => setNewItemNote(e.target.value)}
                    placeholder={t('plan.item.notePlaceholder')}
                    rows={2}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Sticky buttons */}
            <div className="px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] border-t border-gray-100 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddItem(false)}
                  className="flex-1 py-3 border border-[var(--border)] rounded-2xl font-medium"
                >
                  {t('common.cancel')}
                </button>
                <CTAButton
                  onClick={handleAddItem}
                  className="flex-1"
                  disabled={!newItemTitle.trim() || addingItem}
                >
                  {addingItem ? t('plan.item.adding') : t('plan.item.add')}
                </CTAButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
