'use client';

import type { useReviewFlow } from './useReviewFlow';

interface Props {
  flow: ReturnType<typeof useReviewFlow>;
}

export function RoleSelector({ flow }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        Who are you?
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Let us know so we can tailor your review experience
      </p>

      <div className="space-y-4">
        <button
          onClick={() => flow.selectRole('student')}
          className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-gray-900">I am a Student</div>
            <div className="text-sm text-gray-500">I study or studied at this academy</div>
          </div>
        </button>

        <button
          onClick={() => flow.selectRole('parent')}
          className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-gray-900">I am a Parent</div>
            <div className="text-sm text-gray-500">My child studies or studied here</div>
          </div>
        </button>
      </div>
    </div>
  );
}
