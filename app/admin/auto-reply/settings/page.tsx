'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AutoReplySettings } from '@/components/admin/auto-reply/AutoReplySettings';

interface GoogleStatus {
  connected: boolean;
  account_name?: string;
  location_name?: string;
  location_title?: string;
}

export default function AutoReplySettingsPage() {
  const router = useRouter();
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({ connected: false });

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/auto-reply/google/status');
        if (!res.ok) return;
        const data = await res.json();
        setGoogleStatus(data);
      } catch {
        // ignore
      }
    })();
  }, []);

  const connectGoogle = () => {
    window.location.href = '/api/admin/auto-reply/google/connect';
  };

  const disconnectGoogle = async () => {
    const res = await fetch('/api/admin/auto-reply/google/disconnect', { method: 'POST' });
    if (res.ok) {
      const data = await fetch('/api/admin/auto-reply/google/status').then((r) => r.json()).catch(() => ({ connected: false }));
      setGoogleStatus(data);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/auto-reply')}
          className="rounded-lg border p-2 text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Auto-Reply Settings</h1>
      </div>

      <AutoReplySettings
        googleStatus={googleStatus}
        onConnectGoogle={connectGoogle}
        onDisconnectGoogle={disconnectGoogle}
      />
    </div>
  );
}
