import { describe, expect, it } from 'vitest';
import { pickPlanAfterLoad } from '@/lib/plan-selection';

const plans = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }];

describe('pickPlanAfterLoad (#62)', () => {
  it('何も選ばれていなければ先頭の計画を選ぶ', () => {
    expect(pickPlanAfterLoad(null, plans)).toBe('p1');
  });

  it('読み込み中に選んだ計画は先頭で上書きしない', () => {
    expect(pickPlanAfterLoad('p2', plans)).toBe('p2');
  });

  it('読み込み中に作った計画（一覧にまだ無い）も残す', () => {
    expect(pickPlanAfterLoad('new-plan', plans)).toBe('new-plan');
  });

  it('計画が0件で未選択なら null のまま', () => {
    expect(pickPlanAfterLoad(null, [])).toBeNull();
  });

  it('計画が0件でも、選択済みならそのまま', () => {
    expect(pickPlanAfterLoad('p9', [])).toBe('p9');
  });
});
