/**
 * 計画一覧を読み込み終えたときに選択する計画の ID を返す (#62)。
 *
 * 読み込み中に利用者が計画を選んだ（または新しく作った）場合は、その選択を
 * 残す。何も選ばれていなければ先頭の計画を選ぶ。
 *
 * `setSelectedPlanId((prev) => pickPlanAfterLoad(prev, data))` のように
 * 関数形式の更新で使うこと。effect の中で `selectedPlanId` を直接読むと、
 * マウント時にキャプチャした null で判定してしまい、選択が先頭へ戻る。
 */
export function pickPlanAfterLoad(
  current: string | null,
  plans: ReadonlyArray<{ id: string }>,
): string | null {
  if (current !== null) return current;
  return plans[0]?.id ?? null;
}
