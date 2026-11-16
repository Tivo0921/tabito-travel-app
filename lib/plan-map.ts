import type { PlanItem } from './types';

/**
 * 計画の地図モード（#30）で使うマーカーの組み立て。描画から切り離して
 * テストできるよう、Google Maps に依存しない純粋な関数にしている。
 *
 * 将来 spots にも座標を持たせて「各訪問スポット」を出す予定がある。
 * そのため 1件の中身は package 前提で固定せず、kind で種類を持つ。
 * 'spot' を足すときは PlanMapEntryKind に加えて、組み立てを足すだけで済む。
 */
export type PlanMapEntryKind = 'package-start' | 'package-end' | 'package-start-end';

/** マーカーをタップしたときにカードへ並べる1件 */
export interface PlanMapEntry {
  kind: PlanMapEntryKind;
  /** 地点名（start_place_name / end_place_name） */
  placeName: string;
  /** 「ガイドを見る」の遷移先 /package/<packageId> */
  packageId: string;
  packageTitle: string;
  summary: string;
}

/** 地図上の1マーカー。同じ座標の地点は1つに畳み、entries に並べる */
export interface PlanMapMarker {
  /** 座標から作る安定したキー。React の key と選択状態に使う */
  id: string;
  lat: number;
  lng: number;
  entries: PlanMapEntry[];
}

export interface PlanMapData {
  markers: PlanMapMarker[];
  /**
   * 地図に出せない予定の件数。黙って消すと「計画から消えた」と誤解されるため、
   * 件数を画面に出す。数えるのは次のもの:
   * - 地点が未設定のパッケージ（展開済みのスポット行もパッケージ単位で1件）
   * - パッケージが削除されて中身を引けない行
   * - パッケージに由来しない予定（食事・移動・手入力のスポットなど）
   */
  unplaceableCount: number;
}

/**
 * 座標を同一とみなす精度。DB は numeric(9,6)（小数6桁）なので、
 * 6桁で丸めれば DB 上で同じ値は必ず同じキーになる。
 */
function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/**
 * 渡された予定（通常は表示中の Day の予定）から地図のマーカーを作る。
 *
 * - パッケージのブロック行と、展開したスポット行（package_id を持つ）は、
 *   同じパッケージなら1件として扱う。展開しても地図から消えないようにするため
 * - 開始と終了が同じ座標（往復コース）なら 'package-start-end' の1件にする
 * - 別のパッケージでも同じ座標なら1マーカーに畳み、カードに両方を並べる
 * - マーカーの並びは予定の順（最初に出てきた順）
 */
export function buildPlanMapData(items: PlanItem[]): PlanMapData {
  const markers = new Map<string, PlanMapMarker>();
  const seenPackages = new Set<string>();
  let unplaceableCount = 0;

  const add = (lat: number, lng: number, entry: PlanMapEntry) => {
    const id = coordKey(lat, lng);
    const existing = markers.get(id);
    if (existing) {
      existing.entries.push(entry);
    } else {
      markers.set(id, { id, lat, lng, entries: [entry] });
    }
  };

  for (const item of items) {
    const pkg = item.package;
    if (!pkg) {
      // パッケージ由来でない予定、または削除済みパッケージの行
      unplaceableCount += 1;
      continue;
    }
    // 同じパッケージの2行目以降（展開したスポット行）は、1件目で扱い済み
    if (seenPackages.has(pkg.id)) continue;
    seenPackages.add(pkg.id);

    const start = pkg.start_place ?? null;
    const end = pkg.end_place ?? null;
    if (!start && !end) {
      unplaceableCount += 1;
      continue;
    }

    const base = {
      packageId: pkg.id,
      packageTitle: pkg.title,
      summary: pkg.summary ?? '',
    };

    if (start && end && coordKey(start.latitude, start.longitude) === coordKey(end.latitude, end.longitude)) {
      add(start.latitude, start.longitude, { ...base, kind: 'package-start-end', placeName: start.name });
      continue;
    }
    if (start) add(start.latitude, start.longitude, { ...base, kind: 'package-start', placeName: start.name });
    if (end) add(end.latitude, end.longitude, { ...base, kind: 'package-end', placeName: end.name });
  }

  return { markers: [...markers.values()], unplaceableCount };
}

/** 全マーカーが収まる範囲。マーカーが無ければ null */
export function planMapBounds(
  markers: PlanMapMarker[],
): { north: number; south: number; east: number; west: number } | null {
  if (markers.length === 0) return null;
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (const m of markers) {
    north = Math.max(north, m.lat);
    south = Math.min(south, m.lat);
    east = Math.max(east, m.lng);
    west = Math.min(west, m.lng);
  }
  return { north, south, east, west };
}
