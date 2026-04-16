'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { AutoReplySettings } from '@/components/admin/auto-reply/AutoReplySettings';

interface GoogleStatus {
  connected: boolean;
  account_name?: string;
  location_name?: string;
  location_title?: string;
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({ connected: false });
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success === 'google_connected') {
      setBanner({ type: 'success', msg: 'Google account connected successfully!' });
    } else if (error) {
      const msgs: Record<string, string> = {
        google_denied: 'Google authorization was denied.',
        no_code: 'No authorization code received.',
        no_refresh_token: 'No refresh token. Try revoking access and reconnecting.',
        google_failed: 'Google connection failed. Please try again.',
      };
      setBanner({ type: 'error', msg: msgs[error] || 'Something went wrong.' });
    }
    if (success || error) {
      window.history.replaceState({}, '', '/admin/auto-reply/settings');
    }
  }, [searchParams]);

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
      {banner && (
        <div className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${
          banner.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {banner.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          <span>{banner.msg}</span>
          <button onClick={() => setBanner(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

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

export default function AutoReplySettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
