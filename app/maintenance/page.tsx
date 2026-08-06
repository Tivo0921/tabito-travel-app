import { Logo } from '@/components/logo';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf4f4] to-white flex flex-col items-center justify-center px-8">
      <div className="text-center max-w-sm">
        <Logo size="lg" className="mx-auto mb-8" />

        <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-white shadow-lg flex items-center justify-center">
          <span className="text-4xl">🔧</span>
        </div>

        <h1 className="text-xl font-bold text-gray-800 mb-3">
          メンテナンス中
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          現在サービスのメンテナンスを行っています。
          <br />
          しばらくしてから再度アクセスしてください。
        </p>
      </div>
    </div>
  );
}
