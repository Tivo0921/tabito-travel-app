import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';

/**
 * 特定商取引法に基づく表記の事業者情報。#67
 *
 * **オーナーが記入する。推測で埋めない。** null の項目は画面に
 * 「未記入」のプレースホルダが出るので、公開前に必ず全部埋めること
 * （`missingBusinessFields()` が空になれば記入済み）。
 *
 * 法的な正本は日本語なので、どの表示言語でも同じ文字列（日本語）を出す。
 * 個人事業で住所・電話番号を「請求があれば遅滞なく開示する」形にする場合は、
 * その旨の文面をここにそのまま書けばよい。
 */
export const BUSINESS_INFO: Record<BusinessField, string | null> = {
  sellerName: null,
  representative: null,
  address: null,
  phone: null,
  email: null,
  // 販売価格の表示。消費税の扱い（税込か、課税事業者か）はオーナーが決めて書く。
  // 例: 「各パッケージのページに表示された金額（税込）」
  price: null,
};

export type BusinessField = 'sellerName' | 'representative' | 'address' | 'phone' | 'email' | 'price';

export type NoticeValue =
  | { kind: 'business'; field: BusinessField; value: string | null }
  | { kind: 'text'; key: TranslationKey }
  | { kind: 'link'; key: TranslationKey; href: string };

export type NoticeRow = { labelKey: TranslationKey; value: NoticeValue };

/** 表記の行。並びは消費者庁の例示（通信販売の表示事項）に合わせる */
export function buildLegalNoticeRows(
  info: Record<BusinessField, string | null> = BUSINESS_INFO,
): NoticeRow[] {
  const business = (field: BusinessField): NoticeValue => {
    const raw = info[field];
    // 空白だけの値は未記入として扱う（「記入済み」に見せない）
    const value = raw && raw.trim() ? raw.trim() : null;
    return { kind: 'business', field, value };
  };
  return [
    { labelKey: 'legalNotice.row.seller', value: business('sellerName') },
    { labelKey: 'legalNotice.row.representative', value: business('representative') },
    { labelKey: 'legalNotice.row.address', value: business('address') },
    { labelKey: 'legalNotice.row.phone', value: business('phone') },
    { labelKey: 'legalNotice.row.email', value: business('email') },
    { labelKey: 'legalNotice.row.price', value: business('price') },
    { labelKey: 'legalNotice.row.extraFees', value: { kind: 'text', key: 'legalNotice.value.extraFees' } },
    { labelKey: 'legalNotice.row.payment', value: { kind: 'text', key: 'legalNotice.value.payment' } },
    { labelKey: 'legalNotice.row.paymentTiming', value: { kind: 'text', key: 'legalNotice.value.paymentTiming' } },
    { labelKey: 'legalNotice.row.delivery', value: { kind: 'text', key: 'legalNotice.value.delivery' } },
    { labelKey: 'legalNotice.row.returns', value: { kind: 'link', key: 'legalNotice.value.returns', href: '/settings/refund' } },
    { labelKey: 'legalNotice.row.environment', value: { kind: 'text', key: 'legalNotice.value.environment' } },
  ];
}

/**
 * 未記入の事業者情報。公開前チェック用。
 * 1つでも残っていると、表記に「未記入」が出たまま公開されることになる
 * （本番リリース前に空であることを確かめる）。
 */
export function missingBusinessFields(
  info: Record<BusinessField, string | null> = BUSINESS_INFO,
): BusinessField[] {
  return buildLegalNoticeRows(info)
    .map((r) => r.value)
    .filter((v): v is Extract<NoticeValue, { kind: 'business' }> => v.kind === 'business' && v.value === null)
    .map((v) => v.field);
}

/** 返金ポリシーの節。本文はすべて辞書（ja が正本） */
export const REFUND_SECTIONS: { titleKey: TranslationKey; bodyKeys: TranslationKey[] }[] = [
  { titleKey: 'refund.s1.title', bodyKeys: ['refund.s1.p1'] },
  { titleKey: 'refund.s2.title', bodyKeys: ['refund.s2.p1', 'refund.s2.p2', 'refund.s2.p3'] },
  { titleKey: 'refund.s3.title', bodyKeys: ['refund.s3.p1'] },
  { titleKey: 'refund.s4.title', bodyKeys: ['refund.s4.p1'] },
];
