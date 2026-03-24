'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';

interface RatingsData {
  ratings: { star_rating: number; count: number }[];
  negative_count: number;
  avg_rating: number;
}

const COLORS: Record<number, string> = {
  1: '#EF4444', // red
  2: '#F97316', // orange
  3: '#FBBF24', // yellow
  4: '#3B82F6', // blue
  5: '#10B981', // green
};

export function RatingDistribution({ ratingsData }: { ratingsData: RatingsData }) {
  const allRatings = [1, 2, 3, 4, 5].map((star) => {
    const found = ratingsData.ratings.find((r) => r.star_rating === star);
    return { name: `${star}★`, value: found?.count || 0, star };
  }).filter((d) => d.value > 0);

  const total = allRatings.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Rating Distribution</h3>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={allRatings}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            label={false}
          >
            {allRatings.map((d) => (
              <Cell key={d.star} fill={COLORS[d.star]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} reviews`, '']} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            formatter={(value: string, entry) => {
              const payload = entry?.payload as { value?: number } | undefined;
              const count = payload?.value ?? 0;
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
              return `${value} — ${count} (${pct}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-yellow-50 px-2 py-2.5">
          <div className="text-xl font-bold text-gray-900">{ratingsData.avg_rating.toFixed(1)} ⭐</div>
          <p className="text-[10px] text-gray-500">Avg Rating</p>
        </div>
        <div className="rounded-lg bg-green-50 px-2 py-2.5">
          <div className="text-xl font-bold text-green-700">{total}</div>
          <p className="text-[10px] text-gray-500">Total Ratings</p>
        </div>
        <div className="rounded-lg bg-orange-50 px-2 py-2.5">
          <div className="text-xl font-bold text-orange-600">{ratingsData.negative_count}</div>
          <p className="text-[10px] text-gray-500">Negative</p>
        </div>
      </div>
    </div>
  );
}
