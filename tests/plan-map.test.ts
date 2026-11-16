import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPlanMapData, planMapBounds } from '@/lib/plan-map';
import { buildMapsScriptUrl, getBrowserMapsKey } from '@/lib/google-maps-loader';
import { fakeSupabase } from './helpers/supabase-mock';
import { expandPackageIntoPlan, getPlanItems, getPurchasedPackagesForPlan } from '@/lib/supabase/queries';
import type { PackagePlace, PlanItem, PlanItemPackage } from '@/lib/types';

let fakeClient: () => unknown = () => fakeSupabase({ userId: null, tables: {} });
vi.mock('@/lib/supabase/client', () => ({ createClient: () => fakeClient() }));

const place = (name: string, latitude: number, longitude: number): PackagePlace => ({
  place_id: `pid-${name}`,
  name,
  latitude,
  longitude,
});

const pkg = (id: string, over: Partial<PlanItemPackage> = {}): PlanItemPackage => ({
  id,
  title: `パッケージ${id}`,
  image_url: '',
  area: '',
  spot_count: 0,
  duration_minutes: null,
  guide_name: '',
  summary: `${id}の概要`,
  start_place: null,
  end_place: null,
  ...over,
});

let seq = 0;
const item = (over: Partial<PlanItem> = {}): PlanItem => ({
  id: `item-${++seq}`,
  plan_id: 'plan',
  day: 1,
  order: seq,
  item_type: 'other',
  title: 't',
  scheduled_time: null,
  duration_minutes: null,
  spot_id: null,
  manner_tip_id: null,
  package_id: null,
  source: 'manual',
  note: null,
  ...over,
});

const pkgItem = (p: PlanItemPackage, over: Partial<PlanItem> = {}) =>
  item({ item_type: 'package', package_id: p.id, source: 'package', package: p, ...over });

const asakusa = place('浅草寺', 35.714765, 139.796655);
const ueno = place('上野駅', 35.713768, 139.777254);
const kyoto = place('京都駅', 34.985849, 135.758767);

describe('buildPlanMapData (#30)', () => {
  it('予定が無ければマーカーも件数も0', () => {
    expect(buildPlanMapData([])).toEqual({ markers: [], unplaceableCount: 0 });
  });

  it('開始と終了が別の座標なら2マーカー。予定の順に並ぶ', () => {
    const data = buildPlanMapData([pkgItem(pkg('a', { start_place: asakusa, end_place: ueno }))]);
    expect(data.unplaceableCount).toBe(0);
    expect(data.markers).toHaveLength(2);
    expect(data.markers[0]).toMatchObject({ lat: asakusa.latitude, lng: asakusa.longitude });
    expect(data.markers[0].entries).toEqual([
      { kind: 'package-start', placeName: '浅草寺', packageId: 'a', packageTitle: 'パッケージa', summary: 'aの概要' },
    ]);
    expect(data.markers[1].entries[0]).toMatchObject({ kind: 'package-end', placeName: '上野駅' });
  });

  it('往復コース（開始と終了が同じ座標）は1マーカー・1件に畳む', () => {
    const data = buildPlanMapData([pkgItem(pkg('a', { start_place: asakusa, end_place: { ...asakusa } }))]);
    expect(data.markers).toHaveLength(1);
    expect(data.markers[0].entries).toHaveLength(1);
    expect(data.markers[0].entries[0].kind).toBe('package-start-end');
  });

  it('小数7桁目だけ違う座標は同じ地点とみなす（DB は小数6桁）', () => {
    const near = { ...asakusa, latitude: asakusa.latitude + 0.0000001 };
    const data = buildPlanMapData([pkgItem(pkg('a', { start_place: asakusa, end_place: near }))]);
    expect(data.markers).toHaveLength(1);
    expect(data.markers[0].entries[0].kind).toBe('package-start-end');
  });

  it('別のパッケージでも同じ座標なら1マーカーにまとめ、カードに両方並べる', () => {
    const data = buildPlanMapData([
      pkgItem(pkg('a', { start_place: asakusa, end_place: ueno })),
      pkgItem(pkg('b', { start_place: ueno, end_place: kyoto })),
    ]);
    expect(data.markers).toHaveLength(3);
    const uenoMarker = data.markers.find((m) => m.lat === ueno.latitude)!;
    expect(uenoMarker.entries.map((e) => [e.packageId, e.kind])).toEqual([
      ['a', 'package-end'],
      ['b', 'package-start'],
    ]);
  });

  it('片方の地点だけ設定されていれば、その1マーカーを出し未設定扱いにしない', () => {
    const data = buildPlanMapData([pkgItem(pkg('a', { start_place: asakusa, end_place: null }))]);
    expect(data.markers).toHaveLength(1);
    expect(data.unplaceableCount).toBe(0);
  });

  it('地点が未設定のパッケージはマーカーを出さず、件数に数える', () => {
    const data = buildPlanMapData([
      pkgItem(pkg('a')),
      pkgItem(pkg('b', { start_place: asakusa, end_place: ueno })),
    ]);
    expect(data.markers).toHaveLength(2);
    expect(data.unplaceableCount).toBe(1);
  });

  it('start_place / end_place が無い（undefined）パッケージも未設定として数える', () => {
    const p = pkg('a');
    delete p.start_place;
    delete p.end_place;
    expect(buildPlanMapData([pkgItem(p)])).toEqual({ markers: [], unplaceableCount: 1 });
  });

  it('展開したスポット行は、同じパッケージなら1件として扱い重複させない', () => {
    const p = pkg('a', { start_place: asakusa, end_place: ueno });
    const rows = [
      item({ item_type: 'spot', package_id: 'a', source: 'package', package: p }),
      item({ item_type: 'spot', package_id: 'a', source: 'package', package: p }),
      item({ item_type: 'spot', package_id: 'a', source: 'package', package: p }),
    ];
    const data = buildPlanMapData(rows);
    expect(data.markers).toHaveLength(2);
    expect(data.markers.every((m) => m.entries.length === 1)).toBe(true);
    expect(data.unplaceableCount).toBe(0);
  });

  it('地点未設定のパッケージを展開したスポット行も、パッケージ単位で1件と数える', () => {
    const p = pkg('a');
    const rows = [
      item({ item_type: 'spot', package_id: 'a', source: 'package', package: p }),
      item({ item_type: 'spot', package_id: 'a', source: 'package', package: p }),
    ];
    expect(buildPlanMapData(rows).unplaceableCount).toBe(1);
  });

  it('手入力の予定は数えない。削除・非公開でパッケージを引けない行は数える', () => {
    const data = buildPlanMapData([
      item({ item_type: 'meal' }),
      item({ item_type: 'spot', source: 'manual' }),
      item({ item_type: 'package', package_id: null, source: 'package' }),
      item({ item_type: 'spot', package_id: 'hidden', source: 'package' }),
      pkgItem(pkg('a', { start_place: kyoto, end_place: kyoto })),
    ]);
    expect(data.markers).toHaveLength(1);
    expect(data.unplaceableCount).toBe(2);
  });

  it('手入力の予定だけの日は、警告の件数も0', () => {
    expect(buildPlanMapData([item({ item_type: 'meal' }), item({ item_type: 'transport' })])).toEqual({
      markers: [],
      unplaceableCount: 0,
    });
  });

  it('マーカーの id は座標から作り、同じ入力なら同じ id になる', () => {
    const items = [pkgItem(pkg('a', { start_place: asakusa, end_place: ueno }))];
    expect(buildPlanMapData(items).markers.map((m) => m.id)).toEqual(
      buildPlanMapData(items).markers.map((m) => m.id),
    );
    expect(buildPlanMapData(items).markers[0].id).toBe('35.714765,139.796655');
  });
});

describe('planMapBounds (#30)', () => {
  it('マーカーが無ければ null', () => {
    expect(planMapBounds([])).toBeNull();
  });

  it('全マーカーが収まる範囲を返す', () => {
    const { markers } = buildPlanMapData([
      pkgItem(pkg('a', { start_place: asakusa, end_place: kyoto })),
      pkgItem(pkg('b', { start_place: ueno })),
    ]);
    expect(planMapBounds(markers)).toEqual({
      north: asakusa.latitude,
      south: kyoto.latitude,
      east: asakusa.longitude,
      west: kyoto.longitude,
    });
  });

  it('マーカー1つなら範囲は点になる', () => {
    const { markers } = buildPlanMapData([pkgItem(pkg('a', { start_place: kyoto }))]);
    expect(planMapBounds(markers)).toEqual({
      north: kyoto.latitude,
      south: kyoto.latitude,
      east: kyoto.longitude,
      west: kyoto.longitude,
    });
  });
});

describe('google-maps-loader (#30)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('ブラウザ公開キーが未設定なら null（地図モードは「利用できません」を出す）', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '');
    expect(getBrowserMapsKey()).toBeNull();
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '   ');
    expect(getBrowserMapsKey()).toBeNull();
  });

  it('サーバー専用の GOOGLE_MAPS_API_KEY は使わない', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '');
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'server-only-key');
    expect(getBrowserMapsKey()).toBeNull();
  });

  it('キーの前後の空白は落とす', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', ' browser-key ');
    expect(getBrowserMapsKey()).toBe('browser-key');
  });

  it('スクリプトの URL はキーをエンコードし、非同期読み込みとコールバックを指定する', () => {
    const url = new URL(buildMapsScriptUrl('a&b=c'));
    expect(url.origin + url.pathname).toBe('https://maps.googleapis.com/maps/api/js');
    expect(url.searchParams.get('key')).toBe('a&b=c');
    expect(url.searchParams.get('loading')).toBe('async');
    expect(url.searchParams.get('callback')).toBe('__tabitoGoogleMapsReady');
    expect(url.searchParams.has('b')).toBe(false);
  });
});

describe('getPlanItems の地点・概要 (#30)', () => {
  const row = (packages: unknown) => ({
    id: 'i1',
    plan_id: 'plan',
    day: 1,
    order: 0,
    item_type: 'package',
    title: 'x',
    scheduled_time: null,
    duration_minutes: null,
    spot_id: null,
    manner_tip_id: null,
    package_id: 'a',
    source: 'package',
    note: null,
    packages,
  });

  const basePkg = {
    id: 'a',
    image_url: null,
    spot_count: 2,
    duration_minutes: 60,
    areas: { name: '浅草' },
    package_translations: [{ title: 'タイトル', short_description: '短い概要' }],
    guides: { guide_translations: [{ name: 'ガイド' }] },
  };

  it('開始・終了地点と概要を載せる。座標が文字列でも数値にする', async () => {
    fakeClient = () =>
      fakeSupabase({
        userId: 'u1',
        tables: {
          plan_items: {
            data: [
              row({
                ...basePkg,
                start_place_id: 'p1', start_place_name: '浅草寺', start_latitude: '35.714765', start_longitude: 139.796655,
                end_place_id: 'p2', end_place_name: '上野駅', end_latitude: 35.713768, end_longitude: 139.777254,
              }),
            ],
            error: null,
          },
        },
      });
    const [it0] = await getPlanItems('plan');
    expect(it0.package?.summary).toBe('短い概要');
    expect(it0.package?.start_place).toEqual({ place_id: 'p1', name: '浅草寺', latitude: 35.714765, longitude: 139.796655 });
    expect(it0.package?.end_place).toEqual({ place_id: 'p2', name: '上野駅', latitude: 35.713768, longitude: 139.777254 });
  });

  it('地点が NULL・座標が数値に読めない行は null にする。概要が無ければ空文字', async () => {
    fakeClient = () =>
      fakeSupabase({
        userId: 'u1',
        tables: {
          plan_items: {
            data: [
              row({
                ...basePkg,
                package_translations: [{ title: 'タイトル', short_description: null }],
                start_place_id: null, start_place_name: null, start_latitude: null, start_longitude: null,
                end_place_id: 'p2', end_place_name: '上野駅', end_latitude: 'abc', end_longitude: 139.7,
              }),
            ],
            error: null,
          },
        },
      });
    const [it0] = await getPlanItems('plan');
    expect(it0.package?.summary).toBe('');
    expect(it0.package?.start_place).toBeNull();
    expect(it0.package?.end_place).toBeNull();
  });
});

describe('計画に置いた直後・展開した直後も地図に出る (#30)', () => {
  const pkgRow = {
    id: 'a',
    image_url: null,
    spot_count: 1,
    duration_minutes: 60,
    areas: { name: '浅草' },
    package_translations: [{ title: 'タイトル', short_description: '概要' }],
    guides: { guide_translations: [{ name: 'ガイド' }] },
    start_place_id: 'p1', start_place_name: '浅草寺', start_latitude: 35.714765, start_longitude: 139.796655,
    end_place_id: 'p1', end_place_name: '浅草寺', end_latitude: 35.714765, end_longitude: 139.796655,
  };

  it('購入済みパッケージの一覧にも地点と概要が載る（追加した行がそのまま地図に出る）', async () => {
    fakeClient = () =>
      fakeSupabase({ userId: 'u1', tables: { purchases: { data: [{ package_id: 'a', packages: pkgRow }], error: null } } });
    const [p] = await getPurchasedPackagesForPlan();
    expect(p.summary).toBe('概要');
    expect(p.start_place?.name).toBe('浅草寺');
    const data = buildPlanMapData([pkgItem(p)]);
    expect(data.markers).toHaveLength(1);
    expect(data.unplaceableCount).toBe(0);
  });

  it('展開して返る行に、展開元のパッケージ情報が載る', async () => {
    const p = pkg('a', { start_place: asakusa, end_place: ueno });
    const block = pkgItem(p, { id: 'block', order: 3 });
    const spotRow = {
      id: 's1', plan_id: 'plan', day: 1, order: 3, item_type: 'spot', title: 'スポット',
      scheduled_time: null, duration_minutes: 30, spot_id: 'spot1', manner_tip_id: null,
      package_id: 'a', source: 'package', note: null,
    };
    // spots の取得と plan_items の insert/delete を同じ偽テーブルで返す
    fakeClient = () => {
      const client = fakeSupabase({
        userId: 'u1',
        tables: {
          spots: { data: [{ id: 'spot1', name: 'スポット', duration_minutes: 30 }], error: null },
          plan_items: { data: [spotRow], error: null },
        },
      });
      const from = client.from;
      client.from = vi.fn((table: string) => {
        const chain = from(table) as Record<string, unknown>;
        chain.insert = () => chain;
        chain.delete = () => chain;
        chain.in = () => chain;
        return chain;
      }) as typeof client.from;
      return client;
    };
    const result = await expandPackageIntoPlan(block);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0].package).toBe(p);
    expect(buildPlanMapData(result.items).markers).toHaveLength(2);
  });
});
