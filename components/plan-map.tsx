'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MapPin, X, ChevronRight, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/provider';
import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';
import {
  getBrowserMapsKey,
  loadGoogleMaps,
  type GoogleMap,
  type GoogleMapsApi,
  type GoogleMarker,
} from '@/lib/google-maps-loader';
import { planMapBounds, type PlanMapData, type PlanMapEntryKind } from '@/lib/plan-map';

const KIND_LABEL: Record<PlanMapEntryKind, TranslationKey> = {
  'package-start': 'plan.map.kind.start',
  'package-end': 'plan.map.kind.end',
  'package-start-end': 'plan.map.kind.startEnd',
};

/** マーカーが1つだけのときの拡大率（街区がわかる程度） */
const SINGLE_MARKER_ZOOM = 14;
/** 初期中心（東京駅）。マーカーが無いときだけ使う */
const FALLBACK_CENTER = { lat: 35.681236, lng: 139.767125 };

type Status = 'loading' | 'ready' | 'error';

/**
 * 計画の地図モード #30。地図はガイドへの入口として置く。
 *
 * - キー未設定なら地図を読み込まず「利用できません」とだけ出す（計画画面は壊さない）
 * - マーカーのカードは InfoWindow（HTML 文字列）ではなく React で描く。
 *   パッケージ名・地点名はクリエイターの入力なので、文字列を HTML に流し込まない
 */
export function PlanMap({ data, visible }: { data: PlanMapData; visible: boolean }) {
  const t = useT();
  const apiKey = getBrowserMapsKey();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const apiRef = useRef<GoogleMapsApi | null>(null);
  const markerRefs = useRef<GoogleMarker[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 地図本体は1回だけ作る。Day を切り替えてもマーカーだけ差し替える
  // （地図の作り直しは Maps JavaScript API の課金対象の読み込みになるため）
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;

    // キーが無効・リファラ制限で拒否されたときに Google が呼ぶ
    const w = window as unknown as { gm_authFailure?: () => void };
    w.gm_authFailure = () => {
      if (!cancelled) setStatus('error');
    };

    loadGoogleMaps(apiKey)
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        apiRef.current = api;
        mapRef.current = new api.Map(containerRef.current, {
          center: FALLBACK_CENTER,
          zoom: SINGLE_MARKER_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          // 地図上の店舗アイコンを押しても Google の情報窓を出さない。
          // ここではガイドへの導線だけを出す
          clickableIcons: false,
          // スクロール中に地図が勝手に動かないよう、モバイルは2本指で操作する
          gestureHandling: 'cooperative',
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      markerRefs.current.forEach((m) => m.setMap(null));
      markerRefs.current = [];
      mapRef.current = null;
    };
  }, [apiKey]);

  // マーカーの差し替え
  useEffect(() => {
    const api = apiRef.current;
    const map = mapRef.current;
    // 非表示（幅0）の間に範囲を合わせても正しく収まらないので、表示されてから描く
    if (status !== 'ready' || !api || !map || !visible) return;

    markerRefs.current.forEach((m) => m.setMap(null));
    markerRefs.current = [];

    const listeners: { remove(): void }[] = [];
    data.markers.forEach((marker, index) => {
      const m = new api.Marker({
        position: { lat: marker.lat, lng: marker.lng },
        map,
        title: marker.entries.map((e) => e.placeName || e.packageTitle).join(' / '),
        // 一覧と対応がつくよう、出てきた順の番号を付ける
        label: String(index + 1),
      });
      listeners.push(m.addListener('click', () => setSelectedId(marker.id)));
      markerRefs.current.push(m);
    });

    const bounds = planMapBounds(data.markers);
    if (bounds && data.markers.length > 1) {
      map.fitBounds(bounds, 48);
    } else if (data.markers.length === 1) {
      map.setCenter({ lat: data.markers[0].lat, lng: data.markers[0].lng });
      map.setZoom(SINGLE_MARKER_ZOOM);
    }

    return () => listeners.forEach((l) => l.remove());
  }, [status, data.markers, visible]);

  // Day を切り替えて選択中のマーカーが無くなったら、カードを閉じる
  const selected = data.markers.find((m) => m.id === selectedId) ?? null;

  if (!apiKey) {
    return (
      <p role="status" className="p-4 rounded-xl bg-gray-50 text-sm text-[var(--text-sub)] text-center">
        {t('plan.map.unavailable')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative h-72 lg:h-[28rem] rounded-xl overflow-hidden bg-gray-100">
        <div ref={containerRef} className="absolute inset-0" />
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-[var(--text-sub)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('plan.map.loading')}
          </div>
        )}
        {status === 'error' && (
          <div role="alert" className="absolute inset-0 flex items-center justify-center p-6 bg-gray-50 text-sm text-[var(--text-sub)] text-center">
            {t('plan.map.loadFailed')}
          </div>
        )}
      </div>

      {data.unplaceableCount > 0 && (
        <p className="flex gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>{t('plan.map.unplaceable', { count: data.unplaceableCount })}</span>
        </p>
      )}

      {data.markers.length === 0 ? (
        <p className="text-sm text-[var(--muted)] text-center py-2">{t('plan.map.noMarkers')}</p>
      ) : (
        <>
          {selected && (
            <div className="p-4 rounded-xl border border-[var(--border)] bg-white space-y-3">
              <div className="flex justify-end -mb-2">
                <button
                  onClick={() => setSelectedId(null)}
                  aria-label={t('plan.map.close')}
                  className="p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-[var(--text-sub)]" />
                </button>
              </div>
              {selected.entries.map((entry) => (
                <div key={`${entry.packageId}-${entry.kind}`} className="space-y-1">
                  <p className="text-[11px] font-medium text-[var(--primary)]">{t(KIND_LABEL[entry.kind])}</p>
                  <p className="text-sm font-semibold text-[var(--text-main)]">{entry.packageTitle}</p>
                  {entry.placeName && (
                    <p className="flex items-center gap-1 text-xs text-[var(--text-sub)]">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {entry.placeName}
                    </p>
                  )}
                  {entry.summary && (
                    <p className="text-xs text-[var(--text-sub)] leading-relaxed line-clamp-3">{entry.summary}</p>
                  )}
                  <Link
                    href={`/package/${entry.packageId}`}
                    className="inline-flex items-center gap-1 mt-1 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium"
                  >
                    {t('plan.map.openGuide')}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* 地図を操作しにくい人や、マーカーが近くて押し分けにくいときのための一覧 */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-sub)] mb-2">{t('plan.map.places')}</p>
            <ul className="space-y-1.5">
              {data.markers.map((marker, index) => (
                <li key={marker.id}>
                  <button
                    onClick={() => setSelectedId(marker.id)}
                    aria-pressed={marker.id === selectedId}
                    className={cn(
                      'w-full flex items-start gap-2 p-2 rounded-lg text-left text-xs transition-colors',
                      marker.id === selectedId ? 'bg-[var(--primary-soft)]' : 'hover:bg-gray-50',
                    )}
                  >
                    <span className="w-5 h-5 flex-shrink-0 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[10px] font-bold">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      {marker.entries.map((entry) => (
                        <span key={`${entry.packageId}-${entry.kind}`} className="block truncate text-[var(--text-main)]">
                          {entry.placeName || entry.packageTitle}
                          <span className="text-[var(--muted)]"> · {t(KIND_LABEL[entry.kind])}</span>
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
