'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Tag,
  Settings,
  QrCode,
  Menu,
  FileText,
  FileBarChart,
  ClipboardList,
  User,
  LogOut,
  X,
  MessageSquareReply,
} from 'lucide-react';

const primaryItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/course-tags', label: 'Tags', icon: Tag },
  { href: '/admin/config', label: 'Config', icon: Settings },
];

const moreItems = [
  { href: '/admin/fallback-templates', label: 'Templates', icon: FileText },
  { href: '/admin/auto-reply', label: 'Auto-Reply', icon: MessageSquareReply },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ClipboardList },
  { href: '/admin/profile', label: 'Profile', icon: User },
];

export function AdminBottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    window.location.href = '/admin/login';
  };

  return (
    <>
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMenuOpen(false)} />
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] md:hidden" ref={menuRef}>
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 border-t bg-white px-2 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
            {moreItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 active:bg-gray-50'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 active:bg-red-50 active:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
        <div className="mx-auto flex max-w-md">
          {primaryItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
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
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-2 text-[10px] font-medium transition-colors ${
              menuOpen || isMoreActive
                ? 'text-blue-600'
                : 'text-gray-400 active:text-gray-600'
            }`}
          >
            {menuOpen ? <X className="h-5 w-5 stroke-[2.5]" /> : <Menu className={`h-5 w-5 ${isMoreActive ? 'stroke-[2.5]' : ''}`} />}
            More
            {!menuOpen && isMoreActive && (
              <span className="mt-0.5 h-1 w-1 rounded-full bg-blue-600" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
