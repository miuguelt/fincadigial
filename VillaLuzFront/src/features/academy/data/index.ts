export { courseBasics } from './course-basics';
export { courseHealth } from './course-health';
export { courseReproduction } from './course-reproduction';
export { courseRecords } from './course-records';

import { Course } from '../model/types';
import { courseBasics } from './course-basics';
import { courseHealth } from './course-health';
import { courseReproduction } from './course-reproduction';
import { courseRecords } from './course-records';

export const allCourses: Course[] = [
  courseBasics,
  courseHealth,
  courseReproduction,
  courseRecords,
];

export const getCourseBySlug = (slug: string): Course | undefined =>
  allCourses.find((c) => c.slug === slug);

export const getLessonById = (courseSlug: string, lessonId: string) => {
  const course = getCourseBySlug(courseSlug);
  if (!course) return undefined;
  return course.lessons.find((l) => l.id === lessonId);
};
