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
  const [academyAliases, setAcademyAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState('');
  const [origin, setOrigin] = useState('...');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/config');
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      try { setAcademyAliases(JSON.parse(data.academy_aliases || '[]')); } catch { setAcademyAliases([]); }
    }
  }, []);

  useEffect(() => { load(); setOrigin(window.location.origin); }, [load]);

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
      
      {/* P5: Academy Name Aliases */}
      <div className="rounded-lg border bg-white p-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">Academy Name Aliases</label>
        <p className="mb-3 text-xs text-gray-500">Different ways users refer to your academy. A random alias is used in each review for natural variety.</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {academyAliases.map((alias, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
              {alias}
              <button
                type="button"
                onClick={async () => {
                  const updated = academyAliases.filter((_, idx) => idx !== i);
                  setAcademyAliases(updated);
                  await save('academy_aliases', JSON.stringify(updated));
                }}
                className="ml-0.5 text-purple-400 hover:text-purple-700"
              >×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && aliasInput.trim() && academyAliases.length < 10) {
                e.preventDefault();
                const val = aliasInput.trim();
                if (!academyAliases.includes(val)) {
                  const updated = [...academyAliases, val];
                  setAcademyAliases(updated);
                  await save('academy_aliases', JSON.stringify(updated));
                }
                setAliasInput('');
              }
            }}
            placeholder="e.g. NSG, NSG Classes, NSG Coaching (press Enter)"
            className="flex-1 rounded-lg border px-3 py-2.5 text-sm"
            disabled={academyAliases.length >= 10}
          />
          <button
            type="button"
            onClick={async () => {
              if (aliasInput.trim() && academyAliases.length < 10) {
                const val = aliasInput.trim();
                if (!academyAliases.includes(val)) {
                  const updated = [...academyAliases, val];
                  setAcademyAliases(updated);
                  await save('academy_aliases', JSON.stringify(updated));
                }
                setAliasInput('');
              }
            }}
            className="rounded-lg border px-3 py-2.5 text-xs text-gray-600 hover:bg-gray-50"
            disabled={academyAliases.length >= 10}
          >Add</button>
        </div>
        {academyAliases.length < 5 && academyAliases.length > 0 && (
          <p className="mt-1 text-xs text-amber-600">Recommended: at least 5 aliases for best results</p>
        )}
        {savedKey === 'academy_aliases' && <p className="mt-1 text-sm text-green-600">✓ Saved</p>}
      </div>
      
      {/* Read-only Review Page URL */}
      <div className="rounded-lg border bg-blue-50/50 p-4 border-blue-100">
        <label className="mb-1 block text-sm font-semibold text-blue-800 uppercase tracking-wider">Public Review Page (QR Link)</label>
        <p className="text-xs text-blue-600 mb-2 italic">This is the link your customers scan from the QR code.</p>
        <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-blue-100 rounded px-3 py-2 text-sm text-gray-700 font-mono">
                {`${origin}/review`}
            </code>
            <button 
                onClick={() => {
                    if (typeof window !== 'undefined') {
                        const link = `${window.location.origin}/review?src=qr`;
                        // Robust copy: clipboard API with execCommand fallback
                        const fallbackCopy = (val: string) => {
                            const textArea = document.createElement('textarea');
                            textArea.value = val;
                            textArea.style.position = 'fixed';
                            textArea.style.left = '-9999px';
                            textArea.style.top = '0';
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();
                            try { document.execCommand('copy'); } catch { /* ignore */ }
                            document.body.removeChild(textArea);
                        };
                        if (navigator.clipboard && window.isSecureContext) {
                            navigator.clipboard.writeText(link).catch(() => fallbackCopy(link));
                        } else {
                            fallbackCopy(link);
                        }
                        setSavedKey('copy_link');
                        setTimeout(() => setSavedKey(''), 2000);
                    }
                }}
                className="text-xs bg-blue-100 text-blue-700 px-3 py-2 rounded font-medium hover:bg-blue-200"
            >
                {savedKey === 'copy_link' ? '✓ Copied!' : 'Copy Link'}
            </button>
        </div>
      </div>

      <ConfigField label="Final Redirect URL (Google Google Maps/Review Link)" configKey="google_review_url" value={config.google_review_url || ''} savedKey={savedKey} onChange={handleChange} onSave={save} />

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
