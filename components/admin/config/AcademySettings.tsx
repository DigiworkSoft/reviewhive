'use client';

import { useState, useEffect, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';

// Extracted outside the component so React doesn't re-create it on every render
function ConfigField({ label, value, maxLen, savedKey, configKey, onChange, onSave }: {
  label: string; value: string; maxLen?: number; savedKey: string; configKey: string;
  onChange: (key: string, value: string) => void; onSave: (key: string, value: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <input
        value={value}
        maxLength={maxLen}
        onChange={(e) => onChange(configKey, e.target.value)}
        className="mb-2 w-full rounded-lg border px-3 py-2.5 text-sm"
      />
      {maxLen && <p className="mb-2 text-xs text-gray-400">{value.length}/{maxLen} characters</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave(configKey, value)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Save
        </button>
        {savedKey === configKey && <span className="text-sm text-green-600">✓ Saved</span>}
      </div>
    </div>
  );
}

export function AcademySettings() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [savedKey, setSavedKey] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/config');
    if (res.ok) setConfig(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (key: string, value: string) => {
    await fetch('/api/admin/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    setSavedKey(key); setTimeout(() => setSavedKey(''), 2000);
  };

  const handleChange = useCallback((key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) { alert('Only PNG/JPG allowed'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Maximum file size is 2MB'); return; }
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
    if (res.ok) {
      const { url } = await res.json();
      setConfig((prev) => ({ ...prev, logo_url: url }));
      save('logo_url', url);
    }
  };

  return (
    <div className="space-y-4">
      <ConfigField label="Academy Name" configKey="academy_name" value={config.academy_name || ''} savedKey={savedKey} onChange={handleChange} onSave={save} />
      <ConfigField label="Google Review URL" configKey="google_review_url" value={config.google_review_url || ''} savedKey={savedKey} onChange={handleChange} onSave={save} />
      <ConfigField label="WhatsApp Number" configKey="whatsapp_number" value={config.whatsapp_number || ''} savedKey={savedKey} onChange={handleChange} onSave={save} />
      <ConfigField label="Poster Tagline" configKey="poster_tagline" value={config.poster_tagline || ''} maxLen={60} savedKey={savedKey} onChange={handleChange} onSave={save} />

      {/* Logo Upload */}
      <div className="rounded-lg border bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">Academy Logo</label>
        <div className="flex flex-col gap-3">
          {config.logo_url && (
            <img src={config.logo_url} alt="Logo" className="h-16 w-16 rounded-lg border object-cover" />
          )}
          <input type="file" accept="image/png,image/jpeg" onChange={handleUpload}
            className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100" />
          <p className="text-xs text-gray-400">PNG or JPG, max 2MB</p>
        </div>
        {savedKey === 'logo_url' && <p className="mt-1 text-sm text-green-600">✓ Logo uploaded</p>}
      </div>

      {/* AI Toggle */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">AI Review Generation</p>
            <p className="mt-0.5 text-xs text-gray-500">When disabled, fallback templates are always used</p>
          </div>
          <Switch
            checked={config.ai_enabled === 'true'}
            onCheckedChange={(v) => {
              setConfig((prev) => ({ ...prev, ai_enabled: String(v) }));
              save('ai_enabled', String(v));
            }}
          />
        </div>
        {savedKey === 'ai_enabled' && <p className="mt-1 text-sm text-green-600">✓ Saved</p>}
      </div>
    </div>
  );
}
