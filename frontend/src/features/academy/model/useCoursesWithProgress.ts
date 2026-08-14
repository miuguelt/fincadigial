import { useMemo } from 'react';
import { allCourses } from '../data';
import { useCourseProgress } from './useCourseProgress';
import type { CourseStatus, CourseWithProgress } from '../ui/courseVisuals';

export interface AcademySummary {
  totalLessons: number;
  completedLessons: number;
  completedCourses: number;
  inProgressCourses: number;
  percentage: number;
}

const resolveStatus = (completed: number, percentage: number): CourseStatus => {
  if (percentage >= 100) return 'completado';
  return completed > 0 ? 'en-progreso' : 'sin-iniciar';
};

/** Combina el catálogo estático de cursos con el progreso guardado localmente. */
export function useCoursesWithProgress(): {
  courses: CourseWithProgress[];
  summary: AcademySummary;
} {
  const { getAllProgress } = useCourseProgress();
  const progressKey = JSON.stringify(getAllProgress());

  const courses = useMemo<CourseWithProgress[]>(() => {
    const stored = JSON.parse(progressKey) as ReturnType<typeof getAllProgress>;
    return allCourses.map((course) => {
      const completedLessons = stored[course.id]?.completedLessons ?? [];
      const completed = completedLessons.length;
      const percentage =
        course.totalLessons > 0
          ? Math.round((completed / course.totalLessons) * 100)
          : 0;
      return {
        ...course,
        completed,
        completedIds: completedLessons,
        percentage,
        status: resolveStatus(completed, percentage),
        nextLesson: course.lessons.find((lesson) => !completedLessons.includes(lesson.id)),
      };
    });
  }, [progressKey]);

  const summary = useMemo<AcademySummary>(() => {
    const totalLessons = courses.reduce((acc, course) => acc + course.totalLessons, 0);
    const completedLessons = courses.reduce((acc, course) => acc + course.completed, 0);
    return {
      totalLessons,
      completedLessons,
      completedCourses: courses.filter((course) => course.status === 'completado').length,
      inProgressCourses: courses.filter((course) => course.status === 'en-progreso').length,
      percentage:
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    };
  }, [courses]);

  return { courses, summary };
}
