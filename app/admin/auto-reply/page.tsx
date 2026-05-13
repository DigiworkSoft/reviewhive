'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  Send,
  XCircle,
  MessageSquareReply,
  Settings2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AddReviewModal } from '@/components/admin/auto-reply/AddReviewModal';
import { ReviewCard } from '@/components/admin/auto-reply/ReviewCard';

type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'posted' | 'skipped';

interface ReviewItem {
  id: number;
  review_id: string;
  reviewer_name: string;
  review_text: string;
  rating: number;
  status: ReviewStatus;
  ai_suggested_reply: string | null;
  final_reply: string | null;
  review_date: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  posted: number;
}

interface GoogleStatus {
  connected: boolean;
  account_name?: string;
  location_name?: string;
  location_title?: string;
}

const statusTabs: Array<{ key: string; label: string }> = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'posted',   label: 'Posted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'skipped',  label: 'Skipped' },
];

const kpiCards = [
  { key: 'pending'  as const, title: 'Pending',  icon: '⏳' },
  { key: 'approved' as const, title: 'Approved', icon: '✅' },
  { key: 'posted'   as const, title: 'Posted',   icon: '🚀' },
  { key: 'rejected' as const, title: 'Rejected', icon: '❌' },
];

export default function AutoReplyPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, posted: 0 });
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({ connected: false });

  const loadGoogleStatus = async () => {
    try {
      const res = await fetch('/api/admin/auto-reply/google/status');
      if (!res.ok) return;
      const data = await res.json();
      setGoogleStatus(data);
    } catch {
      // ignore
    }
  };

  const LIMIT = 20;

  const loadReviews = async (p = page) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/auto-reply?status=${status}&page=${p}&limit=${LIMIT}`);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const data = await res.json();
      setReviews(data.reviews || []);
      setStats(data.stats || { pending: 0, approved: 0, rejected: 0, posted: 0 });
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews(page);
  }, [status, page]);

  useEffect(() => {
    void loadGoogleStatus();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((r) =>
      [r.reviewer_name, r.review_text, r.final_reply || '', r.ai_suggested_reply || '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [reviews, query]);

  const handleGenerate = async (reviewId: number) => {
    const review = reviews.find((r) => r.id === reviewId);
    if (!review) return;

    const res = await fetch('/api/admin/auto-reply/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_id: review.id,
        review_text: review.review_text,
        reviewer_name: review.reviewer_name,
        rating: review.rating,
      }),
    });

    if (!res.ok) return;
    const data = await res.json();

    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId ? { ...r, ai_suggested_reply: data.reply || r.ai_suggested_reply } : r,
      ),
    );
  };

  const handleAction = async (
    reviewId: number,
    action: 'approve' | 'reject' | 'edit' | 'skip' | 'post_to_google',
    replyText?: string,
  ) => {
    const res = await fetch(`/api/admin/auto-reply/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reply_text: replyText }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Action failed' }));
      alert(err.error || 'Action failed');
      return;
    }

    await loadReviews();
  };

  const syncGoogleReviews = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/auto-reply/google/sync', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Sync failed');
        return;
      }
      alert(data.message || 'Sync complete');
      await loadReviews();
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (reviewId: number) => {
    if (!confirm('Delete this review?')) return;
    const res = await fetch('/api/admin/auto-reply', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reviewId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Delete failed' }));
      alert(err.error || 'Delete failed');
      return;
    }
    await loadReviews();
  };

  const totalReviews = stats.pending + stats.approved + stats.posted + stats.rejected;

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
      .reduce<(number | '...')[]>((acc, p, idx, arr) => {
        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
        acc.push(p);
        return acc;
      }, []);
  }, [totalPages, page]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Auto-Reply</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Manual Review
          </button>
          {googleStatus.connected && (
            <button
              onClick={syncGoogleReviews}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Fetching…' : 'Fetch Reviews'}
            </button>
          )}
          <button
            onClick={() => router.push('/admin/auto-reply/settings')}
            className="rounded-lg border p-2 text-gray-500 hover:bg-gray-50"
            title="Settings"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards — same pattern as Dashboard KpiCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.key}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <span>{card.icon}</span> {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-gray-900">
                {stats[card.key]}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setPage(1); setStatus(tab.key); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  status === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search reviewer, review, or reply..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-lg border px-3 py-1.5 pl-9 text-sm"
            />
          </div>
        </div>

        {/* Review List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading reviews…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquareReply className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-500">No reviews found</p>
              <p className="text-xs text-gray-400">Add a manual review or fetch from Google</p>
            </div>
          ) : (
            filtered.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onGenerate={() => handleGenerate(review.id)}
                onAction={handleAction}
                onDelete={handleDelete}
                googleConnected={googleStatus.connected}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-xs text-gray-500">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md border text-gray-500 hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageNumbers.map((item, idx) =>
                item === '...' ? (
                  <span key={`d${idx}`} className="px-1 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item as number)}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors ${
                      page === item
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md border text-gray-500 hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Review Modal */}
      <AddReviewModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={async () => {
          setShowAddModal(false);
          await loadReviews();
        }}
      />
    </div>
  );
}
