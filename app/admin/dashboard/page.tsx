'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KpiData {
  total_scans: number;
  total_reviews_posted: number;
  conversion_rate: number;
  avg_star_rating: number;
}

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchKpi() {
      try {
        const res = await fetch('/api/admin/analytics?type=kpi');
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/admin/login';
            return;
          }
          throw new Error('Failed to fetch');
        }
        const data = await res.json();
        setKpi(data);
      } catch {
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }
    fetchKpi();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    window.location.href = '/admin/login';
  };

  const kpiCards = kpi
    ? [
        {
          title: 'Total QR Scans',
          value: kpi.total_scans.toLocaleString(),
          icon: '📱',
          description: 'All time',
        },
        {
          title: 'Reviews Posted',
          value: kpi.total_reviews_posted.toLocaleString(),
          icon: '⭐',
          description: 'Google reviews',
        },
        {
          title: 'Conversion Rate',
          value: `${kpi.conversion_rate}%`,
          icon: '📊',
          description: 'Scans → Reviews',
        },
        {
          title: 'Avg Star Rating',
          value: kpi.avg_star_rating.toFixed(1),
          icon: '🌟',
          description: '4★–5★ only',
        },
      ]
    : [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Review performance overview</p>
          </div>
          <nav className="flex items-center gap-3">
            <a
              href="/admin/config"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Config
            </a>
            <a
              href="/api/qr/poster"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Download QR Poster
            </a>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-red-600"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* KPI Cards */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {kpi && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpiCards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <span>{card.icon}</span>
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {card.value}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{card.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
