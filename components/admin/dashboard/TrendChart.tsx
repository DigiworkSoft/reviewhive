'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface TrendRow {
  date: string;
  scans: number;
  conversions: number;
}

export function TrendChart({ dailyData }: { dailyData: TrendRow[] }) {
  const formatted = dailyData.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Daily Scans & Conversions</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="scans" stroke="#3B82F6" strokeWidth={2} dot={false} name="Scans" />
          <Line type="monotone" dataKey="conversions" stroke="#10B981" strokeWidth={2} dot={false} name="Conversions" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
