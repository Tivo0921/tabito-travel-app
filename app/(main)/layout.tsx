import { BottomNav } from '@/components/bottom-nav';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-lg pb-28">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
