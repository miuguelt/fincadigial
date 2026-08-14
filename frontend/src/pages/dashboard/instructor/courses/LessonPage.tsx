import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { buttonVariants } from '@/shared/ui/button';
import { getCourseBySlug, getLessonById } from '@/features/academy/data';
import { LessonView } from '@/features/academy/ui/LessonView';

const LessonNotFound: React.FC = () => (
  <div className="bg-background px-4 pt-4 pb-6">
    <div className="mx-auto w-full max-w-3xl py-16 text-center">
      <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="mb-2 text-xl font-semibold">Lección no encontrada</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Esta lección no existe o ya no está disponible.
      </p>
      <Link to="/instructor/courses" className={buttonVariants({ size: 'sm' })}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a cursos
      </Link>
    </div>
  </div>
);

const LessonPage: React.FC = () => {
  const { slug = '', lessonId = '' } = useParams<{ slug: string; lessonId: string }>();
  const course = getCourseBySlug(slug);
  const lesson = getLessonById(slug, lessonId);

  if (!course || !lesson) return <LessonNotFound />;

  return <LessonView course={course} lesson={lesson} />;
};

export default LessonPage;
