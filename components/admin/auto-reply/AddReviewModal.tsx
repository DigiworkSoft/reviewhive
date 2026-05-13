'use client';

import { useState } from 'react';
import { X, Star, Loader2 } from 'lucide-react';

interface AddReviewModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddReviewModal({ open, onClose, onCreated }: AddReviewModalProps) {
  const [reviewerName, setReviewerName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!reviewerName.trim() || !reviewText.trim()) {
      alert('Reviewer name and review text are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/auto-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_name: reviewerName.trim(),
          review_text: reviewText.trim(),
          rating,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to add review' }));
        alert(err.error || 'Failed to add review');
        return;
      }

      setReviewerName('');
      setReviewText('');
      setRating(5);
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Add Manual Review</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Reviewer Name</label>
            <input
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  className="rounded p-0.5 transition-transform hover:scale-110"
                >
                  <Star className={`h-5 w-5 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                </button>
              ))}
              <span className="ml-1.5 text-xs text-gray-400">{rating}/5</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Review Text</label>
            <textarea
              className="min-h-24 w-full rounded-lg border px-3 py-2 text-sm"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Paste review content here..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <button onClick={onClose} disabled={loading} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !reviewerName.trim() || !reviewText.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? 'Saving…' : 'Add Manual Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
