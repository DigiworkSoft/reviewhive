'use client';

import { useEffect, useState } from 'react';
import type { useReviewFlow } from './useReviewFlow';

interface Props {
  flow: ReturnType<typeof useReviewFlow>;
}

export function InstructionPanel({ flow }: Props) {
  // No more auto-redirect — let the user take their time
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <span className="text-3xl">📋</span>
      </div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">
        Step 3: Paste on Google
      </h2>
      <p className="mb-6 text-sm text-gray-500 max-w-[280px]">
        Your review is copied! Now just paste it in the box on Google Maps.
      </p>

      {/* Review Text Preview & Manual Copy */}
      <div className="mb-8 w-full max-w-sm rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
        <p className="text-left text-sm italic leading-relaxed text-gray-600 line-clamp-4">
          "{flow.review}"
        </p>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(flow.review);
            alert('Copied to clipboard!');
          }}
          className="mt-4 flex items-center justify-center gap-2 w-full rounded-lg border border-blue-200 bg-blue-50 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 active:scale-95 transition-all"
        >
          <span>📋</span> Copy Review Again
        </button>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* The Final Action Button */}
        <a 
          href={flow.googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-lg font-bold text-white shadow-lg active:scale-95 transition-all"
        >
          Open Google Maps & Paste →
        </a>

        {/* Pro Tip for the user */}
        <div className="rounded-lg bg-amber-50 p-3 border border-amber-100">
            <p className="text-[11px] leading-snug text-amber-800 font-medium">
                💡 <span className="font-bold">Pro Tip:</span> If Google shows an old comment, just delete it first and then long-press to <span className="font-bold underline">Paste</span> your new review.
            </p>
        </div>
      </div>
    </div>
  );
}
