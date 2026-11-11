import { describe, expect, it } from 'vitest';
import { BUSINESS_INFO, buildLegalNoticeRows, missingBusinessFields, REFUND_SECTIONS } from '@/lib/legal/notice';
import { ja } from '@/lib/i18n/dictionaries/ja';
import { en } from '@/lib/i18n/dictionaries/en';
import { ko } from '@/lib/i18n/dictionaries/ko';

const FILLED = {
  sellerName: 'テスト事業者',
  representative: '山田太郎',
  address: '東京都',
  phone: '03-0000-0000',
  email: 'a@example.com',
};

describe('buildLegalNoticeRows', () => {
  it('事業者情報は推測で埋めず、既定ではすべて未記入', () => {
    expect(Object.values(BUSINESS_INFO).every((v) => v === null)).toBe(true);
    expect(missingBusinessFields()).toEqual(['sellerName', 'representative', 'address', 'phone', 'email']);
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
  it('返金ポリシーは利用規約の「原則として返金不可」と矛盾しない', () => {
    expect(ja['terms.s3.p2']).toContain('原則として購入後の返金はできません');
    expect(ja['refund.s1.p1']).toContain('返金・キャンセルはお受けしていません');
  });
});
