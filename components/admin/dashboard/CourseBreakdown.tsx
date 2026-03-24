'use client';

interface CourseRow {
  course_name: string;
  scans: number;
  reviews_posted: number;
  conversion_rate: number | null;
}

interface Props {
  coursesData: CourseRow[];
  onSort: (column: string) => void;
  sortColumn: string;
  sortDir: 'asc' | 'desc';
}

export function CourseBreakdown({ coursesData, onSort, sortColumn, sortDir }: Props) {
  const maxRate = Math.max(...coursesData.map((c) => Number(c.conversion_rate) || 0), 1);
  const topIdx = coursesData.findIndex(
    (c) => Number(c.conversion_rate) === Math.max(...coursesData.map((r) => Number(r.conversion_rate) || 0))
  );

  const arrow = (col: string) => (sortColumn === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Course Breakdown</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase text-gray-500">
              <th className="cursor-pointer px-3 py-2" onClick={() => onSort('course_name')}>Course{arrow('course_name')}</th>
              <th className="cursor-pointer px-3 py-2 text-right" onClick={() => onSort('scans')}>Scans{arrow('scans')}</th>
              <th className="cursor-pointer px-3 py-2 text-right" onClick={() => onSort('reviews_posted')}>Reviews{arrow('reviews_posted')}</th>
              <th className="cursor-pointer px-3 py-2 text-right" onClick={() => onSort('conversion_rate')}>Conv. Rate{arrow('conversion_rate')}</th>
            </tr>
          </thead>
          <tbody>
            {coursesData.map((c, i) => (
              <tr key={c.course_name} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2.5 font-medium text-gray-800">
                  {c.course_name}
                  {i === topIdx && coursesData.length > 1 && <span className="ml-2 text-xs">🏆</span>}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-600">{c.scans}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{c.reviews_posted}</td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${((Number(c.conversion_rate) || 0) / maxRate) * 100}%` }}
                      />
                    </div>
                    <span className="text-gray-700">{c.conversion_rate ?? 0}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {coursesData.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
