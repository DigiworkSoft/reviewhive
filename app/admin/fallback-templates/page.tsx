'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';

interface Template {
  id: string; course_tag_id: string | null; star_rating: number;
  option_number: number; template_text: string; course_name: string | null;
  user_status: string | null; reviewer_type: string | null;
  weight: number; category: string | null; tags: string[] | null;
  usage_count: number; last_used_at: string | null; is_active: boolean;
}

const CATEGORIES = ['emotional', 'result-based', 'faculty-based', 'environment-based'] as const;

export default function FallbackTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterReviewer, setFilterReviewer] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [edits, setEdits] = useState<Record<string, Partial<Template>>>({});
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ template_text: '', reviewer_type: '' as string, user_status: '' as string, category: '' as string, weight: 1 });

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/fallback-templates');
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = templates.filter((t) => {
    if (!showInactive && !t.is_active) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterReviewer !== 'all' && t.reviewer_type !== filterReviewer) return false;
    if (filterStatus !== 'all' && t.user_status !== filterStatus) return false;
    return true;
  });

  const handleSave = async (id: string) => {
    const edit = edits[id];
    if (!edit) return;
    setSaving(true);
    await fetch('/api/admin/fallback-templates', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...edit }),
    });
    const newEdits = { ...edits };
    delete newEdits[id];
    setEdits(newEdits);
    await load();
    setSaving(false);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await fetch('/api/admin/fallback-templates', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !currentActive }),
    });
    load();
  };

  const handleAdd = async () => {
    if (!newTemplate.template_text.trim()) return;
    setSaving(true);
    await fetch('/api/admin/fallback-templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_text: newTemplate.template_text,
        star_rating: 5,
        reviewer_type: newTemplate.reviewer_type || null,
        user_status: newTemplate.user_status || null,
        category: newTemplate.category || null,
        weight: newTemplate.weight,
        tags: [],
      }),
    });
    setNewTemplate({ template_text: '', reviewer_type: '', user_status: '', category: '', weight: 1 });
    setShowAddForm(false);
    await load();
    setSaving(false);
  };

  const activeCount = templates.filter(t => t.is_active).length;
  const totalUsage = templates.reduce((sum, t) => sum + (t.usage_count || 0), 0);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fallback Templates</h1>
          <p className="text-sm text-gray-500">Used when AI generation fails. Use {'{academy_name}'} and {'{course_name}'} tokens for dynamic substitution.</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Add Template
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-xs">
        <span className="rounded-lg border bg-white px-3 py-1.5 text-gray-600">{activeCount} active / {templates.length} total</span>
        <span className="rounded-lg border bg-white px-3 py-1.5 text-gray-600">{totalUsage} total uses</span>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New Fallback Template</h3>
          <textarea
            value={newTemplate.template_text}
            onChange={(e) => setNewTemplate({ ...newTemplate, template_text: e.target.value })}
            rows={3}
            placeholder="Template text... Use {academy_name} and {course_name} for dynamic values"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-3">
            <select value={newTemplate.reviewer_type} onChange={(e) => setNewTemplate({ ...newTemplate, reviewer_type: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
              <option value="">Any Reviewer</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </select>
            <select value={newTemplate.user_status} onChange={(e) => setNewTemplate({ ...newTemplate, user_status: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
              <option value="">Any Status</option>
              <option value="pursuing">Pursuing</option>
              <option value="completed">Completed</option>
            </select>
            <select value={newTemplate.category} onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
              <option value="">No Category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={newTemplate.weight} onChange={(e) => setNewTemplate({ ...newTemplate, weight: parseInt(e.target.value) })} className="rounded-lg border px-3 py-2 text-sm">
              {[1,2,3,4,5].map(w => <option key={w} value={w}>Weight: {w}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button onClick={() => setShowAddForm(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterReviewer} onChange={(e) => setFilterReviewer(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="all">All Reviewers</option>
          <option value="student">Student</option>
          <option value="parent">Parent</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="all">All Statuses</option>
          <option value="pursuing">Pursuing</option>
          <option value="completed">Completed</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs text-gray-500">
          <input type="checkbox" checked={showInactive} onChange={() => setShowInactive(!showInactive)} className="rounded" />
          Show inactive
        </label>
      </div>

      {/* Templates List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="rounded-lg border bg-gray-50 py-6 text-center text-sm text-gray-400">No templates match filters</p>
        )}
        {filtered.map((t) => {
          const edit = edits[t.id] || {};
          const editedText = edit.template_text ?? t.template_text;
          return (
            <div key={t.id} className={`rounded-xl border bg-white p-4 ${!t.is_active ? 'opacity-50' : ''}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {t.category && <Badge variant="secondary" className="text-xs capitalize">{t.category}</Badge>}
                {t.reviewer_type && <Badge variant="outline" className="text-xs capitalize">{t.reviewer_type}</Badge>}
                {t.user_status && <Badge variant="outline" className="text-xs capitalize">{t.user_status}</Badge>}
                <span className="text-xs text-gray-400">W:{t.weight} · Used:{t.usage_count || 0}</span>
                <div className="ml-auto flex gap-2">
                  <select
                    value={edit.weight ?? t.weight}
                    onChange={(e) => setEdits({ ...edits, [t.id]: { ...edit, weight: parseInt(e.target.value) } })}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    {[1,2,3,4,5].map(w => <option key={w} value={w}>W:{w}</option>)}
                  </select>
                  <button onClick={() => handleToggleActive(t.id, t.is_active)} className={`text-xs ${t.is_active ? 'text-red-500' : 'text-green-600'} hover:underline`}>
                    {t.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
              <textarea
                value={editedText}
                onChange={(e) => setEdits({ ...edits, [t.id]: { ...edit, template_text: e.target.value } })}
                rows={2}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              {edits[t.id] && (
                <button onClick={() => handleSave(t.id)} disabled={saving} className="mt-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
