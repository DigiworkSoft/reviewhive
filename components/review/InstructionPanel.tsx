'use client';

import { useEffect, useState } from 'react';
import type { useReviewFlow } from './useReviewFlow';

interface Props {
  flow: ReturnType<typeof useReviewFlow>;
}

export function InstructionPanel({ flow }: Props) {
  const [countdown, setCountdown] = useState(2);

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
      <h2 className="mb-4 text-xl font-bold text-gray-900">
        Paste and submit review
      </h2>

      {/* Auto-redirect countdown with spinner */}
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
        <p className="text-sm font-medium text-gray-600">
          Redirecting in {countdown}s...
        </p>
      </div>
    </div>
  );
}
