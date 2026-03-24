'use client';

import { Badge } from '@/components/ui/badge';

interface Tag {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface Props {
  tags: Tag[];
  onEdit: (tag: Tag) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
  showInactive: boolean;
  onToggleInactive: () => void;
}

export function CourseTagTable({ tags, onEdit, onDeactivate, onReactivate, showInactive, onToggleInactive }: Props) {
  const displayed = showInactive ? tags : tags.filter((t) => t.is_active);

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-700">Course Tags</h3>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          <input type="checkbox" checked={showInactive} onChange={onToggleInactive} className="rounded" />
          Show inactive
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((tag) => (
              <tr key={tag.id} className={`border-b last:border-0 ${!tag.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-2.5 text-gray-500">{tag.display_order}</td>
                <td className="px-4 py-2.5 font-medium text-gray-800">{tag.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{tag.description || '—'}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={tag.is_active ? 'secondary' : 'outline'} className="text-xs">
                    {tag.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => onEdit(tag)} className="mr-2 text-xs text-blue-600 hover:underline">Edit</button>
                  {tag.is_active ? (
                    <button onClick={() => onDeactivate(tag.id)} className="text-xs text-red-500 hover:underline">Deactivate</button>
                  ) : (
                    <button onClick={() => onReactivate(tag.id)} className="text-xs text-green-600 hover:underline">Reactivate</button>
                  )}
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No course tags</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
