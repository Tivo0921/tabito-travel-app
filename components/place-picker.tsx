'use client';

import { useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { useT } from '@/lib/i18n/provider';
import type { PackagePlace, PlaceCandidate } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';

/** サーバー側と同じ下限。ここで止めれば無駄な往復もしない */
const MIN_QUERY_LENGTH = 2;

type Status = 'idle' | 'searching' | 'no-results' | 'error' | 'unavailable';

/**
 * Google Places から地点を1つ選ぶ入力。
 *
 * 地図は出さない。Maps JavaScript API を使うとブラウザ用の公開キーが
 * 別途必要になるため、住所テキストで足りる範囲に留めている。
 *
 * 検索が失敗しても呼び出し側のフォームは壊さない。この中で完結させ、
 * 未設定のまま保存できる状態を維持する。
 */
export function PlacePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PackagePlace | null;
  onChange: (place: PackagePlace | null) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [status, setStatus] = useState<Status>('idle');

  const search = async () => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return;

    setStatus('searching');
    setResults([]);
    try {
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });

      if (res.status === 503) {
        // キーが未設定の環境（PRプレビュー等）。編集自体は続けられる
        setStatus('unavailable');
        return;
      }
      if (!res.ok) {
        setStatus('error');
        return;
      }

      const data = (await res.json()) as { results?: PlaceCandidate[] };
      const found = data.results ?? [];
      setResults(found);
      setStatus(found.length === 0 ? 'no-results' : 'idle');
    } catch {
      setStatus('error');
    }
  };

  const select = (c: PlaceCandidate) => {
    onChange({
      place_id: c.place_id,
      name: c.name,
      latitude: c.latitude,
      longitude: c.longitude,
    });
    setResults([]);
    setQuery('');
    setStatus('idle');
  };

  const messageKey: TranslationKey | null =
    status === 'searching' ? 'pkgEdit.placeSearching'
    : status === 'no-results' ? 'pkgEdit.placeNoResults'
    : status === 'unavailable' ? 'pkgEdit.placeUnavailable'
    : status === 'error' ? 'pkgEdit.placeError'
    : null;

  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-sub)] mb-1.5">{label}</label>

      {value ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-[var(--primary-soft)] rounded-xl">
          <MapPin className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
          <span className="flex-1 min-w-0 text-sm text-[var(--text-main)] truncate">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t('pkgEdit.placeClear')}
            className="p-1 hover:bg-white/60 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-[var(--text-sub)]" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setStatus('idle'); }}
              // Enter でフォーム全体が送信されないよう、ここで拾って検索に回す
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
              placeholder={t('pkgEdit.placePlaceholder')}
              maxLength={100}
              className="flex-1 min-w-0 px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <button
              type="button"
              onClick={search}
              disabled={query.trim().length < MIN_QUERY_LENGTH || status === 'searching'}
              className="px-4 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[var(--primary)]/90 transition-colors flex-shrink-0"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {messageKey && (
            <p
              role={status === 'error' || status === 'unavailable' ? 'alert' : undefined}
              className={`text-xs mt-1.5 ${status === 'error' || status === 'unavailable' ? 'text-red-600' : 'text-[var(--muted)]'}`}
            >
              {t(messageKey)}
            </p>
          )}

          {results.length > 0 && (
            <ul className="mt-2 border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
              {results.map((c) => (
                <li key={c.place_id}>
                  <button
                    type="button"
                    onClick={() => select(c)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-[var(--text-main)]">{c.name}</p>
                    {c.address && <p className="text-xs text-[var(--muted)] truncate">{c.address}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
