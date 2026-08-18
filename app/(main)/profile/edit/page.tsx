'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Camera, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CTAButton } from '@/components/cta-button';
import type { User } from '@supabase/supabase-js';
import { useT } from '@/lib/i18n/provider';

export default function ProfileEditPage() {
  const t = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUser(data.user);
      setDisplayName(data.user.user_metadata?.full_name ?? '');
      setBio(data.user.user_metadata?.bio ?? '');
      setAvatarUrl(data.user.user_metadata?.avatar_url);
    });
  }, [router]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { full_name: displayName, bio },
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); router.back(); }, 800);
  };

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      <header className="px-5 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[var(--primary)] mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{t('profile.title')}</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{t('profileEdit.title')}</h1>
      </header>

      <div className="px-5 pb-8 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 ring-4 ring-[var(--primary-soft)]">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={t('profileEdit.avatar')} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">
                  {displayName.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-md"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" />
          </div>
          <p className="text-xs text-[var(--muted)] mt-2">{t('profileEdit.avatarHint')}</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-[var(--border)]">
            <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">{t('profileEdit.displayName')}</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('profileEdit.namePlaceholder')}
              maxLength={30}
              className="w-full text-sm text-[var(--text-main)] focus:outline-none bg-transparent"
            />
          </div>
          <div className="px-4 py-4">
            <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">{t('profileEdit.bio')}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('profileEdit.bioPlaceholder')}
              maxLength={150}
              rows={4}
              className="w-full text-sm text-[var(--text-main)] focus:outline-none bg-transparent resize-none"
            />
            <p className="text-right text-xs text-[var(--muted)] mt-1">{bio.length}/150</p>
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-4">
            <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">{t('profileEdit.email')}</label>
            <p className="text-sm text-[var(--text-sub)]">{user?.email ?? '—'}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{t('profileEdit.emailNote')}</p>
          </div>
        </div>

        {/* Save button */}
        <CTAButton
          onClick={handleSave}
          disabled={saving || saved || !displayName.trim()}
          className="w-full"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('common.saving')}
            </span>
          ) : saved ? (
            t('profileEdit.saved')
          ) : (
            t('profileEdit.save')
          )}
        </CTAButton>
      </div>
    </div>
  );
}
