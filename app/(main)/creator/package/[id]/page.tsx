'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Video,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CTAButton } from '@/components/cta-button';
import {
  createCreatorPackage,
  updateCreatorPackage,
  getCreatorPackageWithSpots,
  createCreatorSpot,
  updateCreatorSpot,
  deleteCreatorSpot,
  setPackageStatus,
} from '@/lib/supabase/queries';
import type { Spot, CreatorSpotInput } from '@/lib/types';

const AREAS = ['東京', '大阪', '京都', '横浜', '名古屋', '福岡', '札幌', 'その他'];
const CATEGORIES = ['都市探検', 'グルメ', '文化・歴史', 'ショッピング', '自然', 'エンタメ'];

const EMPTY_SPOT: CreatorSpotInput = {
  name: '',
  description: '',
  image_url: '',
  video_url: '',
  duration_minutes: 60,
  map_url: '',
  shop_url: '',
  local_tips: ['', '', ''],
  etiquette_tips: ['', '', ''],
  phrases: [
    { japanese: '', reading: '', meaning: '' },
    { japanese: '', reading: '', meaning: '' },
  ],
};

export default function CreatorPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = id === 'new';
  const guideId = searchParams.get('guide') ?? '';

  // パッケージ基本情報
  const [packageId, setPackageId] = useState<string | null>(isNew ? null : id);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState(AREAS[0]);
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [infoSaved, setInfoSaved] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  // スポット一覧
  const [spots, setSpots] = useState<Spot[]>([]);

  // スポット編集モーダル
  const [showSpotModal, setShowSpotModal] = useState(false);
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [spotInput, setSpotInput] = useState<CreatorSpotInput>(EMPTY_SPOT);
  const [savingSpot, setSavingSpot] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  const loadPackage = useCallback(async (pkgId: string) => {
    const { pkg, spots: s } = await getCreatorPackageWithSpots(pkgId);
    if (pkg) {
      const p = pkg as typeof pkg & { status: string };
      setTitle(p.title);
      setShortDesc(p.short_description);
      setDescription(p.description);
      setArea(p.area);
      setPrice(String(p.price));
      setCategory(p.category);
      setImageUrl(p.image_url);
      setDurationHours(p.duration ? String(Math.round(parseInt(p.duration) / 60) || '') : '');
      setStatus(p.status as 'draft' | 'published');
      setInfoSaved(true);
    }
    setSpots(s);
  }, []);

  useEffect(() => {
    if (!isNew && packageId) {
      loadPackage(packageId).finally(() => setLoading(false));
    }
  }, [isNew, packageId, loadPackage]);

  const handleSaveInfo = async () => {
    if (!title.trim() || !area || !price) return;
    setSavingInfo(true);
    const durationMin = durationHours ? Math.round(parseFloat(durationHours) * 60) : null;
    const priceNum = parseInt(price) || 0;

    if (!packageId) {
      const newId = await createCreatorPackage(
        guideId, title, area, priceNum, shortDesc, description, category, imageUrl, durationMin,
      );
      if (newId) {
        setPackageId(newId);
        setInfoSaved(true);
        router.replace(`/creator/package/${newId}`);
      }
    } else {
      await updateCreatorPackage(packageId, title, area, priceNum, shortDesc, description, category, imageUrl, durationMin);
      setInfoSaved(true);
    }
    setSavingInfo(false);
  };

  const openAddSpot = () => {
    setEditingSpot(null);
    setSpotInput({ ...EMPTY_SPOT, local_tips: ['', '', ''], etiquette_tips: ['', '', ''], phrases: [{ japanese: '', reading: '', meaning: '' }, { japanese: '', reading: '', meaning: '' }] });
    setShowSpotModal(true);
  };

  const openEditSpot = (spot: Spot) => {
    setEditingSpot(spot);
    setSpotInput({
      name: spot.name,
      description: spot.description,
      image_url: spot.image_url,
      video_url: spot.video_url ?? '',
      duration_minutes: spot.duration_minutes,
      map_url: spot.map_url,
      shop_url: spot.shop_url ?? '',
      local_tips: [...spot.local_tips, '', '', ''].slice(0, Math.max(3, spot.local_tips.length)),
      etiquette_tips: [...spot.etiquette_tips, '', '', ''].slice(0, Math.max(3, spot.etiquette_tips.length)),
      phrases: [
        ...spot.japanese_phrases.map((p) => ({ japanese: p.japanese, reading: p.reading, meaning: p.meaning })),
        { japanese: '', reading: '', meaning: '' },
        { japanese: '', reading: '', meaning: '' },
      ].slice(0, Math.max(2, spot.japanese_phrases.length + 1)),
    });
    setShowSpotModal(true);
  };

  const handleSaveSpot = async () => {
    if (!packageId || !spotInput.name.trim()) return;
    setSavingSpot(true);
    const cleanInput: CreatorSpotInput = {
      ...spotInput,
      local_tips: spotInput.local_tips.filter(Boolean),
      etiquette_tips: spotInput.etiquette_tips.filter(Boolean),
      phrases: spotInput.phrases.filter((p) => p.japanese.trim()),
    };

    if (editingSpot) {
      await updateCreatorSpot(editingSpot.id, packageId, cleanInput);
    } else {
      await createCreatorSpot(packageId, spots.length + 1, cleanInput);
    }
    await loadPackage(packageId);
    setShowSpotModal(false);
    setSavingSpot(false);
  };

  const handleDeleteSpot = async (spotId: string) => {
    if (!packageId || !confirm('このスポットを削除しますか？')) return;
    await deleteCreatorSpot(spotId, packageId);
    setSpots((prev) => prev.filter((s) => s.id !== spotId));
  };

  const handleTogglePublish = async () => {
    if (!packageId) return;
    setPublishing(true);
    const next = status === 'published' ? 'draft' : 'published';
    await setPackageStatus(packageId, next);
    setStatus(next);
    setPublishing(false);
  };

  // スポット入力ヘルパー
  const setTip = (kind: 'local_tips' | 'etiquette_tips', idx: number, val: string) =>
    setSpotInput((prev) => {
      const arr = [...prev[kind]];
      arr[idx] = val;
      return { ...prev, [kind]: arr };
    });

  const addTip = (kind: 'local_tips' | 'etiquette_tips') =>
    setSpotInput((prev) => ({ ...prev, [kind]: [...prev[kind], ''] }));

  const setPhrase = (idx: number, field: 'japanese' | 'reading' | 'meaning', val: string) =>
    setSpotInput((prev) => {
      const arr = [...prev.phrases];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...prev, phrases: arr };
    });

  const addPhrase = () =>
    setSpotInput((prev) => ({ ...prev, phrases: [...prev.phrases, { japanese: '', reading: '', meaning: '' }] }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-32">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white border-b border-[var(--border)] pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
          </button>
          <h1 className="flex-1 font-bold text-[var(--text-main)] truncate">
            {isNew ? '新しいパッケージ' : (title || 'パッケージ編集')}
          </h1>
          {packageId && (
            <span className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium',
              status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            )}>
              {status === 'published' ? '公開中' : '下書き'}
            </span>
          )}
        </div>
      </header>

      <div className="px-5 py-6 space-y-6">
        {/* ── 基本情報セクション ── */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-main)]">基本情報</h2>
            {infoSaved && <Check className="w-4 h-4 text-green-500" />}
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">タイトル *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setInfoSaved(false); }}
                placeholder="例：渋谷・原宿ローカルグルメツアー"
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">一言説明</label>
              <input
                type="text"
                value={shortDesc}
                onChange={(e) => { setShortDesc(e.target.value); setInfoSaved(false); }}
                placeholder="例：地元だけが知る隠れグルメスポットを巡るコース"
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">詳細説明</label>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setInfoSaved(false); }}
                placeholder="このツアーの魅力、特徴、対象者などを詳しく記載してください"
                rows={4}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">エリア *</label>
                <select
                  value={area}
                  onChange={(e) => { setArea(e.target.value); setInfoSaved(false); }}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">カテゴリ</label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setInfoSaved(false); }}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">料金 (円) *</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => { setPrice(e.target.value); setInfoSaved(false); }}
                  placeholder="2500"
                  min="0"
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">所要時間 (時間)</label>
                <input
                  type="number"
                  value={durationHours}
                  onChange={(e) => { setDurationHours(e.target.value); setInfoSaved(false); }}
                  placeholder="3"
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">サムネイル画像URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => { setImageUrl(e.target.value); setInfoSaved(false); }}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              {imageUrl && (
                <div className="relative mt-2 aspect-video rounded-xl overflow-hidden bg-gray-100">
                  <Image src={imageUrl} alt="preview" fill className="object-cover" onError={() => {}} />
                </div>
              )}
            </div>
            <CTAButton
              onClick={handleSaveInfo}
              fullWidth
              disabled={!title.trim() || !area || !price || savingInfo}
              loading={savingInfo}
            >
              {infoSaved ? '保存済み ✓' : '基本情報を保存'}
            </CTAButton>
          </div>
        </section>

        {/* ── スポット管理セクション ── */}
        {packageId && (
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-main)]">
                スポット ({spots.length}件)
              </h2>
              <button
                onClick={openAddSpot}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary-soft)] text-[var(--primary)] rounded-xl text-sm font-medium"
              >
                <Plus className="w-4 h-4" />追加
              </button>
            </div>

            {spots.length === 0 ? (
              <div className="py-10 text-center">
                <MapPin className="w-10 h-10 text-[var(--muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--muted)]">スポットを追加してください</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {spots.map((spot, idx) => (
                  <div key={spot.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-shrink-0 w-7 h-7 bg-[var(--primary-soft)] rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-[var(--primary)]">{idx + 1}</span>
                    </div>
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {spot.image_url ? (
                        <Image src={spot.image_url} alt={spot.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                      {spot.video_url && (
                        <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-[var(--primary)] rounded-full flex items-center justify-center">
                          <Video className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[var(--text-main)] truncate">{spot.name}</p>
                      <p className="text-xs text-[var(--muted)] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />{spot.duration_minutes}分
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditSpot(spot)}
                        className="px-3 py-1.5 text-xs font-medium text-[var(--primary)] border border-[var(--primary)]/30 rounded-lg hover:bg-[var(--primary-soft)] transition-colors"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteSpot(spot.id)}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* 公開ボタン（固定フッター） */}
      {packageId && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="max-w-lg mx-auto">
            <CTAButton
              onClick={handleTogglePublish}
              fullWidth
              loading={publishing}
              variant={status === 'published' ? 'outline' : 'primary'}
            >
              {status === 'published'
                ? <><EyeOff className="w-5 h-5" />下書きに戻す</>
                : <><Eye className="w-5 h-5" />公開する</>
              }
            </CTAButton>
            {status !== 'published' && spots.length === 0 && (
              <p className="text-xs text-[var(--muted)] text-center mt-2">
                ※ 公開にはスポットが最低1件必要です
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── スポット編集モーダル ── */}
      {showSpotModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl flex flex-col max-h-[95vh]">
            {/* ヘッダー */}
            <div className="px-5 pt-5 pb-3 flex-shrink-0 border-b border-[var(--border)]">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                {editingSpot ? 'スポットを編集' : 'スポットを追加'}
              </h2>
            </div>

            {/* スクロール可能なコンテンツ */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* 基本情報 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">スポット名 *</label>
                  <input
                    type="text"
                    value={spotInput.name}
                    onChange={(e) => setSpotInput((p) => ({ ...p, name: e.target.value }))}
                    placeholder="例：道頓堀"
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">説明</label>
                  <textarea
                    value={spotInput.description}
                    onChange={(e) => setSpotInput((p) => ({ ...p, description: e.target.value }))}
                    placeholder="このスポットの魅力や見どころを説明してください"
                    rows={3}
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                  />
                </div>
              </div>

              {/* 動画 & 画像 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5 flex items-center gap-1">
                    <Video className="w-3.5 h-3.5 text-[var(--primary)]" />
                    ガイド動画URL
                  </label>
                  <input
                    type="url"
                    value={spotInput.video_url}
                    onChange={(e) => setSpotInput((p) => ({ ...p, video_url: e.target.value }))}
                    placeholder="https://example.com/video.mp4"
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">画像URL</label>
                  <input
                    type="url"
                    value={spotInput.image_url}
                    onChange={(e) => setSpotInput((p) => ({ ...p, image_url: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              {/* 所要時間 & マップ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">所要時間 (分)</label>
                  <input
                    type="number"
                    value={spotInput.duration_minutes}
                    onChange={(e) => setSpotInput((p) => ({ ...p, duration_minutes: parseInt(e.target.value) || 60 }))}
                    min="5"
                    step="5"
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">GoogleマップURL</label>
                  <input
                    type="url"
                    value={spotInput.map_url}
                    onChange={(e) => setSpotInput((p) => ({ ...p, map_url: e.target.value }))}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              {/* ローカルtips */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[var(--text-sub)]">ローカルtips</label>
                  <button onClick={() => addTip('local_tips')} className="text-xs text-[var(--primary)] font-medium">+ 追加</button>
                </div>
                <div className="space-y-2">
                  {spotInput.local_tips.map((tip, i) => (
                    <input
                      key={i}
                      type="text"
                      value={tip}
                      onChange={(e) => setTip('local_tips', i, e.target.value)}
                      placeholder={`tip ${i + 1}`}
                      className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  ))}
                </div>
              </div>

              {/* マナーtips */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[var(--text-sub)]">マナー・エチケット</label>
                  <button onClick={() => addTip('etiquette_tips')} className="text-xs text-[var(--primary)] font-medium">+ 追加</button>
                </div>
                <div className="space-y-2">
                  {spotInput.etiquette_tips.map((tip, i) => (
                    <input
                      key={i}
                      type="text"
                      value={tip}
                      onChange={(e) => setTip('etiquette_tips', i, e.target.value)}
                      placeholder={`マナー ${i + 1}`}
                      className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  ))}
                </div>
              </div>

              {/* 日本語フレーズ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[var(--text-sub)]">役立つ日本語フレーズ</label>
                  <button onClick={addPhrase} className="text-xs text-[var(--primary)] font-medium">+ 追加</button>
                </div>
                <div className="space-y-3">
                  {spotInput.phrases.map((phrase, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2">
                      <input
                        type="text"
                        value={phrase.japanese}
                        onChange={(e) => setPhrase(i, 'japanese', e.target.value)}
                        placeholder="日本語"
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                      <input
                        type="text"
                        value={phrase.reading}
                        onChange={(e) => setPhrase(i, 'reading', e.target.value)}
                        placeholder="読み方（ひらがな）"
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                      <input
                        type="text"
                        value={phrase.meaning}
                        onChange={(e) => setPhrase(i, 'meaning', e.target.value)}
                        placeholder="意味・使う場面"
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 固定ボタン */}
            <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] border-t border-gray-100 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSpotModal(false)}
                  className="flex-1 py-3 border border-[var(--border)] rounded-2xl font-medium text-sm"
                >
                  キャンセル
                </button>
                <CTAButton
                  onClick={handleSaveSpot}
                  className="flex-1"
                  disabled={!spotInput.name.trim() || savingSpot}
                  loading={savingSpot}
                >
                  保存する
                </CTAButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
