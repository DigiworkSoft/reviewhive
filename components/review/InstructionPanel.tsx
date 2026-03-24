'use client';

import { useEffect, useState } from 'react';
import type { useReviewFlow } from './useReviewFlow';

interface Props {
  flow: ReturnType<typeof useReviewFlow>;
}

export function InstructionPanel({ flow }: Props) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = flow.googleReviewUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [flow.googleReviewUrl]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <span className="text-3xl">✅</span>
      </div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">
        Review copied!
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Follow these steps to post your review:
      </p>
      <div className="mb-8 w-full space-y-3 text-left">
        {[
          'You will be redirected to Google Reviews',
          'Long press the text box on Google',
          'Tap Paste',
          'Hit Post',
        ].map((instruction, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-100"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {i + 1}
            </span>
            <span className="text-sm text-gray-700">{instruction}</span>
          </div>
        ))}
      </div>

      {/* Auto-redirect countdown with spinner */}
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
        <p className="text-sm font-medium text-gray-600">
          Redirecting you to Google Reviews in {countdown}s...
        </p>
      </div>
    </div>
  );
}
