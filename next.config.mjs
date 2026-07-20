/** @type {import('next').NextConfig} */
const nextConfig = {
  // 127.0.0.1 からの dev リソース（HMR WebSocket 等）アクセスを許可。
  // これが無いと Next.js 16 は 127.0.0.1 をクロスオリジン扱いで遮断し、
  // クライアントJSがハイドレーションせずボタンが効かなくなる。
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
