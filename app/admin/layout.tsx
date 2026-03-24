'use client';

import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/shared/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/shared/AdminBottomNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't wrap login page with sidebar/nav
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:flex">
        <AdminSidebar />
      </div>
      <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
      <AdminBottomNav />
    </div>
  );
}
