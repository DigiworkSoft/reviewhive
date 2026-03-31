'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useReviewFlow } from '@/components/review/useReviewFlow';
import { RoleSelector } from '@/components/review/RoleSelector';
import { CourseSelector } from '@/components/review/CourseSelector';
import { StarRating } from '@/components/review/StarRating';
import { ReviewCards } from '@/components/review/ReviewCards';
import { InstructionPanel } from '@/components/review/InstructionPanel';
import { NegativeFeedback } from '@/components/review/NegativeFeedback';
import { StatusSelector } from '@/components/review/StatusSelector';
import { Shield } from 'lucide-react';

function ReviewFlow() {
  const flow = useReviewFlow();

  if (flow.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="animate-pulse text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  const stepNumber =
    flow.currentStep === 'role' ? 1 :
    flow.currentStep === 'course' ? 2 :
    flow.currentStep === 'status' ? 3 :
    flow.currentStep === 'rating' ? 4 : 5;
  const totalSteps = 5;
  const showProgress = flow.currentStep !== 'negative' && flow.currentStep !== 'instruction' && flow.currentStep !== 'generating';

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="relative border-b border-blue-100 bg-white/80 px-4 py-4 text-center backdrop-blur-sm">
        <h1 className="text-xl font-bold text-gray-900">{flow.academyName || 'Academy'}</h1>
        <p className="mt-1 text-sm text-gray-500">We value your feedback!</p>
        <Link
          href="/admin/login"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-gray-300 transition-colors hover:text-gray-500"
          title="Admin"
        >
          <Shield className="h-4 w-4" />
        </Link>
      </header>

      {showProgress && (
        <div className="px-4 pt-4">
          <div className="mx-auto max-w-md">
            <div className="mb-2 flex justify-between text-xs text-gray-500">
              <span>Step {stepNumber} of {totalSteps}</span>
              <span>
                {flow.currentStep === 'role'
                  ? 'Who Are You'
                  : flow.currentStep === 'course'
                    ? 'Select Course'
                    : flow.currentStep === 'status'
                      ? 'Your Status'
                      : flow.currentStep === 'rating'
                        ? 'Rate Experience'
                        : 'Your Review'}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
        {flow.error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {flow.error}
            <button onClick={flow.clearError} className="ml-2 font-medium underline">
              Dismiss
            </button>
          </div>
        )}

        {flow.currentStep === 'role' && <RoleSelector flow={flow} />}
        {flow.currentStep === 'course' && <CourseSelector flow={flow} />}
        {flow.currentStep === 'status' && <StatusSelector flow={flow} />}
        {flow.currentStep === 'rating' && <StarRating flow={flow} />}

        {flow.currentStep === 'generating' && (
          <div className="flex flex-1 flex-col items-center justify-center py-12">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent shadow-sm"></div>
            <h3 className="text-lg font-bold text-gray-900">Crafting your review...</h3>
            <p className="text-sm text-gray-500">We&apos;re putting your experience into words.</p>
          </div>
        )}

        {flow.currentStep === 'negative' && <NegativeFeedback flow={flow} />}
        {flow.currentStep === 'reviews' && <ReviewCards flow={flow} />}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ReviewFlow />
    </Suspense>
  );
}
