'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Check,
  Pencil,
  SkipForward,
  X,
  Send,
  Star,
  Trash2,
  Loader2,
} from 'lucide-react';

interface Review {
  id: number;
  review_id: string;
  reviewer_name: string;
  review_text: string;
  rating: number;
  status: 'pending' | 'approved' | 'rejected' | 'posted' | 'skipped';
  ai_suggested_reply: string | null;
  final_reply: string | null;
  review_date: string | null;
  replied_at: string | null;
}

interface Props {
  review: Review;
  onGenerate: () => void;
  onAction: (
    reviewId: number,
    action: 'approve' | 'reject' | 'edit' | 'skip' | 'post_to_google',
    replyText?: string,
  ) => Promise<void>;
  onDelete: (reviewId: number) => void;
  googleConnected: boolean;
}

const statusBadge: Record<string, { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  posted:   { label: 'Posted',   className: 'bg-blue-100 text-blue-700 border-blue-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  skipped:  { label: 'Skipped',  className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export function ReviewCard({ review, onGenerate, onAction, onDelete, googleConnected }: Props) {
  const [editing, setEditing] = useState(false);
  const [replyText, setReplyText] = useState(review.final_reply || review.ai_suggested_reply || '');
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);

  const displayReply = useMemo(
    () => review.final_reply || review.ai_suggested_reply || '',
    [review.final_reply, review.ai_suggested_reply],
  );

  const runAction = async (
    action: 'approve' | 'reject' | 'edit' | 'skip' | 'post_to_google',
    text?: string,
  ) => {
    setBusy(true);
    try {
      await onAction(review.id, action, text);
      if (action === 'edit') setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try { await onGenerate(); } finally { setGenerating(false); }
  };

  const badge = statusBadge[review.status] || statusBadge.pending;

  return (
    <div className="rounded-xl border bg-white p-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <p className="text-sm font-semibold text-gray-900">{review.reviewer_name}</p>
          <div className="flex items-center gap-px">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className={`h-3 w-3 ${i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
            ))}
          </div>
          <Badge variant="outline" className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
          {review.review_date && (
            <span className="text-[10px] text-gray-400">
              Reviewed: {new Date(review.review_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)} disabled={busy} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50" title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(review.id)} disabled={busy} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Review text */}
      <p className="mt-2 text-sm leading-relaxed text-gray-600">&ldquo;{review.review_text}&rdquo;</p>

      {/* Reply section */}
      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea
            className="min-h-20 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your reply..."
          />
          <div className="flex gap-2">
            <button onClick={() => runAction('edit', replyText)} disabled={busy || !replyText.trim()} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              Save
            </button>
            <button onClick={() => setEditing(false)} disabled={busy} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      ) : displayReply ? (
        <div className={`mt-3 rounded-lg border p-3 text-sm ${
          review.status === 'posted'
            ? 'border-blue-100 bg-blue-50 text-blue-800'
            : 'border-gray-100 bg-gray-50 text-gray-700'
        }`}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">
              {review.status === 'posted' ? '✅ Posted Reply' : 'AI Reply'}
            </span>
            {review.replied_at && (
              <span className="text-[10px] text-gray-400">
                Replied: {new Date(review.replied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          {displayReply}
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button onClick={handleGenerate} disabled={busy || generating} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Generate
        </button>
        <button onClick={() => runAction('approve', replyText || displayReply || undefined)} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">
          <Check className="h-3 w-3" /> Approve
        </button>
        <button onClick={() => runAction('skip')} disabled={busy} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
          <SkipForward className="h-3 w-3" /> Skip
        </button>
        <button onClick={() => runAction('reject')} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50">
          <X className="h-3 w-3" /> Reject
        </button>
        {googleConnected && review.status === 'approved' && (
          <button onClick={() => runAction('post_to_google', replyText || displayReply)} disabled={busy || !(replyText || displayReply).trim()} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            <Send className="h-3 w-3" /> Post to Google
          </button>
        )}
      </div>
    </div>
  );
}
