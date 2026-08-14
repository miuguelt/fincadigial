import React from 'react';
import { GraduationCap } from 'lucide-react';
import { useCoursesWithProgress } from '@/features/academy/model/useCoursesWithProgress';
import { AcademyProgressSummary } from '@/features/academy/ui/AcademyProgressSummary';
import { CourseCard } from '@/features/academy/ui/CourseCard';
import { courseNumber } from '@/features/academy/ui/courseVisuals';

const CourseListPage: React.FC = () => {
  const { courses, summary } = useCoursesWithProgress();

  return (
    <div className="bg-background px-4 pt-4 pb-6 sm:pb-8">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-words">
              Centro de Capacitación
            </h1>
            <p className="text-sm text-muted-foreground mt-1 break-words">
              Completa los cursos para mejorar tus habilidades como instructor.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
            <GraduationCap className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="break-words">
              {courseNumber.format(courses.length)} cursos ·{' '}
              {courseNumber.format(summary.totalLessons)} lecciones
            </span>
          </div>
        </header>

        <AcademyProgressSummary summary={summary} totalCourses={courses.length} />

        <section aria-label="Cursos disponibles">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CourseListPage;
