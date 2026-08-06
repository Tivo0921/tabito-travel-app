'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, CalendarDays, User, Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { useT } from '@/lib/i18n/provider';
import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';

const mainItems = [
  { href: '/home', labelKey: 'nav.home', icon: Home },
  { href: '/explore', labelKey: 'nav.explore', icon: Compass },
  { href: '/plan', labelKey: 'nav.plan', icon: CalendarDays },
  { href: '/profile', labelKey: 'nav.profile', icon: User },
] satisfies { href: string; labelKey: TranslationKey; icon: typeof Home }[];

const subItems = [
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
  { href: '/help', labelKey: 'nav.help', icon: HelpCircle },
] satisfies { href: string; labelKey: TranslationKey; icon: typeof Home }[];

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
        isActive
          ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-semibold'
          : 'text-[var(--text-sub)] font-medium hover:bg-black/5 hover:text-[var(--text-main)]'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
      {label}
    </Link>
  );
}

/** PC幅（lg以上）で常時表示される左サイドナビ。モバイルではBottomNavが担当する。 */
export function SideNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-[var(--border)] bg-white">
      <div className="px-6 py-6">
        <Link href="/home" aria-label="TABITO ホーム">
          <Logo size="sm" priority />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-1">
          {mainItems.map((item) => (
            <li key={item.href}>
              <NavLink
                href={item.href}
                label={t(item.labelKey)}
                icon={item.icon}
                isActive={pathname.startsWith(item.href)}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-3 pb-6 pt-4 border-t border-[var(--border)]">
        <ul className="space-y-1">
          {subItems.map((item) => (
            <li key={item.href}>
              <NavLink
                href={item.href}
                label={t(item.labelKey)}
                icon={item.icon}
                isActive={pathname.startsWith(item.href)}
              />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
