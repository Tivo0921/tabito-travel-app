/**
 * Maps JavaScript API をブラウザで読み込む（計画の地図モード #30）。
 *
 * - キーは NEXT_PUBLIC_GOOGLE_MAPS_API_KEY（ブラウザ公開用）。サーバー専用の
 *   GOOGLE_MAPS_API_KEY は絶対に使わない。公開キー側は Google Cloud で
 *   「Maps JavaScript API のみ」「HTTP リファラ制限」「1日のクォータ」を設定する前提
 * - 地図モードを開いたときに初めて読み込む。タイムラインだけ使う人には
 *   スクリプトも地図の読み込み（課金対象）も発生しない
 * - 読み込みは1ページにつき1回。失敗したら次の呼び出しでやり直せるよう約束を捨てる
 */

/** このファイルで使う Maps JavaScript API の最小限の型 */
export interface GoogleLatLngBoundsLiteral {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GoogleMap {
  fitBounds(bounds: GoogleLatLngBoundsLiteral, padding?: number): void;
  setCenter(latLng: { lat: number; lng: number }): void;
  setZoom(zoom: number): void;
}

export interface GoogleMarker {
  setMap(map: GoogleMap | null): void;
  addListener(event: 'click', handler: () => void): { remove(): void };
}

export interface GoogleMapsApi {
  Map: new (
    el: HTMLElement,
    opts: {
      center: { lat: number; lng: number };
      zoom: number;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      clickableIcons?: boolean;
      gestureHandling?: 'cooperative' | 'greedy' | 'auto';
    },
  ) => GoogleMap;
  Marker: new (opts: {
    position: { lat: number; lng: number };
    map: GoogleMap;
    title?: string;
    label?: string;
  }) => GoogleMarker;
}

type GoogleGlobal = {
  maps: {
    importLibrary(name: 'maps' | 'marker'): Promise<Record<string, unknown>>;
  };
};

const CALLBACK_NAME = '__tabitoGoogleMapsReady';

let loading: Promise<GoogleMapsApi> | null = null;

/** ブラウザ公開キー。未設定・空白だけなら null（地図モードは「利用できません」を出す） */
export function getBrowserMapsKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return key && key.trim() !== '' ? key.trim() : null;
}

export function buildMapsScriptUrl(key: string): string {
  const params = new URLSearchParams({
    key,
    v: 'weekly',
    loading: 'async',
    callback: CALLBACK_NAME,
  });
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
}

export function loadGoogleMaps(key: string): Promise<GoogleMapsApi> {
  if (loading) return loading;

  loading = new Promise<GoogleMapsApi>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown> & { google?: GoogleGlobal };

    const finish = async () => {
      try {
        const g = w.google;
        if (!g?.maps?.importLibrary) throw new Error('google.maps is not available');
        const [maps, marker] = await Promise.all([
          g.maps.importLibrary('maps'),
          g.maps.importLibrary('marker'),
        ]);
        resolve({
          Map: maps.Map as GoogleMapsApi['Map'],
          Marker: marker.Marker as GoogleMapsApi['Marker'],
        });
      } catch (e) {
        reject(e);
      }
    };

    // 既に読み込み済み（別の画面で読んだあと戻ってきた等）
    if (w.google?.maps?.importLibrary) {
      void finish();
      return;
    }

    w[CALLBACK_NAME] = () => {
      void finish();
    };

    const script = document.createElement('script');
    script.src = buildMapsScriptUrl(key);
    script.async = true;
    script.onerror = () => {
      script.remove();
      reject(new Error('failed to load Maps JavaScript API'));
    };
    document.head.appendChild(script);
  }).catch((e) => {
    // 次に地図モードを開いたときにやり直せるようにする
    loading = null;
    throw e;
  });

  return loading;
}
