import { BottomNav } from '@/components/bottom-nav';
import { SideNav } from '@/components/side-nav';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SideNav />
      {/* lg以上はサイドナビ(w-64)の分だけ本文を右に寄せる */}
      <div className="lg:pl-64">
        {/* モバイルはスマホ幅固定、PCは画面幅を活かす */}
        <div className="mx-auto max-w-lg pb-28 lg:max-w-6xl lg:px-6 lg:pb-12">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
