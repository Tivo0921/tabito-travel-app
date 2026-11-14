import { describe, expect, it } from 'vitest';
import { buildLegalNoticeRows, missingBusinessFields, REFUND_SECTIONS } from '@/lib/legal/notice';
import { ja } from '@/lib/i18n/dictionaries/ja';
import { en } from '@/lib/i18n/dictionaries/en';
import { ko } from '@/lib/i18n/dictionaries/ko';

const FILLED = {
  sellerName: 'テスト事業者',
  representative: '山田太郎',
  address: '東京都',
  phone: '03-0000-0000',
  email: 'a@example.com',
  price: '各パッケージのページに表示された金額（税込）',
};
const EMPTY = { sellerName: null, representative: null, address: null, phone: null, email: null, price: null };

describe('buildLegalNoticeRows', () => {
  it('未記入（null）の項目はすべて missing として返し、値を作らない', () => {
    expect(missingBusinessFields(EMPTY)).toEqual(['sellerName', 'representative', 'address', 'phone', 'email', 'price']);
    for (const r of buildLegalNoticeRows(EMPTY)) {
      if (r.value.kind === 'business') expect(r.value.value).toBeNull();
    }
  });
  it('記入した値をそのまま（前後の空白を除いて）出す', () => {
    const rows = buildLegalNoticeRows({ ...FILLED, address: '  東京都  ' });
    const address = rows.find((r) => r.labelKey === 'legalNotice.row.address')!.value;
    expect(address).toEqual({ kind: 'business', field: 'address', value: '東京都' });
    expect(missingBusinessFields(FILLED)).toEqual([]);
  });
  it('空文字・空白だけは未記入として扱う', () => {
    expect(missingBusinessFields({ ...FILLED, phone: '', email: '   ' })).toEqual(['phone', 'email']);
  });
  it('特商法の必須事項（価格・追加料金・支払方法と時期・引渡時期・返品）を含む', () => {
    const labels = buildLegalNoticeRows().map((r) => r.labelKey);
    for (const k of [
      'legalNotice.row.seller', 'legalNotice.row.address', 'legalNotice.row.phone', 'legalNotice.row.price',
      'legalNotice.row.extraFees', 'legalNotice.row.payment', 'legalNotice.row.paymentTiming',
      'legalNotice.row.delivery', 'legalNotice.row.returns',
    ] as const) expect(labels).toContain(k);
    expect(new Set(labels).size).toBe(labels.length);
  });
  it('返品・キャンセルは返金ポリシーのページへリンクする', () => {
    const returns = buildLegalNoticeRows().find((r) => r.labelKey === 'legalNotice.row.returns')!.value;
    expect(returns).toEqual({ kind: 'link', key: 'legalNotice.value.returns', href: '/settings/refund' });
  });
});

describe('文言', () => {
  const keys = [
    ...buildLegalNoticeRows().flatMap((r) => [r.labelKey, ...(r.value.kind === 'business' ? [] : [r.value.key])]),
    ...REFUND_SECTIONS.flatMap((s) => [s.titleKey, ...s.bodyKeys]),
    'legalNotice.placeholder', 'settings.item.legal', 'settings.item.refund', 'package.modal.policyNote',
  ] as const;
  it.each([['ja', ja], ['en', en], ['ko', ko]] as const)('%s に空でない文言がある', (_lang, dict) => {
    for (const k of keys) expect((dict as Record<string, string>)[k]?.trim(), k).toBeTruthy();
  });
  it.each([['en', en], ['ko', ko]] as const)('%s は日本語のままになっていない（翻訳漏れ）', (_lang, dict) => {
    for (const k of keys) expect((dict as Record<string, string>)[k], k).not.toBe((ja as Record<string, string>)[k]);
  });
  it('返金の条件は箇条書きの節としてまとめる', () => {
    expect(REFUND_SECTIONS.filter((s) => s.list).map((s) => s.titleKey)).toEqual(['refund.s2.title']);
  });
});
