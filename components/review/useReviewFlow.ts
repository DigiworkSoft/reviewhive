'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────
export interface CourseTag {
  id: string;
  name: string;
  description: string | null;
}

export type Step = 'role' | 'course' | 'status' | 'rating' | 'negative' | 'generating' | 'reviews' | 'instruction';

// ── Hook ───────────────────────────────────────────────────────────────────
export function useReviewFlow() {
  const searchParams = useSearchParams();
  const source = searchParams.get('src') || 'direct';

  const sessionIdRef = useRef<string>('');
  const [currentStep, setCurrentStep] = useState<Step>('role');
  const [courseTags, setCourseTags] = useState<CourseTag[]>([]);
  const [selectedCourse, setSelectedCourseState] = useState<CourseTag | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [userStatus, setUserStatus] = useState<'pursuing' | 'completed' | null>(null);
  const [reviewerType, setReviewerType] = useState<'student' | 'parent' | null>(null);
  const [review, setReview] = useState('');
  const [reviewSource, setReviewSource] = useState<string>('ai');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [academyName, setAcademyName] = useState('');

  // ── Session ID (created once on mount) ─────────────────────────────────
  useEffect(() => {
    const existing = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('review_session_id') : null;
    if (existing) {
      sessionIdRef.current = existing;
    } else {
      let newId;
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        newId = crypto.randomUUID();
      } else {
        const arr = new Uint8Array(16);
        crypto.getRandomValues(arr);
        arr[6] = (arr[6] & 0x0f) | 0x40;
        arr[8] = (arr[8] & 0x3f) | 0x80;
        const hex = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
        newId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      }
      sessionIdRef.current = newId;
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('review_session_id', newId);
    }
  }, []);

  // ── Log event helper ───────────────────────────────────────────────────
  const logEvent = useCallback(
    async (
      eventType: string,
      extras: {
        course_tag_id?: string | null;
        star_rating?: number | null;
        ai_used?: boolean | null;
        user_status?: 'pursuing' | 'completed' | null;
        reviewer_type?: 'student' | 'parent' | null;
        option_number_selected?: number | null;
        generated_text?: string | null;
        source?: string | null;
      } = {}
    ) => {
      try {
        await fetch('/api/review/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            event_type: eventType,
            session_id: sessionIdRef.current,
            user_status: extras.user_status || userStatus, // Use provided or current state
            source: extras.source || source, // Use provider name or original marketing source
            ...extras,
          }),
        });
      } catch {
        // Silent fail — don't block the user flow
      }
    },
    [source, userStatus]
  );

  // ── Fetch course tags and config on mount ──────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const [tagsRes, configRes] = await Promise.all([
          fetch('/api/review/course-tags'),
          fetch('/api/review/config'),
        ]);
        if (tagsRes.ok) {
          const tags = await tagsRes.json();
          setCourseTags(tags);
        }
        if (configRes.ok) {
          const config = await configRes.json();
          setWhatsappNumber(config.whatsapp_number || '');
          // Append a timestamp to bypass Google Maps app caching of drafts
          const timestamp = new Date().getTime();
          const finalUrl = config.review_redirect_url || '';
          const cacheBustedUrl = finalUrl.includes('?') 
            ? `${finalUrl}&t=${timestamp}` 
            : `${finalUrl}?t=${timestamp}`;
          setGoogleReviewUrl(cacheBustedUrl);
          setAcademyName(config.academy_name || 'Academy');
        }
      } catch (e) {
        console.error('Failed to load initial data:', e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // ── Log scan on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (sessionIdRef.current) {
      const scanned = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('review_scanned') : null;
      if (!scanned) {
        logEvent('scan');
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('review_scanned', 'true');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdRef.current, logEvent]);

  // ── selectCourse ───────────────────────────────────────────────────────
  const selectCourse = useCallback(
    (course: CourseTag) => {
      setSelectedCourseState(course);
      logEvent('course_selected', { course_tag_id: course.id });
      setCurrentStep('status');
    },
    [logEvent]
  );

  // ── selectRole ─────────────────────────────────────────────────────────
  const selectRole = useCallback(
    (role: 'student' | 'parent') => {
      setReviewerType(role);
      logEvent('role_selected', { reviewer_type: role });
      setCurrentStep('course');
    },
    [logEvent]
  );


  // ── selectStatus ───────────────────────────────────────────────────────
  const selectStatus = useCallback(
    (status: 'pursuing' | 'completed') => {
      setUserStatus(status);
      logEvent('status_selected', { 
        course_tag_id: selectedCourse?.id,
        // Using option_number_selected as a proxy for status choice if needed, 
        // but logEvent can be updated later if we need strict typing for status
      });
      setCurrentStep('rating');
    },
    [logEvent, selectedCourse]
  );

  // ── submitRating ───────────────────────────────────────────────────────
  const submitRating = useCallback(
    async (rating: number) => {
      setSelectedRating(rating);
      logEvent('rating_submitted', {
        course_tag_id: selectedCourse?.id,
        star_rating: rating,
      });

      if (rating <= 4) {
        logEvent('negative_feedback', {
          course_tag_id: selectedCourse?.id,
          star_rating: rating,
        });
        setCurrentStep('negative');
        return;
      }

      // 5★ — proceed to AI generation
      setCurrentStep('generating');
      try {
        const res = await fetch('/api/review/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_tag_id: selectedCourse?.id,
            star_rating: rating,
            user_status: userStatus || undefined,
            reviewer_type: reviewerType || undefined,
            session_id: sessionIdRef.current,
            source,
          }),
        });

        if (!res.ok) {
          throw new Error('Generation failed');
        }

        const data = await res.json();
        setReview(data.review);
        setReviewSource(data.provider);
        
        // Log successful generation with specific provider (Gemini/OpenAI) as source
        logEvent(data.provider === 'fallback' ? 'fallback_used' : 'ai_generated', {
          course_tag_id: selectedCourse?.id,
          star_rating: rating,
          generated_text: data.review,
          source: data.provider, // Override default 'poster/qr' source for this event
        });

        setCurrentStep('reviews');
      } catch {
        setError('Something went wrong. Please try again.');
        setCurrentStep('rating');
      }
    },
    [selectedCourse, logEvent, source]
  );

  // ── handleCopyAndOpen — MUST be synchronous (iOS Safari) ───────────────
  const handleCopyAndOpen = useCallback(
    (reviewText: string) => {
      // 1. Synchronous clipboard write — MUST be first, no await before it
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(reviewText);
      } else {
        // Fallback for non-secure contexts (HTTP on local network)
        const textarea = document.createElement('textarea');
        textarea.value = reviewText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      // Navigation is now handled by ReviewCards inline
    },
    [selectedCourse, selectedRating, reviewSource, logEvent]
  );

  // ── resetFlow — go back to role selection ──────────────────────────────
  const resetFlow = useCallback(() => {
    setSelectedRating(0);
    setUserStatus(null);
    setCurrentStep('role');
  }, []);

  // ── clearError ─────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ── WhatsApp link (computed) ───────────────────────────────────────────
  const whatsappLink = useMemo(() => {
    const message = `Hi, I wanted to share some feedback about ${selectedCourse?.name || 'your academy'}.`;
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  }, [whatsappNumber, selectedCourse]);

  return {
    // State
    currentStep,
    courseTags,
    selectedCourse,
    selectedRating,
    review,
    reviewSource,
    userStatus,
    reviewerType,
    isLoading,
    error,
    googleReviewUrl,
    academyName,
    whatsappLink,
    source,

    // Actions
    selectRole,
    selectCourse,
    selectStatus,
    submitRating,
    handleCopyAndOpen,
    resetFlow,
    clearError,
    logEvent,
  };
}
