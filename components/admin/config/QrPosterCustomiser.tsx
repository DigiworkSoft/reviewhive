'use client';

import { useState, useEffect, useCallback } from 'react';

export function QrPosterCustomiser() {
  const [color, setColor] = useState('#1a1a2e');
  const [tagline, setTagline] = useState('');
  const [previewTs, setPreviewTs] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPreviewTs(Date.now());
    (async () => {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const cfg = await res.json();
        if (cfg.poster_color) setColor(cfg.poster_color);
        if (cfg.poster_tagline) setTagline(cfg.poster_tagline);
      }
    })();
  }, []);

  const saveConfig = useCallback(async (key: string, value: string) => {
    setSaving(true);
    await fetch('/api/admin/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    setSaving(false);
    setPreviewTs(Date.now());
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">QR Poster Customisation</h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Controls */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Brand Colour</label>
            <div className="flex items-center gap-3">
              <input type="color" value={color}
                onChange={(e) => setColor(e.target.value)}
                onBlur={() => saveConfig('poster_color', color)}
                className="h-10 w-14 cursor-pointer rounded border" />
              <span className="text-sm text-gray-500">{color}</span>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Poster Tagline</label>
            <input value={tagline} maxLength={60}
              onChange={(e) => setTagline(e.target.value)}
              onBlur={() => saveConfig('poster_tagline', tagline)}
              className="mb-1 w-full rounded-lg border px-3 py-2 text-sm" />
            <p className="text-xs text-gray-400">{tagline.length}/60 characters</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href="/api/qr/poster" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Download A4 Poster PDF
            </a>
            <a href="/api/qr/download?format=png" className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Download QR PNG
            </a>
            <a href="/api/qr/download?format=svg" className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Download QR SVG
            </a>
          </div>
          {saving && <p className="text-xs text-blue-500">Saving...</p>}
        </div>

        {/* Live Preview */}
        <div className="rounded-lg border bg-gray-50 p-2">
          <p className="mb-2 text-center text-xs font-medium text-gray-500">Live Preview</p>
          <iframe
            key={previewTs}
            src={`/api/qr/poster?preview=true&t=${previewTs}`}
            className="h-[500px] w-full rounded border bg-white"
            title="Poster Preview"
          />
        </div>
      </div>
    </div>
  );
}
