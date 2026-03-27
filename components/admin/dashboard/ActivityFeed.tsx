'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

interface FeedRow {
  session_id: string;
  created_at: string;
  course_name: string | null;
  star_rating: number | null;
  user_status: 'pursuing' | 'completed' | null;
  review_source: string; // Broaden to allow specific names
  status: 'Review Posted' | 'Incomplete' | 'Redirected to WhatsApp';
  generated_text?: string | null;
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
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const toggleRow = (index: number) => {
    setExpandedRows(prev => ({ ...prev, [index]: !prev[index] }));
  };

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
              <th className="px-3 py-2">User ID</th>
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">Rating</th>
              <th className="px-3 py-2">Academic Status</th>
              <th className="px-3 py-2">Review Source</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {feedData.map((row, i) => (
              <React.Fragment key={i}>
                <tr className={`border-b border-gray-100 hover:bg-gray-50 ${expandedRows[i] ? 'bg-gray-50' : ''}`}>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                    {new Date(row.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-500" title={row.session_id}>
                    {row.session_id ? row.session_id.split('-')[0] : '—'}
                  </td>
                <td className="px-3 py-2 text-gray-700">{row.course_name || '—'}</td>
                <td className="px-3 py-2">
                  {row.star_rating ? '★'.repeat(row.star_rating) + '☆'.repeat(5 - row.star_rating) : '—'}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {row.user_status === 'pursuing' && <span className="text-xs text-blue-600 font-medium">Student</span>}
                  {row.user_status === 'completed' && <span className="text-xs text-green-600 font-medium">Alumnus</span>}
                  {!row.user_status && <span className="text-xs text-gray-400">—</span>}
                </td>
                <td className="px-3 py-2">
                  {(() => {
                    const src = (row.review_source || '').toLowerCase();
                    if (src.includes('gemini') || src.includes('openai') || src === 'ai') {
                      return <Badge variant="secondary" className="text-xs">{row.review_source}</Badge>;
                    }
                    if (src === 'fallback template') {
                      return <Badge variant="outline" className="text-xs">Fallback Template</Badge>;
                    }
                    if (src === 'negative feedback') {
                      return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 text-xs shadow-none">WhatsApp</Badge>;
                    }
                    return <Badge variant="secondary" className="text-xs">{row.review_source}</Badge>;
                  })()}
                </td>
                  <td className="px-3 py-3">
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
                  <td className="px-3 py-3 text-right">
                    {row.generated_text && (
                      <button 
                        onClick={() => toggleRow(i)}
                        className="text-gray-400 hover:text-gray-700"
                      >
                        {expandedRows[i] ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedRows[i] && row.generated_text && (
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Generated Review Text</div>
                        <p className="text-sm italic text-gray-700 break-words whitespace-pre-wrap">{row.generated_text}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {feedData.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">No events</td></tr>
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