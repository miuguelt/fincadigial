import { useCallback, useEffect, useState } from 'react';
import { useCourseProgress } from './useCourseProgress';
import type { CourseProgress } from './types';

/**
 * Mantiene en estado el progreso guardado del curso para que la vista reaccione
 * al marcar una lección: `useCourseProgress` solo lee y escribe en localStorage.
 */
export function useLessonProgressState(courseId: string): {
  progress: CourseProgress;
  refresh: () => void;
  complete: (lessonId: string) => void;
} {
  const { getProgress, markComplete } = useCourseProgress();
  const [progress, setProgress] = useState<CourseProgress>(() => getProgress(courseId));

  useEffect(() => {
    setProgress(getProgress(courseId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const refresh = useCallback(() => {
    setProgress(getProgress(courseId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const complete = useCallback(
    (lessonId: string) => {
      markComplete(courseId, lessonId);
      refresh();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [courseId, refresh]
  );

  return { progress, refresh, complete };
}
