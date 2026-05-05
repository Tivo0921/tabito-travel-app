'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, CalendarDays, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/home', label: 'ホーム', icon: Home },
  { href: '/explore', label: '探索', icon: Compass },
  { href: '/plan', label: '計画', icon: CalendarDays },
  { href: '/profile', label: 'プロフィール', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  // 詳細ページ（パス階層が2段以上）ではBottomNavを非表示
  const isDetailPage = pathname.split('/').filter(Boolean).length > 1;
  if (isDetailPage) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[var(--border)]">
      <div className="mx-auto max-w-lg">
        <ul className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors',
                    isActive 
                      ? 'text-[var(--primary)]' 
                      : 'text-[var(--muted)] hover:text-[var(--text-sub)]'
                  )}
                >
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  <span className={cn(
                    'text-xs',
                    isActive ? 'font-semibold' : 'font-medium'
                  )}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
