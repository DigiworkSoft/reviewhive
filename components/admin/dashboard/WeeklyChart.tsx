'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface WeeklyRow {
  week_start: string;
  reviews: number;
}

export function WeeklyChart({ weeklyData }: { weeklyData: WeeklyRow[] }) {
  const formatted = weeklyData.map((d) => ({
    ...d,
    week: new Date(d.week_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Weekly Review Volume (12 weeks)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="reviews" fill="#6366F1" radius={[4, 4, 0, 0]} name="Reviews" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
