'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Package,
  Eye,
  EyeOff,
  Trash2,
  ChevronRight,
  MapPin,
  Star,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CTAButton } from '@/components/cta-button';
import {
  getMyGuideProfile,
  registerAsGuide,
  getMyCreatorPackages,
  deleteCreatorPackage,
  setPackageStatus,
} from '@/lib/supabase/queries';
import type { Guide } from '@/lib/types';
import { useT, useLocale } from '@/lib/i18n/provider';
import { formatPrice } from '@/lib/i18n/format';

type CreatorPackage = {
  id: string;
  title: string;
  image_url: string;
  area: string;
  price: number;
  spot_count: number;
  rating: number;
  status: string;
};

export default function CreatorPage() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [packages, setPackages] = useState<CreatorPackage[]>([]);
  const [actionError, setActionError] = useState(false);
  const [registerError, setRegisterError] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  // 登録フォーム
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [registering, setRegistering] = useState(false);

  // 取得失敗のバナーから引き直せるよう、マウント時の取得を関数に出す。
  // マウント時にしか実行できないと、通信が復旧してもバナーが残り続ける。
  const load = useCallback(async () => {
    const [g, result] = await Promise.all([
      getMyGuideProfile(),
      getMyCreatorPackages(),
    ]);
    // 未認証・取得失敗を「未登録・0件」と区別する。潰すと、ログインが
    // 切れただけ／通信に失敗しただけなのに登録フォームとパッケージ0件が
    // 出て、原因も再ログイン導線も分からない
    if (result.reason === 'unauthenticated') {
      setSessionExpired(true);
      return;
    }
    setGuide(g);
    // `as unknown as` を挟むと、戻り値の形を変えても tsc が検出しない。
    // MyCreatorPackagesResult 側が status を持つのでそのまま代入できる
    setPackages(result.packages);
    setLoadError(result.reason === 'error');
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const [reloading, setReloading] = useState(false);
  const handleReload = async () => {
    setReloading(true);
    // このボタンが押されるのは通信が不安定なとき。auth.getUser() は
    // ネットワーク断で reject し得るので、finally で必ず戻す。
    // でないと reloading が true のまま固定され、再試行が二度とできない。
    try {
      await load();
    } finally {
      setReloading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !location.trim()) return;
    setRegistering(true);
    setRegisterError(false);
    const g = await registerAsGuide(name, location, bio);
    if (g) {
      setGuide(g);
    } else {
      // null は「登録できなかった」。何も出さないと押しても無反応に見え、
      // ユーザーは連打して行を増やそうとする。#12
      setRegisterError(true);
    }
    setRegistering(false);
  };

  const handleDelete = async (pkgId: string) => {
    if (!confirm(t('creator.confirmDelete'))) return;
    // 楽観的に消すと、失敗しても消えたように見える
    const ok = await deleteCreatorPackage(pkgId);
    if (!ok) return setActionError(true);
    // 直前の操作が通ったのに、古い取得失敗のバナーが残らないようにする
    setActionError(false);
    setLoadError(false);
    setPackages((prev) => prev.filter((p) => p.id !== pkgId));
  };

  const handleToggleStatus = async (pkgId: string, currentStatus: string) => {
    const next = currentStatus === 'published' ? 'draft' : 'published';
    const ok = await setPackageStatus(pkgId, next);
    if (!ok) return setActionError(true);
    setActionError(false);
    setLoadError(false);
    setPackages((prev) =>
      prev.map((p) => p.id === pkgId ? { ...p, status: next } : p)
    );
  };

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

  return (
    <div className="pt-[env(safe-area-inset-top)] pb-10">
      {/* 公開トグルや削除はリストのどこからでも押せる。バナーをリスト先頭に
          置くと、下の方を操作したときに画面外で気付けない。画面に固定する。
          BottomNav(lg未満で表示)は約76px + env(safe-area-inset-bottom) なので、
          固定値の bottom-24(96px) だとノッチ端末でナビの下に潜る。
          セーフエリアを足した高さに出す。z も BottomNav(z-50)より上に置く
          （レイアウト上ナビの方が後に描画されるため、同値だと負ける）。 */}
      {(actionError || loadError) && (
        <div
          role="alert"
          className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+7rem)] z-[60] px-5 lg:bottom-6 lg:left-64"
        >
          <div className="mx-auto max-w-lg p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 shadow-lg flex items-center gap-3">
            <p className="flex-1">
              {t(actionError ? 'creator.actionFailed' : 'creator.loadFailed')}
            </p>
            {/* 取得失敗は引き直せる。操作失敗と同時に立っていても、
                引き直せること自体は変わらないので出す
                （!actionError を条件にすると両方立ったときに導線が消え、
                  loadError は次の成功操作まで残り続けていた） */}
            {loadError && (
              <button
                onClick={handleReload}
                disabled={reloading}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-red-100 font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                {t(reloading ? 'common.loading' : 'common.retry')}
              </button>
            )}
          </div>
        </div>
      )}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{t('creator.title')}</h1>
      </header>

      {!guide ? (
        /* ── ガイド未登録 ── */
        <div className="px-5">
          <div className="p-6 bg-gradient-to-br from-[var(--primary-soft)] to-[var(--accent)]/20 rounded-3xl mb-6">
            <h2 className="text-xl font-bold text-[var(--text-main)] mb-1">{t('creator.register.title')}</h2>
            <p className="text-sm text-[var(--text-sub)] mb-5">
              {t('creator.register.desc')}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">{t('creator.register.name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('creator.register.namePlaceholder')}
                  className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">{t('creator.register.area')}</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('creator.register.areaPlaceholder')}
                  className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">{t('creator.register.bio')}</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('creator.register.bioPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                />
              </div>
              {registerError && (
                <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {t('creator.registerFailed')}
                </p>
              )}
              <CTAButton
                onClick={handleRegister}
                fullWidth
                disabled={!name.trim() || !location.trim() || registering}
                loading={registering}
              >
                {t('creator.register.submit')}
              </CTAButton>
            </div>
          </div>
        </div>
      ) : (
        /* ── ガイド登録済み ── */
        <div className="px-5 space-y-5">
          {/* ガイドプロフィール */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm">
            <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              {guide.avatar_url ? (
                <Image src={guide.avatar_url} alt={guide.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl text-gray-400">
                  {guide.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--text-main)]">{guide.name}</p>
              <p className="text-sm text-[var(--text-sub)] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />{guide.location}
              </p>
              {guide.rating > 0 && (
                <p className="text-xs text-[var(--muted)] flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 fill-[var(--primary)] text-[var(--primary)]" />
                  {guide.rating} ({t('creator.reviewCount', { count: guide.review_count })})
                </p>
              )}
            </div>
          </div>

          {/* 統計 */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('creator.stat.packages'), value: packages.length },
              { label: t('creator.stat.published'), value: packages.filter((p) => p.status === 'published').length },
              { label: t('creator.stat.draft'), value: packages.filter((p) => p.status === 'draft').length },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-[var(--primary)]">{stat.value}</p>
                <p className="text-xs text-[var(--text-sub)]">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* パッケージ一覧 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[var(--text-main)]">{t('creator.list.title')}</h2>
              <Link
                href={`/creator/package/new?guide=${guide.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                {t('creator.list.new')}
              </Link>
            </div>

            {packages.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                <Package className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
                <p className="text-[var(--muted)] font-medium">{t('creator.list.empty')}</p>
                <p className="text-sm text-[var(--text-sub)] mt-1">{t('creator.list.emptyDesc')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <Link href={`/creator/package/${pkg.id}`} className="flex gap-3 p-3">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {pkg.image_url ? (
                          <Image src={pkg.image_url} alt={pkg.title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            pkg.status === 'published'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          )}>
                            {pkg.status === 'published' ? t('creator.status.published') : t('creator.status.draft')}
                          </span>
                        </div>
                        <p className="font-semibold text-[var(--text-main)] text-sm line-clamp-2">{pkg.title}</p>
                        <p className="text-xs text-[var(--text-sub)] mt-1">
                          {t('creator.meta', {
                            area: pkg.area,
                            spots: t('creator.spotCount', { count: pkg.spot_count }),
                            price: formatPrice(pkg.price, locale, t),
                          })}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--muted)] self-center flex-shrink-0" />
                    </Link>
                    <div className="flex border-t border-[var(--border)]">
                      <button
                        onClick={() => handleToggleStatus(pkg.id, pkg.status)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[var(--text-sub)] hover:bg-gray-50 transition-colors"
                      >
                        {pkg.status === 'published'
                          ? <><EyeOff className="w-3.5 h-3.5" />{t('creator.action.unpublish')}</>
                          : <><Eye className="w-3.5 h-3.5" />{t('creator.action.publish')}</>
                        }
                      </button>
                      <div className="w-px bg-[var(--border)]" />
                      <button
                        onClick={() => handleDelete(pkg.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />{t('creator.action.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
