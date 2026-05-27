import { CourseProgress } from '../model/types';

const STORAGE_PREFIX = 'vlm_course_';

export function useCourseProgress() {
  const getProgress = (courseId: string): CourseProgress => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${courseId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.completedLessons !== 'undefined') {
          return parsed;
        }
      }
    } catch {}
    return {
      courseId,
      completedLessons: [],
      quizScores: {},
      lastAccessed: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };
  };

  const saveProgress = (progress: CourseProgress): void => {
    try {
      progress.lastAccessed = new Date().toISOString();
      localStorage.setItem(
        `${STORAGE_PREFIX}${progress.courseId}`,
        JSON.stringify(progress)
      );
    } catch (e) {
      console.warn('[Academy] No se pudo guardar el progreso:', e);
    }
  };

  const markComplete = (courseId: string, lessonId: string): CourseProgress => {
    const progress = getProgress(courseId);
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
      saveProgress(progress);
    }
    return progress;
  };

  const saveQuizScore = (
    courseId: string,
    lessonId: string,
    score: number
  ): CourseProgress => {
    const progress = getProgress(courseId);
    progress.quizScores[lessonId] = score;
    saveProgress(progress);
    return progress;
  };

  const getAllProgress = (): Record<string, CourseProgress> => {
    const result: Record<string, CourseProgress> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const courseId = key.replace(STORAGE_PREFIX, '');
          result[courseId] = getProgress(courseId);
        }
      }
    } catch {}
    return result;
  };

  const resetProgress = (courseId: string): void => {
    localStorage.removeItem(`${STORAGE_PREFIX}${courseId}`);
  };

  return {
    getProgress,
    saveProgress,
    markComplete,
    saveQuizScore,
    getAllProgress,
    resetProgress,
  };
}
