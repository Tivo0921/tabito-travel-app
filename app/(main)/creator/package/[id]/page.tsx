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
import { PlacePicker } from '@/components/place-picker';
import {
  createCreatorPackage,
  updateCreatorPackage,
  type SaveResult,
  type CreatorPackageInput,
  getCreatorPackageWithSpots,
  createCreatorSpot,
  updateCreatorSpot,
  deleteCreatorSpot,
  setPackageStatus,
  getAreas,
  getCategories,
} from '@/lib/supabase/queries';
import type { Spot, CreatorSpotInput, Area, Category, PackagePlace } from '@/lib/types';
import { useT } from '@/lib/i18n/provider';

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
  const t = useT();
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
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [areaId, setAreaId] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [durationHours, setDurationHours] = useState('');
  // 開始/終了地点。null = 未設定（未設定のまま保存できる）#16
  const [startPlace, setStartPlace] = useState<PackagePlace | null>(null);
  const [endPlace, setEndPlace] = useState<PackagePlace | null>(null);
  const [infoSaved, setInfoSaved] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  // null = エラーなし。'ok' は成功なのでここには入らない。
  // SaveResult をそのまま許すと、型の上では 'ok' で通信エラーの文言が出せてしまう
  const [saveError, setSaveError] = useState<Exclude<SaveResult, 'ok'> | null>(null);

  // スポット一覧
  const [spots, setSpots] = useState<Spot[]>([]);

  // スポット編集モーダル
  const [showSpotModal, setShowSpotModal] = useState(false);
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [spotInput, setSpotInput] = useState<CreatorSpotInput>(EMPTY_SPOT);
  const [savingSpot, setSavingSpot] = useState(false);
  // モーダル内の保存失敗。基本情報の saveError とは表示位置が違う
  const [spotError, setSpotError] = useState(false);
  // 基本情報フォームから離れた操作（公開トグル・スポット削除）用。
  // saveError をそのまま使うとフォーム脇に出て、画面外で気付けない
  const [actionError, setActionError] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  // セッション切れは「他人のコンテンツ」ではない。文言と導線を分ける。
  const [sessionExpired, setSessionExpired] = useState(false);

  const loadPackage = useCallback(async (pkgId: string) => {
    const { pkg, spots: s, reason } = await getCreatorPackageWithSpots(pkgId);
    if (pkg) {
      const p = pkg as typeof pkg & { status: string };
      setTitle(p.title);
      setShortDesc(p.short_description);
      setDescription(p.description);
      setAreaId(p.area_id ?? '');
      setPrice(String(p.price));
      setCategoryId(p.category_id ?? '');
      setImageUrl(p.image_url);
      // 分をそのまま持つので、表示用文字列を parseInt する必要がない
      setDurationHours(p.duration_minutes ? String(p.duration_minutes / 60) : '');
      setStartPlace(p.start_place);
      setEndPlace(p.end_place);
      setStatus(p.status as 'draft' | 'published');
      setInfoSaved(true);
    } else if (reason === 'unauthenticated') {
      // ログインが切れているだけ。「自分が作成したものか確認してください」を
      // 出すと原因と表示が食い違い、再ログインの導線も無くなる。
      setSessionExpired(true);
    } else {
      // 自分のものでない、または存在しないID。
      // 空のフォームを出すと新規作成と見分けが付かないので明示する。
      setNotFound(true);
    }
    setSpots(s);
  }, []);

  useEffect(() => {
    if (!isNew && packageId) {
      loadPackage(packageId).finally(() => setLoading(false));
    }
  }, [isNew, packageId, loadPackage]);

  // エリア/カテゴリのマスタを取得。未選択なら先頭を既定にする
  useEffect(() => {
    getAreas().then((data) => {
      setAreas(data);
      setAreaId((prev) => prev || data[0]?.id || '');
    });
    getCategories().then((data) => {
      setCategories(data);
      setCategoryId((prev) => prev || data[0]?.id || '');
    });
  }, []);

  const handleSaveInfo = async () => {
    if (!title.trim() || !areaId || !price) return;
    setSavingInfo(true);
    const durationMin = durationHours ? Math.round(parseFloat(durationHours) * 60) : null;
    const priceNum = parseInt(price) || 0;

    const input: CreatorPackageInput = {
      title,
      areaId,
      price: priceNum,
      shortDescription: shortDesc,
      description,
      categoryId,
      imageUrl,
      durationMinutes: durationMin,
      startPlace,
      endPlace,
    };

    if (!packageId) {
      const created = await createCreatorPackage(guideId, input);
      // 新規作成も同じ扱い。guide が未指定/他人のものだと INSERT が RLS に
      // 弾かれる（forbidden）が、通信エラーまで所有権を疑う文言にしない
      setInfoSaved(created.result === 'ok');
      setSaveError(created.result === 'ok' ? null : created.result);
      if (created.id) {
        setPackageId(created.id);
        router.replace(`/creator/package/${created.id}`);
      }
    } else {
      // 失敗を「保存済み ✓」で覆い隠さない
      const result = await updateCreatorPackage(packageId, input);
      setInfoSaved(result === 'ok');
      setSaveError(result === 'ok' ? null : result);
    }
    setSavingInfo(false);
  };

  const openAddSpot = () => {
    setEditingSpot(null);
    setSpotInput({ ...EMPTY_SPOT, local_tips: ['', '', ''], etiquette_tips: ['', '', ''], phrases: [{ japanese: '', reading: '', meaning: '' }, { japanese: '', reading: '', meaning: '' }] });
    setSpotError(false);
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
    setSpotError(false);
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

    // 戻り値を見ずに閉じると、保存できていないのに保存されたように見える。
    // 失敗したときはモーダルを開いたままにして、入力を捨てない。
    const ok = editingSpot
      ? await updateCreatorSpot(editingSpot.id, packageId, cleanInput)
      : Boolean(await createCreatorSpot(packageId, spots.length + 1, cleanInput));

    setSpotError(!ok);
    if (!ok) {
      setSavingSpot(false);
      return;
    }

    await loadPackage(packageId);
    setShowSpotModal(false);
    setSavingSpot(false);
  };

  const handleDeleteSpot = async (spotId: string) => {
    if (!packageId || !confirm(t('pkgEdit.confirmDeleteSpot'))) return;
    const ok = await deleteCreatorSpot(spotId, packageId);
    // 成功時にクリアしないと、一度失敗したバナーが以降ずっと残る
    setActionError(!ok);
    if (!ok) return;
    setSpots((prev) => prev.filter((s) => s.id !== spotId));
  };

  const handleTogglePublish = async () => {
    if (!packageId) return;
    setPublishing(true);
    const next = status === 'published' ? 'draft' : 'published';
    const ok = await setPackageStatus(packageId, next);
    if (ok) setStatus(next);
    setActionError(!ok);
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
        <p className="text-[var(--muted)]">{t('common.loading')}</p>
      </div>
    );
  }

  if (sessionExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-[var(--muted)]">{t('common.sessionExpired')}</p>
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold hover:bg-[var(--primary)]/90 transition-colors"
        >
          {t('common.relogin')}
        </button>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--muted)]">{t('pkgEdit.notFound')}</p>
        <button
          onClick={() => router.push('/creator')}
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold hover:bg-[var(--primary)]/90 transition-colors"
        >
          {t('creator.title')}
        </button>
      </div>
    );
  }

  return (
    // 固定バーの高さは publishNote と actionError の有無で変わる。
    // pb-32(128px) 固定だと、バナー表示中にページ末尾（スポット一覧の
    // 削除ボタン）がバーの裏に入って出てこない。セーフエリア + 実際に
    // 出ている要素ぶんを確保する。
    <div
      className={cn(
        'min-h-screen bg-[var(--background)]',
        actionError
          ? 'pb-[calc(env(safe-area-inset-bottom)+14rem)]'
          : 'pb-[calc(env(safe-area-inset-bottom)+10rem)]',
      )}
    >
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white border-b border-[var(--border)] pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
          </button>
          <h1 className="flex-1 font-bold text-[var(--text-main)] truncate">
            {isNew ? t('pkgEdit.newTitle') : (title || t('pkgEdit.editTitle'))}
          </h1>
          {packageId && (
            <span className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium',
              status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            )}>
              {status === 'published' ? t('creator.status.published') : t('creator.status.draft')}
            </span>
          )}
        </div>
      </header>

      <div className="px-5 py-6 space-y-6">
        {/* ── 基本情報セクション ── */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-main)]">{t('pkgEdit.basic')}</h2>
            {infoSaved && <Check className="w-4 h-4 text-green-500" />}
          </div>
          {saveError && (
            <p role="alert" className="mx-4 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {t(
                saveError === 'forbidden' ? 'pkgEdit.saveFailed'
                : saveError === 'partial' ? 'pkgEdit.savePartial'
                : 'pkgEdit.saveError'
              )}
            </p>
          )}
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.title')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setInfoSaved(false); }}
                placeholder={t('pkgEdit.titlePlaceholder')}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.short')}</label>
              <input
                type="text"
                value={shortDesc}
                onChange={(e) => { setShortDesc(e.target.value); setInfoSaved(false); }}
                placeholder={t('pkgEdit.shortPlaceholder')}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.desc')}</label>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setInfoSaved(false); }}
                placeholder={t('pkgEdit.descPlaceholder')}
                rows={4}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.area')}</label>
                <select
                  value={areaId}
                  onChange={(e) => { setAreaId(e.target.value); setInfoSaved(false); }}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.category')}</label>
                <select
                  value={categoryId}
                  onChange={(e) => { setCategoryId(e.target.value); setInfoSaved(false); }}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.price')}</label>
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
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.duration')}</label>
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
            {/* 開始/終了地点。計画側で「Aの終了地点→Bの開始地点」の
                移動を計算するために使う。未設定でも保存できる #16 */}
            <div className="space-y-4">
              <PlacePicker
                label={t('pkgEdit.startPlace')}
                value={startPlace}
                onChange={setStartPlace}
              />
              <PlacePicker
                label={t('pkgEdit.endPlace')}
                value={endPlace}
                onChange={setEndPlace}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.thumbnail')}</label>
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
              disabled={!title.trim() || !areaId || !price || savingInfo}
              loading={savingInfo}
            >
              {infoSaved ? t('pkgEdit.saved') : t('pkgEdit.saveBasic')}
            </CTAButton>
          </div>
        </section>

        {/* ── スポット管理セクション ── */}
        {packageId && (
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-main)]">
                {t('pkgEdit.spots', { count: spots.length })}
              </h2>
              <button
                onClick={openAddSpot}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary-soft)] text-[var(--primary)] rounded-xl text-sm font-medium"
              >
                <Plus className="w-4 h-4" />{t('pkgEdit.addSpot')}
              </button>
            </div>

            {spots.length === 0 ? (
              <div className="py-10 text-center">
                <MapPin className="w-10 h-10 text-[var(--muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--muted)]">{t('pkgEdit.spotsEmpty')}</p>
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
                        <Clock className="w-3 h-3" />{t('spot.minutes', { count: spot.duration_minutes ?? 0 })}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditSpot(spot)}
                        className="px-3 py-1.5 text-xs font-medium text-[var(--primary)] border border-[var(--primary)]/30 rounded-lg hover:bg-[var(--primary-soft)] transition-colors"
                      >
                        {t('pkgEdit.edit')}
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
            {/* 公開トグルとスポット削除の失敗はここに出す。
                画面に固定して浮かせると、このバー自体（高さはセーフエリア分と
                publishNote の有無で変わる）に被さって公開ボタンのタップを奪う。
                バーの内側・ボタンの真上なら、高さが変わっても重ならない。 */}
            {actionError && (
              <p role="alert" className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                {t('pkgEdit.saveFailed')}
              </p>
            )}
            <CTAButton
              onClick={handleTogglePublish}
              fullWidth
              loading={publishing}
              variant={status === 'published' ? 'outline' : 'primary'}
            >
              {status === 'published'
                ? <><EyeOff className="w-5 h-5" />{t('creator.action.unpublish')}</>
                : <><Eye className="w-5 h-5" />{t('creator.action.publish')}</>
              }
            </CTAButton>
            {status !== 'published' && spots.length === 0 && (
              <p className="text-xs text-[var(--muted)] text-center mt-2">
                {t('pkgEdit.publishNote')}
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
                {editingSpot ? t('pkgEdit.spotModal.edit') : t('pkgEdit.spotModal.add')}
              </h2>
            </div>

            {/* スクロール可能なコンテンツ */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* 基本情報 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.spotName')}</label>
                  <input
                    type="text"
                    value={spotInput.name}
                    onChange={(e) => setSpotInput((p) => ({ ...p, name: e.target.value }))}
                    placeholder={t('pkgEdit.spotNamePlaceholder')}
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.spotDesc')}</label>
                  <textarea
                    value={spotInput.description}
                    onChange={(e) => setSpotInput((p) => ({ ...p, description: e.target.value }))}
                    placeholder={t('pkgEdit.spotDescPlaceholder')}
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
                    {t('pkgEdit.videoUrl')}
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
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.imageUrl')}</label>
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
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.spotDuration')}</label>
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
                  <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{t('pkgEdit.mapUrl')}</label>
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
                  <label className="text-xs font-medium text-[var(--text-sub)]">{t('pkgEdit.localTips')}</label>
                  <button onClick={() => addTip('local_tips')} className="text-xs text-[var(--primary)] font-medium">{t('pkgEdit.addRow')}</button>
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
                  <label className="text-xs font-medium text-[var(--text-sub)]">{t('pkgEdit.etiquette')}</label>
                  <button onClick={() => addTip('etiquette_tips')} className="text-xs text-[var(--primary)] font-medium">{t('pkgEdit.addRow')}</button>
                </div>
                <div className="space-y-2">
                  {spotInput.etiquette_tips.map((tip, i) => (
                    <input
                      key={i}
                      type="text"
                      value={tip}
                      onChange={(e) => setTip('etiquette_tips', i, e.target.value)}
                      placeholder={t('pkgEdit.etiquettePlaceholder', { n: i + 1 })}
                      className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  ))}
                </div>
              </div>

              {/* 日本語フレーズ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[var(--text-sub)]">{t('pkgEdit.phrases')}</label>
                  <button onClick={addPhrase} className="text-xs text-[var(--primary)] font-medium">{t('pkgEdit.addRow')}</button>
                </div>
                <div className="space-y-3">
                  {spotInput.phrases.map((phrase, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2">
                      <input
                        type="text"
                        value={phrase.japanese}
                        onChange={(e) => setPhrase(i, 'japanese', e.target.value)}
                        placeholder={t('pkgEdit.phraseJa')}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                      <input
                        type="text"
                        value={phrase.reading}
                        onChange={(e) => setPhrase(i, 'reading', e.target.value)}
                        placeholder={t('pkgEdit.phraseReading')}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                      <input
                        type="text"
                        value={phrase.meaning}
                        onChange={(e) => setPhrase(i, 'meaning', e.target.value)}
                        placeholder={t('pkgEdit.phraseMeaning')}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 固定ボタン */}
            <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] border-t border-gray-100 flex-shrink-0">
              {/* 保存できなかったときはボタンの真上に出す。モーダルは
                  中身がスクロールするので、上部に置くと見えないことがある */}
              {spotError && (
                <p role="alert" className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {t('pkgEdit.saveFailed')}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSpotModal(false)}
                  className="flex-1 py-3 border border-[var(--border)] rounded-2xl font-medium text-sm"
                >
                  {t('common.cancel')}
                </button>
                <CTAButton
                  onClick={handleSaveSpot}
                  className="flex-1"
                  disabled={!spotInput.name.trim() || savingSpot}
                  loading={savingSpot}
                >
                  {t('pkgEdit.save')}
                </CTAButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
