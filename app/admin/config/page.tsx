'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConfigPage() {
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ── Load config ────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/admin/config');
        if (res.ok) {
          const config = await res.json();
          setGoogleReviewUrl(config.google_review_url || '');
          setWhatsappNumber(config.whatsapp_number || '');
        }
      } catch (e) {
        console.error('Failed to load config:', e);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  // ── Auto-dismiss toast ─────────────────────────────────────────────────
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ── Save handler ───────────────────────────────────────────────────────
  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });

      if (res.ok) {
        setToast({ message: `${key === 'google_review_url' ? 'Google Review URL' : 'WhatsApp Number'} updated successfully!`, type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to save', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Configuration</h1>
            <p className="text-sm text-gray-500">Manage system settings</p>
          </div>
          <a
            href="/admin/dashboard"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            ← Dashboard
          </a>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        {/* Google Review URL */}
        <Card>
          <CardHeader>
            <CardTitle>Google Review URL</CardTitle>
            <CardDescription>
              The deep-link URL that opens your Google review page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="google-url">Review URL</Label>
              <Input
                id="google-url"
                type="url"
                placeholder="https://search.google.com/local/writereview?placeid=..."
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
              />
            </div>
            <Button
              onClick={() => handleSave('google_review_url', googleReviewUrl)}
              disabled={saving}
              size="lg"
            >
              {saving ? 'Saving...' : 'Save URL'}
            </Button>
          </CardContent>
        </Card>

        {/* WhatsApp Number */}
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Number</CardTitle>
            <CardDescription>
              The number students contact for negative feedback (with country code, no +)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Number</Label>
              <Input
                id="whatsapp"
                type="text"
                placeholder="919823000000"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>
            <Button
              onClick={() => handleSave('whatsapp_number', whatsappNumber)}
              disabled={saving}
              size="lg"
            >
              {saving ? 'Saving...' : 'Save Number'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
