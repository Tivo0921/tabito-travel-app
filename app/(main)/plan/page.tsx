'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  MapPin,
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
} from '@/lib/supabase/queries';
import type { Plan, PlanItem } from '@/lib/types';
import { useT } from '@/lib/i18n/provider';
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

export default function PlanPage() {
  const t = useT();
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
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                          {typeIcon(item.item_type)}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="font-medium text-[var(--text-main)]">{item.title}</p>
                          {item.scheduled_time && (
                            <p className="text-sm text-[var(--muted)] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.scheduled_time.slice(0, 5)}
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

                <button
                  onClick={() => setShowAddItem(true)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--border)] rounded-xl text-sm text-[var(--text-sub)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('plan.day.addItem', { day: activeDay })}
                </button>
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
