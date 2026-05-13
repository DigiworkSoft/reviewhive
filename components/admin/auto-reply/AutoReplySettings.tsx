'use client';

import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import {
  Save,
  Loader2,
  Star,
  Plug,
  Unplug,
  Check,
  Play,
  Clock,
} from 'lucide-react';

type SettingsState = {
  autoreply_enabled: string;
  autoreply_star_threshold: string;
  autoreply_tone: string;
  autoreply_sync_from_date: string;
};

const defaults: SettingsState = {
  autoreply_enabled: 'true',
  autoreply_star_threshold: '1',
  autoreply_tone: 'professional',
  autoreply_sync_from_date: '',
};

const toneOptions = [
  { value: 'professional', label: 'Professional', desc: 'Formal & courteous' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm & approachable' },
  { value: 'formal', label: 'Formal', desc: 'Polished & business-like' },
  { value: 'casual', label: 'Casual', desc: 'Relaxed & easy-going' },
  { value: 'hinglish', label: 'Hinglish', desc: 'Hindi + English mix' },
];

interface GoogleStatus {
  connected: boolean;
  account_name?: string;
  location_name?: string;
  location_title?: string;
}

interface AutoReplySettingsProps {
  googleStatus: GoogleStatus;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
}

function SaveBtn({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      disabled={saving}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
      {saving ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : saved ? (
        <><Check className="h-3 w-3 text-green-600" /> Saved</>
      ) : (
        <><Save className="h-3 w-3" /> Save</>
      )}
    </button>
  );
}

export function AutoReplySettings({ googleStatus, onConnectGoogle, onDisconnectGoogle }: AutoReplySettingsProps) {
  const [settings, setSettings] = useState<SettingsState>(defaults);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<{ last_run: string | null; last_result: string | null }>({ last_run: null, last_result: null });

  const load = async () => {
    try {
      const res = await fetch('/api/admin/config');
      if (!res.ok) return;
      const data = await res.json();
      setSettings((prev) => ({ ...prev, ...data }));
    } catch {
      // keep defaults
    }
  };

  const loadLastRun = async () => {
    try {
      const res = await fetch('/api/admin/auto-reply/last-run');
      if (res.ok) setLastRun(await res.json());
    } catch { /* ignore */ }
  };

  useEffect(() => {
    void load();
    void loadLastRun();
  }, []);

  const saveOne = async (key: string, value: string) => {
    setSavingKey(key);
    setSavedKey(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        alert(err.error || 'Failed to save');
        return;
      }
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } finally {
      setSavingKey(null);
    }
  };

  const threshold = parseInt(settings.autoreply_star_threshold) || 1;

  return (
    <div className="space-y-4">
      {/* Run Now */}
      {googleStatus.connected && settings.autoreply_enabled === 'true' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-blue-800">Run Auto-Reply Now</h3>
              <p className="text-xs text-blue-600">Sync reviews from Google, generate AI replies, and post them — all in one go</p>
            </div>
            <button
              disabled={running}
              onClick={async () => {
                setRunning(true);
                setRunResult(null);
                try {
                  const res = await fetch('/api/admin/auto-reply/run', { method: 'POST' });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    setRunResult(`Done: ${data.synced} synced, ${data.generated} generated, ${data.posted} posted to Google`);
                  } else {
                    setRunResult(data.error || 'Failed');
                  }
                } catch {
                  setRunResult('Network error');
                } finally {
                  setRunning(false);
                  void loadLastRun();
                }
              }}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {running ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running...</>
              ) : (
                <><Play className="h-3.5 w-3.5" /> Run Now</>
              )}
            </button>
          </div>
          {runResult && (
            <p className={`mt-2 text-xs ${runResult.startsWith('Done') ? 'text-green-700' : 'text-red-600'}`}>
              {runResult}
            </p>
          )}
          {lastRun.last_run && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-700">
              <Clock className="h-3 w-3" />
              <span>
                Last run: {new Date(lastRun.last_run).toLocaleString()}
                {lastRun.last_result && ` — ${lastRun.last_result}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Enabled Toggle */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Auto-Reply</h3>
            <p className="text-xs text-gray-400">Auto-generate AI replies for new reviews</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.autoreply_enabled === 'true'}
              onCheckedChange={(v) => {
                const val = v ? 'true' : 'false';
                setSettings((s) => ({ ...s, autoreply_enabled: val }));
                void saveOne('autoreply_enabled', val);
              }}
            />
            {savedKey === 'autoreply_enabled' && <Check className="h-3.5 w-3.5 text-green-600" />}
          </div>
        </div>
      </div>

      {/* Star Threshold */}
      <div className="rounded-xl border bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700">Minimum Star Rating</h3>
        <p className="text-xs text-gray-400">Only reply to reviews with this rating or above</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSettings((s) => ({ ...s, autoreply_star_threshold: String(i) }))}
                className="rounded p-0.5 transition-transform hover:scale-110"
              >
                <Star className={`h-5 w-5 ${i <= threshold ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
              </button>
            ))}
            <span className="ml-2 text-xs text-gray-500">{threshold}+ stars</span>
          </div>
          <SaveBtn
            saving={savingKey === 'autoreply_star_threshold'}
            saved={savedKey === 'autoreply_star_threshold'}
            onClick={() => saveOne('autoreply_star_threshold', settings.autoreply_star_threshold)}
          />
        </div>
      </div>

      {/* Tone Selector */}
      <div className="rounded-xl border bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700">Reply Tone</h3>
        <p className="text-xs text-gray-400">Choose the voice for AI-generated replies</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {toneOptions.map((tone) => (
            <button
              key={tone.value}
              type="button"
              onClick={() => setSettings((s) => ({ ...s, autoreply_tone: tone.value }))}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                settings.autoreply_tone === tone.value
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="text-xs font-medium text-gray-700">{tone.label}</p>
              <p className="text-[10px] text-gray-400">{tone.desc}</p>
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <SaveBtn
            saving={savingKey === 'autoreply_tone'}
            saved={savedKey === 'autoreply_tone'}
            onClick={() => saveOne('autoreply_tone', settings.autoreply_tone)}
          />
        </div>
      </div>

      {/* Sync From Date */}
      <div className="rounded-xl border bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700">Sync Reviews From</h3>
        <p className="text-xs text-gray-400">Only sync Google reviews created on or after this date</p>
        <div className="mt-3 flex items-center justify-between">
          <input
            type="date"
            value={settings.autoreply_sync_from_date}
            onChange={(e) => setSettings((s) => ({ ...s, autoreply_sync_from_date: e.target.value }))}
            className="rounded-lg border px-3 py-1.5 text-sm text-gray-700"
          />
          <SaveBtn
            saving={savingKey === 'autoreply_sync_from_date'}
            saved={savedKey === 'autoreply_sync_from_date'}
            onClick={() => saveOne('autoreply_sync_from_date', settings.autoreply_sync_from_date)}
          />
        </div>
      </div>

      {/* Google My Business */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Google My Business</h3>
            {googleStatus.connected ? (
              <p className="text-xs text-green-600">
                Connected — {googleStatus.location_title || googleStatus.location_name || googleStatus.account_name}
              </p>
            ) : (
              <p className="text-xs text-gray-400">Connect to sync & post replies</p>
            )}
          </div>
          {googleStatus.connected ? (
            <button
              onClick={onDisconnectGoogle}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
            >
              <Unplug className="h-3 w-3" /> Disconnect
            </button>
          ) : (
            <button
              onClick={onConnectGoogle}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plug className="h-3 w-3" /> Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
