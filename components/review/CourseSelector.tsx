'use client';

import { useState, useMemo } from 'react';
import type { useReviewFlow } from './useReviewFlow';

interface Props {
  flow: ReturnType<typeof useReviewFlow>;
}

export function CourseSelector({ flow }: Props) {
  const [showAllCourses, setShowAllCourses] = useState(false);

  const displayedCourses = useMemo(
    () => (showAllCourses ? flow.courseTags : flow.courseTags.slice(0, 8)),
    [flow.courseTags, showAllCourses]
  );

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        What did you attend?
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Select the course or service you experienced
      </p>
      <div className="grid grid-cols-2 gap-3">
        {displayedCourses.map((course) => (
          <button
            key={course.id}
            onClick={() => flow.selectCourse(course)}
            className="flex min-h-[56px] items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-center text-sm font-medium text-gray-800 shadow-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:shadow-md active:scale-[0.98]"
          >
            {course.name}
          </button>
        ))}
      </div>
      {flow.courseTags.length > 8 && !showAllCourses && (
        <button
          onClick={() => setShowAllCourses(true)}
          className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Show more →
        </button>
      )}
    </div>
  );
}
