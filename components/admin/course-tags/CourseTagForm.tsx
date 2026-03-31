'use client';

import { useState, useEffect } from 'react';

const COURSE_TYPES = [
  { value: 'academic', label: 'Academic' },
  { value: 'cet', label: 'CET' },
  { value: 'programming', label: 'Programming' },
  { value: 'cyber_security', label: 'Cyber Security' },
  { value: 'other', label: 'Other' },
];

interface FormData {
  name: string;
  description: string;
  course_type: string;
  faculty_names: string;
  aliases: string[];
  display_order: number;
}

interface Props {
  onSubmit: (data: FormData) => void;
  initialValues?: { name: string; description: string | null; course_type?: string | null; faculty_names?: string | null; aliases?: string[] | null; display_order: number } | null;
  onCancel?: () => void;
}

export function CourseTagForm({ onSubmit, initialValues, onCancel }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [courseType, setCourseType] = useState('other');
  const [facultyNames, setFacultyNames] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);

  useEffect(() => {
    if (initialValues) {
      setName(initialValues.name);
      setDescription(initialValues.description || '');
      setCourseType(initialValues.course_type || 'other');
      setFacultyNames(initialValues.faculty_names || '');
      setAliases(initialValues.aliases || []);
      setAliasInput('');
      setDisplayOrder(initialValues.display_order);
    } else {
      setName(''); setDescription(''); setCourseType('other'); setFacultyNames(''); setAliases([]); setAliasInput(''); setDisplayOrder(0);
    }
  }, [initialValues]);

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        {initialValues ? 'Edit Course Tag' : 'Add Course Tag'}
      </h3>
      <div className="space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *"
          className="w-full rounded-lg border px-3 py-2 text-sm" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
          className="w-full rounded-lg border px-3 py-2 text-sm" />
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Course Type</label>
          <select
            value={courseType}
            onChange={(e) => setCourseType(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {COURSE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Faculty Names (comma-separated)</label>
          <input
            value={facultyNames}
            onChange={(e) => setFacultyNames(e.target.value)}
            placeholder="e.g. Suresh Sir, Vansh Agrawal Sir"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Display Order (lower = shown first)</label>
          <input
            type="text"
            inputMode="numeric"
            value={displayOrder}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setDisplayOrder(val === '' ? 0 : parseInt(val, 10));
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Course Name Aliases <span className="text-gray-400">(used randomly in reviews for natural variety)</span>
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {aliases.map((alias, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {alias}
                <button
                  type="button"
                  onClick={() => setAliases(aliases.filter((_, idx) => idx !== i))}
                  className="ml-0.5 text-blue-400 hover:text-blue-700"
                >×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && aliasInput.trim() && aliases.length < 10) {
                  e.preventDefault();
                  const val = aliasInput.trim();
                  if (!aliases.includes(val)) setAliases([...aliases, val]);
                  setAliasInput('');
                }
              }}
              placeholder="Type alias and press Enter (max 10)"
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
              disabled={aliases.length >= 10}
            />
            <button
              type="button"
              onClick={() => {
                if (aliasInput.trim() && aliases.length < 10) {
                  const val = aliasInput.trim();
                  if (!aliases.includes(val)) setAliases([...aliases, val]);
                  setAliasInput('');
                }
              }}
              className="rounded-lg border px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
              disabled={aliases.length >= 10}
            >Add</button>
          </div>
          {aliases.length < 5 && aliases.length > 0 && (
            <p className="mt-1 text-xs text-amber-600">Recommended: at least 5 aliases for natural variety</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { if (name.trim()) onSubmit({ name: name.trim(), description: description.trim(), course_type: courseType, faculty_names: facultyNames.trim(), aliases, display_order: displayOrder }); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {initialValues ? 'Update' : 'Add'}
          </button>
          {onCancel && (
            <button onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
