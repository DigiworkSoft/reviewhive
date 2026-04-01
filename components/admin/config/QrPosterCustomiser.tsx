'use client';

import { useState, useEffect, useCallback } from 'react';

export function QrPosterCustomiser() {
  const [color, setColor] = useState('#1a1a2e');
  const [tagline, setTagline] = useState('');
  const [academyName, setAcademyName] = useState('Academy');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const cfg = await res.json();
        if (cfg.poster_color) setColor(cfg.poster_color);
        if (cfg.poster_tagline) setTagline(cfg.poster_tagline);
        if (cfg.academy_name) setAcademyName(cfg.academy_name);
        if (cfg.logo_url) setLogoUrl(cfg.logo_url);
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

        {/* Client-side HTML/CSS Preview (replaces iframe PDF preview) */}
        <div className="rounded-lg border bg-gray-50 p-2">
          <p className="mb-2 text-center text-xs font-medium text-gray-500">Live Preview</p>
          <div
            className="relative mx-auto bg-white rounded border overflow-hidden"
            style={{ aspectRatio: '210 / 297', maxWidth: '100%' }}
          >
            {/* Decorative border */}
            <div
              className="absolute rounded-lg"
              style={{
                top: '3%', left: '3%', right: '3%', bottom: '3%',
                border: `3px solid ${color}`,
                borderRadius: '12px',
                pointerEvents: 'none',
              }}
            />
            {/* Content */}
            <div className="flex flex-col items-center justify-center h-full px-[10%] py-[8%] text-center">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-cover mb-3" />
              )}
              <div
                className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 leading-tight"
                style={{ color }}
              >
                {academyName}
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mb-6">
                {tagline || 'Share your experience!'}
              </div>
              {/* Actual QR code from API (inline=true avoids triggering WebView download) */}
              <div
                className="w-[40%] aspect-square rounded-lg mb-6 flex items-center justify-center overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/api/qr/download?format=png&inline=true"
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-xs text-gray-500">
                Scan the QR code to leave a review
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
