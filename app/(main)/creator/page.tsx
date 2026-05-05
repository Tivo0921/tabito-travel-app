'use client';

import { useState, useEffect } from 'react';
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
  const router = useRouter();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [packages, setPackages] = useState<CreatorPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // 登録フォーム
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    Promise.all([
      getMyGuideProfile(),
      getMyCreatorPackages(),
    ]).then(([g, pkgs]) => {
      setGuide(g);
      setPackages(pkgs as unknown as CreatorPackage[]);
    }).finally(() => setLoading(false));
  }, []);

  const handleRegister = async () => {
    if (!name.trim() || !location.trim()) return;
    setRegistering(true);
    const g = await registerAsGuide(name, location, bio);
    if (g) {
      setGuide(g);
    }
    setRegistering(false);
  };

  const handleDelete = async (pkgId: string) => {
    if (!confirm('このパッケージを削除しますか？')) return;
    await deleteCreatorPackage(pkgId);
    setPackages((prev) => prev.filter((p) => p.id !== pkgId));
  };

  const handleToggleStatus = async (pkgId: string, currentStatus: string) => {
    const next = currentStatus === 'published' ? 'draft' : 'published';
    await setPackageStatus(pkgId, next);
    setPackages((prev) =>
      prev.map((p) => p.id === pkgId ? { ...p, status: next } : p)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="pt-[env(safe-area-inset-top)] pb-10">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">クリエイター管理</h1>
      </header>

      {!guide ? (
        /* ── ガイド未登録 ── */
        <div className="px-5">
          <div className="p-6 bg-gradient-to-br from-[var(--primary-soft)] to-[var(--accent)]/20 rounded-3xl mb-6">
            <h2 className="text-xl font-bold text-[var(--text-main)] mb-1">ガイドとして登録する</h2>
            <p className="text-sm text-[var(--text-sub)] mb-5">
              あなたの体験を販売できます。日本に住む韓国人として、独自のツアーを作成しましょう。
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">表示名 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：田中ソラ"
                  className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">活動エリア *</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="例：東京"
                  className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">自己紹介</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="例：東京在住7年の韓国人。グルメと下町散歩が得意です。"
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                />
              </div>
              <CTAButton
                onClick={handleRegister}
                fullWidth
                disabled={!name.trim() || !location.trim() || registering}
                loading={registering}
              >
                ガイド登録する
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
                  {guide.rating} ({guide.review_count}件)
                </p>
              )}
            </div>
          </div>

          {/* 統計 */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'パッケージ', value: packages.length },
              { label: '公開中', value: packages.filter((p) => p.status === 'published').length },
              { label: '下書き', value: packages.filter((p) => p.status === 'draft').length },
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
              <h2 className="font-bold text-[var(--text-main)]">パッケージ一覧</h2>
              <Link
                href={`/creator/package/new?guide=${guide.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                新規作成
              </Link>
            </div>

            {packages.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                <Package className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
                <p className="text-[var(--muted)] font-medium">パッケージがまだありません</p>
                <p className="text-sm text-[var(--text-sub)] mt-1">「新規作成」から始めましょう</p>
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
                            {pkg.status === 'published' ? '公開中' : '下書き'}
                          </span>
                        </div>
                        <p className="font-semibold text-[var(--text-main)] text-sm line-clamp-2">{pkg.title}</p>
                        <p className="text-xs text-[var(--text-sub)] mt-1">
                          {pkg.area} · {pkg.spot_count}スポット · ¥{pkg.price.toLocaleString()}
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
                          ? <><EyeOff className="w-3.5 h-3.5" />下書きに戻す</>
                          : <><Eye className="w-3.5 h-3.5" />公開する</>
                        }
                      </button>
                      <div className="w-px bg-[var(--border)]" />
                      <button
                        onClick={() => handleDelete(pkg.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />削除
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
