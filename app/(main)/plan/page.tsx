'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus,
  Calendar,
  MapPin,
  Package as PackageIcon,
  Sparkles,
  ChevronRight,
  Clock,
  Info,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CTAButton } from '@/components/cta-button';
import {
  getMyPlans,
  createPlan,
  deletePlan,
  getPlanItems,
  addPlanItem,
  deletePlanItem,
  getPurchasedPackagesForPlan,
  addPlanPackage,
} from '@/lib/supabase/queries';
import type { Plan, PlanItem, PlanItemPackage } from '@/lib/types';
import { useT, useLocale } from '@/lib/i18n/provider';
import { formatDuration } from '@/lib/i18n/format';
import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';

const ITEM_TYPES: { value: PlanItem['item_type']; labelKey: TranslationKey; icon: string }[] = [
  { value: 'spot', labelKey: 'plan.itemType.spot', icon: '📍' },
  { value: 'meal', labelKey: 'plan.itemType.meal', icon: '🍜' },
  { value: 'transport', labelKey: 'plan.itemType.transport', icon: '✈️' },
  { value: 'manner', labelKey: 'plan.itemType.manner', icon: '📝' },
];

function typeIcon(type: string) {
  return ITEM_TYPES.find((t) => t.value === type)?.icon ?? '📍';
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
}: {
  item: PlanItem;
  t: ReturnType<typeof useT>;
}) {
  const pkg = item.package;

  // package_id は ON DELETE SET NULL。パッケージが消えると
  // タイトルだけが行に残る。黙って消さず、消えたことが分かる形で出す
  if (!pkg) {
    return (
      <div>
        <p className="font-medium text-[var(--muted)] line-through">{item.title}</p>
        <p className="text-xs text-[var(--muted)]">{t('plan.package.removed')}</p>
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

export default function PlanPage() {
  const t = useT();
  const { locale } = useLocale();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [activeDay, setActiveDay] = useState(1);
  const [aiPrompt, setAiPrompt] = useState('');

  // 新規プランモーダル（2ステップ）
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [creating, setCreating] = useState(false);

  // アイテム追加モーダル
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState<PlanItem['item_type']>('spot');
  const [newItemTime, setNewItemTime] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  // 購入済みパッケージをブロックとして置く #16
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [purchased, setPurchased] = useState<PlanItemPackage[]>([]);
  const [loadingPurchased, setLoadingPurchased] = useState(false);
  const [addingPackageId, setAddingPackageId] = useState<string | null>(null);
  const [packageError, setPackageError] = useState<'duplicate' | 'failed' | null>(null);

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
      // パッケージのタイトルは locale で引くので、言語を変えたら引き直す
      getPlanItems(selectedPlanId, locale).then(setPlanItems);
      setActiveDay(1);
    }
  }, [selectedPlanId, locale]);

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
    const withTime = itemsForDay.filter((i) => i.scheduled_time);
    const last = withTime[withTime.length - 1];
    if (!last?.scheduled_time) return undefined;

    const [h, m] = last.scheduled_time.split(':').map(Number);
    const total = h * 60 + m + (last.duration_minutes ?? 0);
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
    setShowNewPlan(true);
  };

  const handleCreatePlan = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const plan = await createPlan(newTitle, newLocation, newStart, newEnd);
    if (plan) {
      setPlans((prev) => [plan, ...prev]);
      setSelectedPlanId(plan.id);
      setPlanItems([]);
    }
    setShowNewPlan(false);
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
    const item = await addPlanItem(selectedPlanId, activeDay, newItemType, newItemTitle, newItemTime || undefined);
    if (item) {
      setPlanItems((prev) => [...prev, item]);
    }
    setNewItemTitle('');
    setNewItemType('spot');
    setNewItemTime('');
    setShowAddItem(false);
    setAddingItem(false);
  };

  const openAddPackage = async () => {
    setPackageError(null);
    setShowAddPackage(true);
    setLoadingPurchased(true);
    setPurchased(await getPurchasedPackagesForPlan(locale));
    setLoadingPurchased(false);
  };

  const handleAddPackage = async (pkg: PlanItemPackage) => {
    if (!selectedPlanId) return;
    setAddingPackageId(pkg.id);
    setPackageError(null);
    const item = await addPlanPackage(selectedPlanId, activeDay, pkg, suggestedTime());
    if (item) {
      setPlanItems((prev) => [...prev, item]);
      setShowAddPackage(false);
    } else {
      // 失敗の大半は同じ計画に同じパッケージを二重に置いた場合。
      // 既に置いてあるかは手元の planItems で判断できる
      const already = planItems.some((i) => i.package_id === pkg.id);
      setPackageError(already ? 'duplicate' : 'failed');
    }
    setAddingPackageId(null);
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
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={t('plan.ai.placeholder')}
              className="flex-1 px-4 py-3 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <button
              onClick={() => setAiPrompt('')}
              className="p-3 bg-[var(--primary)] rounded-xl hover:bg-[var(--primary)]/90 transition-colors"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
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
                    {itemsForDay.map((item, index) => (
                      <div key={item.id} className="relative flex gap-3">
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
                            <PackageBlock item={item} t={t} />
                          ) : (
                            <p className="font-medium text-[var(--text-main)]">{item.title}</p>
                          )}
                          {item.scheduled_time && (
                            <p className="text-sm text-[var(--muted)] flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {item.scheduled_time.slice(0, 5)}
                              {item.duration_minutes ? ` ・ ${formatDuration(item.duration_minutes, t)}` : ''}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors self-start flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
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
                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">{t('plan.item.time')}</label>
                  <input
                    type="time"
                    value={newItemTime}
                    onChange={(e) => setNewItemTime(e.target.value)}
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
