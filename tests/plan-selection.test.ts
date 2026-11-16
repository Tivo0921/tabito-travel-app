import { describe, expect, it } from 'vitest';
import { mergeLoadedPlans, pickPlanAfterLoad } from '@/lib/plan-selection';

const loaded = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }];

describe('mergeLoadedPlans (#62)', () => {
  it('手元が空なら読み込んだ一覧そのまま', () => {
    expect(mergeLoadedPlans([], loaded)).toEqual(loaded);
  });

  it('読み込み中に作った計画（読み込み結果に無い）を先頭に残す', () => {
    expect(mergeLoadedPlans([{ id: 'new' }], loaded).map((p) => p.id)).toEqual(['new', 'p1', 'p2', 'p3']);
  });

  it('同じ ID は重複させず、読み込んだ側を使う', () => {
    const local = [{ id: 'p2', title: 'local' }];
    const fresh = [{ id: 'p1', title: 'a' }, { id: 'p2', title: 'server' }];
    expect(mergeLoadedPlans(local, fresh)).toEqual(fresh);
  });

  it('読み込み結果が0件でも、作った計画は残る', () => {
    expect(mergeLoadedPlans([{ id: 'new' }], [])).toEqual([{ id: 'new' }]);
  });

  it('同じ一覧を2回読み込んでも（Strict Mode の二重実行）重複しない', () => {
    expect(mergeLoadedPlans(mergeLoadedPlans([], loaded), loaded)).toEqual(loaded);
  });
});

describe('pickPlanAfterLoad (#62)', () => {
  it('未選択なら先頭の計画を選ぶ', () => {
    expect(pickPlanAfterLoad(null, loaded)).toBe('p1');
  });

  it('一覧にある選択は先頭で上書きしない（読み込み中に選んだ計画）', () => {
    expect(pickPlanAfterLoad('p2', loaded)).toBe('p2');
  });

  it('読み込み中に作った計画は、マージ後の一覧にあるので残る', () => {
    const merged = mergeLoadedPlans([{ id: 'new' }], loaded);
    expect(pickPlanAfterLoad('new', merged)).toBe('new');
  });

  it('一覧に無い計画を指したままにしない（詳細が出ず空の画面になるため）', () => {
    expect(pickPlanAfterLoad('gone', loaded)).toBe('p1');
  });

  it('一覧が0件なら null', () => {
    expect(pickPlanAfterLoad(null, [])).toBeNull();
    expect(pickPlanAfterLoad('gone', [])).toBeNull();
  });
});
