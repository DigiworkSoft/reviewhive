'use client';

import { Badge } from '@/components/ui/badge';

interface FeedRow {
  created_at: string;
  course_name: string | null;
  star_rating: number | null;
  review_source: 'AI' | 'Fallback Template' | 'Negative Feedback';
  status: 'Review Posted' | 'Incomplete' | 'Redirected to WhatsApp';
}

interface CourseTag {
  id: string;
  name: string;
}

interface Props {
  feedData: FeedRow[];
  page: number;
  totalPages: number;
  selectedCourse: string;
  courseTags: CourseTag[];
  onPageChange: (page: number) => void;
  onCourseFilter: (courseId: string) => void;
}

export function ActivityFeed({ feedData, page, totalPages, selectedCourse, courseTags, onPageChange, onCourseFilter }: Props) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Recent Activity</h3>
        <select
          value={selectedCourse}
          onChange={(e) => onCourseFilter(e.target.value)}
          className="rounded-lg border px-2 py-1 text-xs text-gray-600"
        >
          <option value="">All Courses</option>
          {courseTags.map((ct) => (
            <option key={ct.id} value={ct.id}>{ct.name}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-3 py-2">Date / Time</th>
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">Rating</th>
              <th className="px-3 py-2">Review Source</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {feedData.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                  {new Date(row.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-3 py-2 text-gray-700">{row.course_name || '—'}</td>
                <td className="px-3 py-2">
                  {row.star_rating ? '★'.repeat(row.star_rating) + '☆'.repeat(5 - row.star_rating) : '—'}
                </td>
                <td className="px-3 py-2">
                  {row.review_source === 'AI' && <Badge variant="secondary" className="text-xs">AI</Badge>}
                  {row.review_source === 'Fallback Template' && <Badge variant="outline" className="text-xs">Fallback Template</Badge>}
                  {row.review_source === 'Negative Feedback' && <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 text-xs shadow-none">WhatsApp</Badge>}
                </td>
                <td className="px-3 py-2">
                  {row.status === 'Review Posted' && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Review Posted</span>
                  )}
                  {row.status === 'Incomplete' && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Incomplete</span>
                  )}
                  {row.status === 'Redirected to WhatsApp' && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Redirected</span>
                  )}
                </td>
              </tr>
            ))}
            {feedData.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No events</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}