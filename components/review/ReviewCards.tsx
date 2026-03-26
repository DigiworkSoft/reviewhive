'use client';

import { useState } from 'react';
import type { useReviewFlow } from './useReviewFlow';

interface Props {
  flow: ReturnType<typeof useReviewFlow>;
}

export function ReviewCards({ flow }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!flow.review) return null;

  return (
    <div className="flex flex-1 flex-col pb-6">
      <h2 className="mb-1 text-xl font-bold text-gray-900">
        Your review is ready!
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Review the text below, then copy and post it on Google.
      </p>

      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 mb-6">
        {flow.reviewSource === 'fallback' && (
          <span className="mb-2 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Suggested Template
          </span>
        )}
        <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">
          {flow.review}
        </p>
      </div>

      <button
        onClick={() => {
          const text = flow.review;
          const url = flow.googleReviewUrl;
          
          // Robust Copy Function
          const performCopy = (val: string) => {
              const textArea = document.createElement("textarea");
              textArea.value = val;
              textArea.style.position = "fixed";
              textArea.style.left = "-9999px";
              textArea.style.top = "0";
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              try {
                  document.execCommand('copy');
              } catch (err) {
                  console.error('Copy failed');
              }
              document.body.removeChild(textArea);
          };

          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
              .catch(() => performCopy(text))
              .finally(() => {
                  window.location.href = url;
              });
          } else {
            performCopy(text);
            window.location.href = url;
          }
        }}
        className="w-full rounded-xl bg-blue-600 px-4 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95 flex items-center justify-center gap-2"
      >
        <span>📋</span> Copy & Post Review
      </button>

      {flow.reviewSource === 'fallback' && (
        <div className="mt-8 text-center text-[10px] text-gray-400 uppercase tracking-widest">
            Template loaded from database
        </div>
      )}
    </div>
  );
}
