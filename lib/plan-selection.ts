/**
 * 計画一覧の初回読み込みの扱い (#62)。
 *
 * 一覧の読み込み中でも、空の状態の画面から計画を新しく作れる。
 * 作った計画は handleCreatePlan が一覧の先頭に入れて選択するが、
 * 読み込みの SELECT はその INSERT より前に送られているので、
 * 返ってきた一覧には含まれないことがある。
 */

/**
 * 読み込んだ一覧に、読み込み中に手元で追加した計画を足す。
 * 手元にしか無い計画は先頭に置く（新規作成は先頭に入れる、という画面の並びと揃える）。
 * 同じ ID は読み込んだ側を使う。
 */
export function mergeLoadedPlans<T extends { id: string }>(
  local: ReadonlyArray<T>,
  loaded: ReadonlyArray<T>,
): T[] {
  const loadedIds = new Set(loaded.map((p) => p.id));
  return [...local.filter((p) => !loadedIds.has(p.id)), ...loaded];
}

/**
 * 読み込みを終えたときに選択する計画の ID を返す。
 *
 * `plans` には mergeLoadedPlans の結果を渡す。今の選択がその中にあれば残し、
 * 無ければ（または未選択なら）先頭を選ぶ。選択が一覧に無い計画を指したまま
 * になると、詳細が出ずに画面が空になる。
 *
 * 関数形式の更新で使うこと。effect の中で `selectedPlanId` を直接読むと、
 * マウント時にキャプチャした null で判定してしまい、選択が先頭へ戻る。
 */
export function pickPlanAfterLoad(
  current: string | null,
  plans: ReadonlyArray<{ id: string }>,
): string | null {
  if (current !== null && plans.some((p) => p.id === current)) return current;
  return plans[0]?.id ?? null;
}
