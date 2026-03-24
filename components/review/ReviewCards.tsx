'use client';

import { useState } from 'react';
import type { useReviewFlow } from './useReviewFlow';

interface Props {
  flow: ReturnType<typeof useReviewFlow>;
}

export function ReviewCards({ flow }: Props) {
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number | null>(null);
  const toneLabels = ['Enthusiastic', 'Professional', 'Concise'];

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        Choose a review to post
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Pick the one that best represents your experience
      </p>
      <div className="flex flex-col gap-3">
        {flow.reviews.map((review, index) => {
          const isSelected = selectedReviewIndex === index;
          return (
            <div
              key={index}
              onClick={() => setSelectedReviewIndex(index)}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Option {index + 1} — {toneLabels[index]}
                </span>
                {flow.reviewSource === 'fallback' && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                    Template
                  </span>
                )}
              </div>
              <p className="mb-3 text-sm leading-relaxed text-gray-700">
                {review}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  flow.handleCopyAndOpen(review, index + 1);
                }}
                className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98]"
              >
                📋 Copy & Open Google
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
