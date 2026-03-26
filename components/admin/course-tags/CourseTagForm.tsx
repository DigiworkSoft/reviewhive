'use client';

import { useState, useEffect } from 'react';

interface FormData {
  name: string;
  description: string;
  display_order: number;
}

interface Props {
  onSubmit: (data: FormData) => void;
  initialValues?: { name: string; description: string | null; display_order: number } | null;
  onCancel?: () => void;
}

export function CourseTagForm({ onSubmit, initialValues, onCancel }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);

  useEffect(() => {
    if (initialValues) {
      setName(initialValues.name);
      setDescription(initialValues.description || '');
      setDisplayOrder(initialValues.display_order);
    } else {
      setName(''); setDescription(''); setDisplayOrder(0);
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
        <div className="flex gap-2">
          <button
            onClick={() => { if (name.trim()) onSubmit({ name: name.trim(), description: description.trim(), display_order: displayOrder }); }}
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
