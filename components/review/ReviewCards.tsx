'use client';

import { useState } from 'react';
import type { useReviewFlow } from './useReviewFlow';

interface Props {
  flow: ReturnType<typeof useReviewFlow>;
}

export function ReviewCards({ flow }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!flow.review) return null;

  // Show first ~200 characters when collapsed
  const isLong = flow.review.length > 200;
  const displayText = !expanded && isLong
    ? flow.review.slice(0, 200) + '...'
    : flow.review;

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        Your review is ready!
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Review the text below, then copy and post it on Google
      </p>

      <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
        {flow.reviewSource === 'fallback' && (
          <span className="mb-2 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
            Template
          </span>
        )}
        <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
          {displayText}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      <button
        onClick={() => flow.handleCopyAndOpen(flow.review)}
        className="mt-4 w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98]"
      >
        📋 Post Review
      </button>
    </div>
  );
}
