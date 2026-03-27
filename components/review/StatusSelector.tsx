'use client';

import type { useReviewFlow } from './useReviewFlow';

interface Props {
  flow: ReturnType<typeof useReviewFlow>;
}

export function StatusSelector({ flow }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        What is your current status?
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        This helps us personalize your review for {flow.selectedCourse?.name}
      </p>

      <div className="space-y-4">
        <button
          onClick={() => flow.selectStatus('pursuing')}
          className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-gray-900">I am currently pursuing</div>
            <div className="text-sm text-gray-500">I am still a student at the academy</div>
          </div>
        </button>

        <button
          onClick={() => flow.selectStatus('completed')}
          className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-gray-900">I have completed</div>
            <div className="text-sm text-gray-500">I am an alumnus or have finished the course</div>
          </div>
        </button>
      </div>

      <button
        onClick={flow.resetFlow}
        className="mt-8 text-sm text-gray-500 hover:text-gray-700 mx-auto"
      >
        ← Back to course selection
      </button>
    </div>
  );
}
