import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreatorPackageInput } from '@/lib/supabase/queries';
import type { CreatorSpotInput } from '@/lib/types';

// クリエイターの保存（#22）は1回の RPC で行う。
// ここでは「RPC に何を渡すか」と「応答をどう解釈するか」を確かめる。
// SQL 関数そのもの（原子性・RLS）は scripts/test-atomic-creator-save.sql で確かめる。

const rpc = vi.fn();
const from = vi.fn(() => {
  throw new Error('保存は rpc 1回で行い、テーブルへ直接書かない');
});
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc, from }) }));

const { updateCreatorPackage, updateCreatorSpot, rpcSaveResult } = await import('@/lib/supabase/queries');

const pkgInput: CreatorPackageInput = {
  title: '浅草さんぽ',
  areaId: 'area-1',
  price: 1500,
  shortDescription: '短い説明',
  description: '長い説明',
  categoryId: '',
  imageUrl: '',
  durationMinutes: null,
  startPlace: { place_id: 'pl_1', name: '浅草駅', latitude: 35.71, longitude: 139.79 },
  endPlace: null,
};

const spotInput: CreatorSpotInput = {
  name: '雷門',
  description: '説明',
  image_url: '',
  video_url: 'https://example.com/v',
  duration_minutes: 0,
  map_url: '',
  shop_url: '',
  local_tips: ['朝が空いている', ''],
  etiquette_tips: [''],
  phrases: [
    { japanese: 'すみません', reading: 'sumimasen', meaning: 'Excuse me' },
    { japanese: '   ', reading: '', meaning: 'ignored' },
    { japanese: 'ありがとう', reading: 'arigatou', meaning: 'Thanks' },
  ],
};

beforeEach(() => {
  rpc.mockReset();
  from.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('rpcSaveResult', () => {
  it('true は ok', () => expect(rpcSaveResult(true, null, 'x')).toBe('ok'));
  it('false（RLS で0件）は forbidden', () => expect(rpcSaveResult(false, null, 'x')).toBe('forbidden'));
  it('42501 は forbidden', () =>
    expect(rpcSaveResult(null, { code: '42501', message: 'permission denied' }, 'x')).toBe('forbidden'));
  it('その他のエラーは error（所有権を疑う文言にしない）', () => {
    expect(rpcSaveResult(null, { code: '22023', message: 'name is required' }, 'x')).toBe('error');
    expect(rpcSaveResult(null, { code: 'PGRST202', message: 'function not found' }, 'x')).toBe('error');
    expect(rpcSaveResult(null, { message: 'fetch failed' }, 'x')).toBe('error');
  });
  it('想定外の応答（null・文字列・配列）は ok にしない', () => {
    expect(rpcSaveResult(null, null, 'x')).toBe('error');
    expect(rpcSaveResult('true', null, 'x')).toBe('error');
    expect(rpcSaveResult([true], null, 'x')).toBe('error');
  });
});

describe('updateCreatorPackage', () => {
  it('save_creator_package を1回だけ呼び、地点を列に展開して渡す', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(updateCreatorPackage('pkg-1', pkgInput)).resolves.toBe('ok');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('save_creator_package', {
      p_package_id: 'pkg-1',
      p_area_id: 'area-1',
      p_price: 1500,
      p_category_id: null,
      p_image_url: null,
      p_duration_minutes: null,
      p_start_place_id: 'pl_1',
      p_start_place_name: '浅草駅',
      p_start_latitude: 35.71,
      p_start_longitude: 139.79,
      p_end_place_id: null,
      p_end_place_name: null,
      p_end_latitude: null,
      p_end_longitude: null,
      p_title: '浅草さんぽ',
      p_short_description: '短い説明',
      p_description: '長い説明',
    });
  });

  it('他人のパッケージ（false）は forbidden', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(updateCreatorPackage('pkg-x', pkgInput)).resolves.toBe('forbidden');
  });

  it('通信・DB エラーは error。partial は返さない', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'check violation' } });
    await expect(updateCreatorPackage('pkg-1', pkgInput)).resolves.toBe('error');
  });
});

describe('updateCreatorSpot', () => {
  it('save_creator_spot を1回だけ呼び、空のフレーズとヒントを除いて渡す', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(updateCreatorSpot('spot-1', 'pkg-1', spotInput)).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('save_creator_spot', {
      p_spot_id: 'spot-1',
      p_package_id: 'pkg-1',
      p_image_url: null,
      p_video_url: 'https://example.com/v',
      p_duration_minutes: null,
      p_map_url: null,
      p_shop_url: null,
      p_name: '雷門',
      p_description: '説明',
      p_local_tips: ['朝が空いている'],
      p_etiquette_tips: [],
      p_phrases: [
        { japanese: 'すみません', reading: 'sumimasen', meaning: 'Excuse me' },
        { japanese: 'ありがとう', reading: 'arigatou', meaning: 'Thanks' },
      ],
    });
  });

  it('フレーズを全部消した保存は空配列を渡す（null にしない）', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await updateCreatorSpot('spot-1', 'pkg-1', { ...spotInput, phrases: [] });
    expect(rpc.mock.calls[0][1].p_phrases).toEqual([]);
  });

  it('false（他人のスポット・別パッケージのスポット）は失敗', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(updateCreatorSpot('spot-x', 'pkg-1', spotInput)).resolves.toBe(false);
  });

  it('エラーは失敗', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'network' } });
    await expect(updateCreatorSpot('spot-1', 'pkg-1', spotInput)).resolves.toBe(false);
  });
});
