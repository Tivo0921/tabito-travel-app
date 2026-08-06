import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LocaleProvider } from '@/lib/i18n/provider'
import { getLocaleFromCookie } from '@/lib/i18n/server'
import './globals.css'

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'TABITO - 日本旅行をもっと深く',
  description: '現地ガイドが案内する本物の日本旅行ガイド',
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
    title: 'TABITO - 日本旅行をもっと深く',
    description: '現地ガイドが案内する本物の日本旅行ガイド',
    siteName: 'TABITO',
    type: 'website',
    images: [{ url: '/brand/icon-512.png', width: 512, height: 512, alt: 'TABITO' }],
  },
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
  const locale = await getLocaleFromCookie()

  return (
    <html lang={locale}>
      <body className={`${notoSansJP.variable} font-sans antialiased`}>
        {isTestMode && (
          <div className="w-full bg-yellow-400 text-yellow-900 text-center text-xs font-semibold py-1.5 sticky top-0 z-[9999]">
            テストモード — 実際の決済は行われません
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
