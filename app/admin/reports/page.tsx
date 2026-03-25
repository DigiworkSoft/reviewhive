'use client';

import { useState } from 'react';

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [month, setMonth] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleCsvExport = async () => {
    if (!from || !to) return alert('Please select both dates');
    const res = await fetch(`/api/admin/export/csv?from=${from}&to=${to}`);
    if (!res.ok) return alert('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reviews-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePdfExport = async () => {
    if (!month) return alert('Please select a month');
    setPdfLoading(true);
    const res = await fetch(`/api/admin/export/pdf?month=${month}`);
    setPdfLoading(false);
    if (!res.ok) return alert('PDF generation failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review-report-${month}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-xl font-bold text-gray-900">Reports</h1>

      {/* CSV Export */}
      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Export Analytics CSV</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm" />
          </div>
          <button onClick={handleCsvExport}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Export CSV
          </button>
        </div>
      </div>

      {/* Monthly PDF */}
      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Monthly PDF Report</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm" />
          </div>
          <button onClick={handlePdfExport} disabled={pdfLoading}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {pdfLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {pdfLoading ? 'Generating...' : 'Generate PDF Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
