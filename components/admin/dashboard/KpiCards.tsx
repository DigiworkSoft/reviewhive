'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KpiData {
  total_scans: number;
  total_reviews_posted: number;
  conversion_rate: number;
  avg_star_rating: number;
}

interface Props {
  kpiData: KpiData;
  prevMonthData: KpiData | null;
}

function Delta({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  if (!previous) return null;
  const diff = current - previous;
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : 0;
  if (pct === 0) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className={`text-xs font-medium ${pct > 0 ? 'text-green-600' : 'text-red-500'}`}>
      {pct > 0 ? '↑' : '↓'} {Math.abs(pct)}%{suffix}
    </span>
  );
}

const cards = [
  { key: 'total_scans' as const, title: 'Total QR Scans', icon: '📱', fmt: (v: number) => (v || 0).toLocaleString() },
  { key: 'total_reviews_posted' as const, title: 'Reviews Posted', icon: '⭐', fmt: (v: number) => (v || 0).toLocaleString() },
  { key: 'conversion_rate' as const, title: 'Conversion Rate', icon: '📊', fmt: (v: number) => `${v || 0}%` },
  { key: 'avg_star_rating' as const, title: 'Avg Star Rating', icon: '🌟', fmt: (v: number) => (v || 0).toFixed(1) },
];

export function KpiCards({ kpiData, prevMonthData }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.key}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <span>{card.icon}</span> {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{card.fmt(kpiData[card.key])}</span>
              {prevMonthData && <Delta current={kpiData[card.key]} previous={prevMonthData[card.key]} />}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
