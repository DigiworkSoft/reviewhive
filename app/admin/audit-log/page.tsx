'use client';

import { useState, useEffect, useCallback } from 'react';

interface AuditRow {
  id: string;
  config_key: string;
  old_value: string | null;
  new_value: string;
  changed_at: string;
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-log?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows);
        setTotalPages(data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (iso: string) => {
    if (!iso || !mounted) return '—';
    try {
      return new Date(iso).toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata', 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
      {loading && (
        <div className="flex items-center justify-center p-12 text-gray-400">Loading logs...</div>
      )}
      {!loading && (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-3">Timestamp (IST)</th>
                <th className="px-4 py-3">Config Key</th>
                <th className="px-4 py-3">Old Value</th>
                <th className="px-4 py-3">New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(r.changed_at)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.config_key}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{r.old_value || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{r.new_value}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400 font-medium">No audit log entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
          className="rounded-lg border bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40">← Previous</button>
        <span className="text-sm font-medium text-gray-500">Page {page} of {totalPages}</span>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
          className="rounded-lg border bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}
