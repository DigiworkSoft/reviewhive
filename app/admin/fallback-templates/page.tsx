'use client';

import { useState, useEffect, useCallback } from 'react';

interface Template {
  id: string; course_tag_id: string | null; star_rating: number;
  option_number: number; template_text: string; course_name: string | null;
}
interface CourseTag { id: string; name: string; }

export default function FallbackTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [courseTags, setCourseTags] = useState<CourseTag[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedRating, setSelectedRating] = useState(4);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [tRes, cRes] = await Promise.all([
      fetch('/api/admin/fallback-templates'), fetch('/api/admin/course-tags'),
    ]);
    if (tRes.ok) setTemplates(await tRes.json());
    if (cRes.ok) setCourseTags(await cRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = templates.filter(
    (t) => (selectedCourse ? t.course_tag_id === selectedCourse : !t.course_tag_id)
      && t.star_rating === selectedRating
  ).sort((a, b) => a.option_number - b.option_number);

  const handleSave = async () => {
    setSaving(true);
    for (const [id, text] of Object.entries(edits)) {
      await fetch('/api/admin/fallback-templates', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, template_text: text }),
      });
    }
    setEdits({}); await load(); setSaving(false);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-bold text-gray-900">Fallback Templates</h1>
      <div className="flex flex-wrap gap-3">
        <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm">
          <option value="">Generic (all courses)</option>
          {courseTags.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
        </select>
        <div className="flex gap-1">
          {[4, 5].map((r) => (
            <button key={r} onClick={() => setSelectedRating(r)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${selectedRating === r ? 'bg-yellow-400 text-white' : 'border bg-white text-gray-600'}`}>
              {r}★
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="rounded-lg border bg-gray-50 py-6 text-center text-sm text-gray-400">No templates for this selection</p>
        )}
        {filtered.map((t) => (
          <div key={t.id} className="rounded-xl border bg-white p-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-blue-600">
              Option {t.option_number} — {['Enthusiastic', 'Professional', 'Concise'][t.option_number - 1]}
            </label>
            <textarea
              value={edits[t.id] ?? t.template_text}
              onChange={(e) => setEdits({ ...edits, [t.id]: e.target.value })}
              rows={4}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>
      {Object.keys(edits).length > 0 && (
        <button onClick={handleSave} disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      )}
    </div>
  );
}
