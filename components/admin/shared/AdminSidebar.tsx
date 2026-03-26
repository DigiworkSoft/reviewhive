'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Tag, FileText, Settings, QrCode, FileBarChart, ClipboardList, LogOut, User } from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/course-tags', label: 'Course Tags', icon: Tag },
  { href: '/admin/fallback-templates', label: 'Templates', icon: FileText },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { href: '/admin/config', label: 'Configuration', icon: Settings },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ClipboardList },
  { href: '/admin/profile', label: 'Profile', icon: User },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    window.location.href = '/admin/login';
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-white">
      <div className="border-b px-4 py-5">
        <h2 className="text-lg font-bold text-gray-900">ReviewHive</h2>
        <p className="text-xs text-gray-500">Admin Panel</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <a
          href="/api/qr/poster"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <QrCode className="h-4 w-4" />
          Download QR Poster
        </a>
      </nav>
      <div className="border-t px-2 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
