'use client';

import { AcademySettings } from '@/components/admin/config/AcademySettings';
import { QrPosterCustomiser } from '@/components/admin/config/QrPosterCustomiser';

export default function ConfigPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-xl font-bold text-gray-900">Configuration</h1>
      <div className="rounded-xl border bg-white p-4">
        <AcademySettings />
      </div>
      <div className="rounded-xl border bg-white p-4">
        <QrPosterCustomiser />
      </div>
    </div>
  );
}
