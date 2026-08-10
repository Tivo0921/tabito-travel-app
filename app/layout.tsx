import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LocaleProvider } from '@/lib/i18n/provider'
import { resolveLocale } from '@/lib/i18n/server'
import { ja } from '@/lib/i18n/dictionaries/ja'
import { en } from '@/lib/i18n/dictionaries/en'
import { ko } from '@/lib/i18n/dictionaries/ko'
import './globals.css'

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

// メタデータも Cookie の言語に合わせる（検索結果やSNSシェアで正しい言語が出る）
export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const dict = { ja, en, ko }[locale]
  const title = dict['meta.title']
  const description = dict['meta.description']

  return {
  title,
  description,
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/brand/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/brand/apple-icon.png', sizes: '180x180', type: 'image/png' },
  },
  openGraph: {
    title,
    description,
    siteName: 'TABITO',
    type: 'website',
    images: [{ url: '/brand/icon-512.png', width: 512, height: 512, alt: 'TABITO' }],
  },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#B81417',
}

const isTestMode = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_');

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await resolveLocale()
  const dict = { ja, en, ko }[locale]

  return (
    <html lang={locale}>
      <body className={`${notoSansJP.variable} font-sans antialiased`}>
        {isTestMode && (
          <div className="w-full bg-yellow-400 text-yellow-900 text-center text-xs font-semibold py-1.5 sticky top-0 z-[9999]">
            {dict['meta.testMode']}
          </div>
        )}
        <LocaleProvider initialLocale={locale}>
          {children}
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  )
}
