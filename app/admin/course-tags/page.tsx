'use client';

import { useState, useEffect, useCallback } from 'react';
import { CourseTagTable } from '@/components/admin/course-tags/CourseTagTable';
import { CourseTagForm } from '@/components/admin/course-tags/CourseTagForm';

interface Tag { id: string; name: string; description: string | null; course_type: string | null; faculty_names: string | null; display_order: number; is_active: boolean; }

export default function CourseTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadTags = useCallback(async () => {
    const res = await fetch(`/api/admin/course-tags?inactive=true`);
    if (res.ok) setTags(await res.json());
  }, []);

  useEffect(() => { loadTags(); }, [loadTags]);

  const handleSubmit = async (data: { name: string; description: string; display_order: number }) => {
    if (editing) {
      await fetch(`/api/admin/course-tags/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/admin/course-tags', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
    setEditing(null); setShowForm(false); loadTags();
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this course tag? It will still appear in analytics.')) return;
    await fetch(`/api/admin/course-tags/${id}`, { method: 'DELETE' });
    loadTags();
  };

  const handleReactivate = async (id: string) => {
    await fetch(`/api/admin/course-tags/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true }),
    });
    loadTags();
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Course Tags</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(!showForm); }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Tag
        </button>
      </div>
      {(showForm || editing) && (
        <CourseTagForm
          onSubmit={handleSubmit}
          initialValues={editing}
          onCancel={() => { setEditing(null); setShowForm(false); }}
        />
      )}
      <CourseTagTable
        tags={tags}
        onEdit={(t) => { setEditing(t); setShowForm(false); }}
        onDeactivate={handleDeactivate}
        onReactivate={handleReactivate}
        showInactive={showInactive}
        onToggleInactive={() => setShowInactive(!showInactive)}
      />
    </div>
  );
}

