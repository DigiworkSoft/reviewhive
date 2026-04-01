'use client';

import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/shared/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/shared/AdminBottomNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't wrap login or password recovery pages with sidebar/nav
  if (['/admin/login', '/admin/forgot-password', '/admin/reset-password'].includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:flex md:sticky md:top-0 md:h-screen">
        <AdminSidebar />
      </div>
      {/* Mobile: flex column so nav stays anchored, only main scrolls */}
      <div className="flex flex-1 flex-col min-w-0 md:block">
        <main className="flex-1 overflow-y-auto min-w-0 md:pb-0">{children}</main>
        <AdminBottomNav />
      </div>
    </div>
  );
}
