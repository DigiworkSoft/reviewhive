'use client';

import { useState } from 'react';
import type { useReviewFlow } from './useReviewFlow';

interface Props {
  flow: ReturnType<typeof useReviewFlow>;
}

export function StarRating({ flow }: Props) {
  const [hoveredStar, setHoveredStar] = useState(0);

  // Show generating spinner when AI is being called
  if (flow.currentStep === 'generating') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-gray-600">Generating your review options...</p>
        <p className="mt-1 text-sm text-gray-400">This takes a few seconds</p>
      </div>
    );
  }

  // Determine fill: hovered state takes priority, then selected
  const activeStar = hoveredStar || flow.selectedRating;

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        How would you rate your experience?
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        {flow.selectedCourse?.name}
      </p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => flow.submitRating(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            className="group p-1 transition-transform hover:scale-110 active:scale-95"
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <svg
              className={`h-12 w-12 transition-colors ${
                star <= activeStar
                  ? 'fill-yellow-400 text-gray-800'
                  : 'fill-gray-100 text-gray-800 group-hover:fill-yellow-300'
              }`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>
      <button
        onClick={flow.resetFlow}
        className="mt-6 text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to course selection
      </button>
    </div>
  );
}
