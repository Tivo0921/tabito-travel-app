'use client';

import { useCallback, useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { getMyCreatorEarnings, type CreatorEarnings } from '@/lib/creator-earnings';
import { useT, useLocale } from '@/lib/i18n/provider';
import { formatPrice } from '@/lib/i18n/format';

/**
 * クリエイター管理画面の売上カード（#19）。
 * 集計は DB 関数が購入時点で確定した分配から出す。画面側では計算しない。
 */
export function CreatorEarningsCard() {
  const t = useT();
  const { locale } = useLocale();
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMyCreatorEarnings();
      if (result.ok) {
        setEarnings(result.earnings);
        setFailed(false);
      } else {
        // 未ログインは親画面が再ログイン導線を出すので、ここでは失敗表示だけにする
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const yen = (n: number) => formatPrice(n, locale, t);

  return (
    <section className="p-4 bg-white rounded-2xl shadow-sm" aria-labelledby="creator-earnings-title">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-[var(--primary)]" />
        <h2 id="creator-earnings-title" className="font-bold text-[var(--text-main)]">
          {t('creator.earnings.title')}
        </h2>
      </div>

      {loading && !earnings ? (
        <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p>
      ) : failed && !earnings ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-red-600">
          <p className="flex-1">{t('creator.earnings.loadFailed')}</p>
          <button
            onClick={load}
            disabled={loading}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-red-50 font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {t(loading ? 'common.loading' : 'common.retry')}
          </button>
        </div>
      ) : earnings ? (
        <>
          <p className="text-xs text-[var(--text-sub)]">{t('creator.earnings.unpaid')}</p>
          <p className="text-2xl font-bold text-[var(--primary)] mb-3">{yen(earnings.unpaidNet)}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm lg:grid-cols-4">
            {[
              { label: t('creator.earnings.sales'), value: earnings.salesCount.toLocaleString(locale) },
              { label: t('creator.earnings.gross'), value: yen(earnings.grossAmount) },
              { label: t('creator.earnings.fee'), value: yen(earnings.platformFee) },
              { label: t('creator.earnings.net'), value: yen(earnings.creatorNet) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between gap-2 lg:flex-col lg:justify-start">
                <dt className="text-[var(--text-sub)]">{row.label}</dt>
                <dd className="font-medium text-[var(--text-main)]">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-[var(--muted)]">{t('creator.earnings.note')}</p>
        </>
      ) : null}
    </section>
  );
}
