'use client';

import { useState, useEffect, useCallback } from 'react';
import { KpiCards } from '@/components/admin/dashboard/KpiCards';
import { TrendChart } from '@/components/admin/dashboard/TrendChart';
import { WeeklyChart } from '@/components/admin/dashboard/WeeklyChart';
import { CourseBreakdown } from '@/components/admin/dashboard/CourseBreakdown';
import { RatingDistribution } from '@/components/admin/dashboard/RatingDistribution';
import { ActivityFeed } from '@/components/admin/dashboard/ActivityFeed';

const EMPTY_KPI = { total_scans: 0, total_reviews_posted: 0, conversion_rate: 0, avg_star_rating: 0 };

export default function DashboardPage() {
  const [range, setRange] = useState('30');
  const [kpi, setKpi] = useState(EMPTY_KPI);
  const [prevKpi, setPrevKpi] = useState(EMPTY_KPI);
  const [trend, setTrend] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [ratings, setRatings] = useState({ ratings: [] as any[], negative_count: 0, avg_rating: 0 });
  const [feed, setFeed] = useState<any[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(1);
  const [feedCourse, setFeedCourse] = useState('');
  const [courseTags, setCourseTags] = useState<any[]>([]);
  const [sortCol, setSortCol] = useState('conversion_rate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchAll = useCallback(async () => {
    const q = `range=${range}`;
    const [kpiR, prevR, trendR, weeklyR, coursesR, ratingsR, feedR, tagsR] = await Promise.all([
      fetch(`/api/admin/analytics?type=kpi`).then(r => r.json()),
      fetch(`/api/admin/analytics?type=kpi_prev`).then(r => r.json()),
      fetch(`/api/admin/analytics?type=trend&${q}`).then(r => r.json()),
      fetch(`/api/admin/analytics?type=weekly`).then(r => r.json()),
      fetch(`/api/admin/analytics?type=courses&${q}`).then(r => r.json()),
      fetch(`/api/admin/analytics?type=ratings&${q}`).then(r => r.json()),
      fetch(`/api/admin/analytics?type=feed&page=${feedPage}${feedCourse ? `&course=${feedCourse}` : ''}`).then(r => r.json()),
      fetch(`/api/admin/course-tags`).then(r => r.json()),
    ]);
    setKpi(kpiR); setPrevKpi(prevR); setTrend(trendR); setWeekly(weeklyR);
    setCourses(coursesR); setRatings(ratingsR); setFeed(feedR.data || []);
    setFeedTotal(feedR.total_pages || 1); setCourseTags(tagsR);
  }, [range, feedPage, feedCourse]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-poll KPI every 60 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const r = await fetch('/api/admin/analytics?type=kpi');
      if (r.ok) setKpi(await r.json());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSort = (col: string) => {
    const dir = sortCol === col && sortDir === 'desc' ? 'asc' : 'desc';
    setSortCol(col); setSortDir(dir);
    const sorted = [...courses].sort((a, b) => {
      const av = col === 'course_name' ? a[col] : Number(a[col]) || 0;
      const bv = col === 'course_name' ? b[col] : Number(b[col]) || 0;
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    setCourses(sorted);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg border px-3 py-1.5 text-sm">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>
      <KpiCards kpiData={kpi} prevMonthData={prevKpi} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TrendChart dailyData={trend} />
        <WeeklyChart weeklyData={weekly} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CourseBreakdown coursesData={courses} onSort={handleSort} sortColumn={sortCol} sortDir={sortDir} />
        <RatingDistribution ratingsData={ratings} />
      </div>
      <ActivityFeed
        feedData={feed} page={feedPage} totalPages={feedTotal}
        selectedCourse={feedCourse} courseTags={courseTags}
        onPageChange={setFeedPage} onCourseFilter={(c) => { setFeedCourse(c); setFeedPage(1); }}
      />
    </div>
  );
}
