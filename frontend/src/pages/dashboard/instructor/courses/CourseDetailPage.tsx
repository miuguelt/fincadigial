import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { buttonVariants } from '@/shared/ui/button';
import { useCoursesWithProgress } from '@/features/academy/model/useCoursesWithProgress';
import { CourseDetailHeader } from '@/features/academy/ui/CourseDetailHeader';
import { CourseLessonRow } from '@/features/academy/ui/CourseLessonRow';
import { ctaLabel } from '@/features/academy/ui/courseVisuals';

const CourseNotFound: React.FC = () => (
  <div className="bg-background px-4 pt-4 pb-6">
    <div className="mx-auto w-full max-w-3xl py-16 text-center">
      <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="mb-2 text-xl font-semibold">Curso no encontrado</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        El curso que buscas no existe o ya no está disponible.
      </p>
      <Link to="/instructor/courses" className={buttonVariants({ size: 'sm' })}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a cursos
      </Link>
    </div>
  </div>
);

const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { courses } = useCoursesWithProgress();
  const course = courses.find((item) => item.slug === slug);

  if (!course) return <CourseNotFound />;

  const targetLesson = course.nextLesson ?? course.lessons[0];

  return (
    <div className="bg-background px-4 pt-4 pb-10 sm:pb-12">
      <div className="mx-auto w-full max-w-3xl space-y-5 sm:space-y-6">
        <CourseDetailHeader course={course} />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight">
              Contenido del curso
            </h2>
            {targetLesson && (
              <Link
                to={`/instructor/courses/${course.slug}/lessons/${targetLesson.id}`}
                className={buttonVariants({ size: 'sm', className: 'w-full sm:w-auto' })}
              >
                {ctaLabel[course.status]}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>

          <ol className="space-y-2">
            {course.lessons.map((lesson, index) => (
              <CourseLessonRow
                key={lesson.id}
                lesson={lesson}
                index={index}
                courseSlug={course.slug}
                isCompleted={course.completedIds.includes(lesson.id)}
                isNext={lesson.id === course.nextLesson?.id}
              />
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
};

export default CourseDetailPage;
