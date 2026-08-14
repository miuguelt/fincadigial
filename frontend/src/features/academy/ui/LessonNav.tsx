import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import type { CourseLesson } from '../model/types';

interface NavCardProps {
  to: string;
  label: string;
  lesson: CourseLesson;
  direction: 'anterior' | 'siguiente';
}

const NavCard: React.FC<NavCardProps> = ({ to, label, lesson, direction }) => (
  <Link
    to={to}
    className={cn(
      'group flex items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-all',
      'hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      direction === 'siguiente' && 'sm:flex-row-reverse sm:text-right'
    )}
  >
    {direction === 'anterior' ? (
      <ArrowLeft
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
        aria-hidden="true"
      />
    ) : (
      <ArrowRight
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
        aria-hidden="true"
      />
    )}
    <span className="min-w-0">
      <span className="block text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="block text-sm font-medium text-foreground break-words transition-colors group-hover:text-primary">
        {lesson.title}
      </span>
    </span>
  </Link>
);

interface LessonNavProps {
  courseSlug: string;
  previous?: CourseLesson;
  next?: CourseLesson;
}

export const LessonNav: React.FC<LessonNavProps> = ({ courseSlug, previous, next }) => {
  if (!previous && !next) return null;
  const href = (lesson: CourseLesson) => `/instructor/courses/${courseSlug}/lessons/${lesson.id}`;

  return (
    <nav
      aria-label="Navegación entre lecciones"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {previous ? (
        <NavCard
          to={href(previous)}
          label="Lección anterior"
          lesson={previous}
          direction="anterior"
        />
      ) : (
        <span className="hidden sm:block" aria-hidden="true" />
      )}
      {next && (
        <NavCard
          to={href(next)}
          label="Siguiente lección"
          lesson={next}
          direction="siguiente"
        />
      )}
    </nav>
  );
};

export default LessonNav;
