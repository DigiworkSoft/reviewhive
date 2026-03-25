'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Tag, FileText, Settings, FileBarChart, QrCode } from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/course-tags', label: 'Tags', icon: Tag },
  { href: '/admin/fallback-templates', label: 'Templates', icon: FileText },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { href: '/admin/config', label: 'Config', icon: Settings },
];

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] md:hidden">
      <div className="mx-auto flex max-w-md">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-400 active:text-gray-600'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              {item.label}
              {isActive && (
                <span className="mt-0.5 h-1 w-1 rounded-full bg-blue-600" />
              )}
            </Link>
          );
        })}
        <a
          href="/api/qr/poster"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-2 text-[10px] font-medium text-gray-400 active:text-gray-600"
        >
          <QrCode className="h-5 w-5" />
          QR
        </a>
      </div>
    </nav>
  );
}
