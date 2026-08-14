import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import type { CourseLesson } from '../model/types';

interface CourseLessonRowProps {
  lesson: CourseLesson;
  index: number;
  courseSlug: string;
  isCompleted: boolean;
  isNext: boolean;
}

export const CourseLessonRow: React.FC<CourseLessonRowProps> = ({
  lesson,
  index,
  courseSlug,
  isCompleted,
  isNext,
}) => (
  <li>
    <Link
      to={`/instructor/courses/${courseSlug}/lessons/${lesson.id}`}
      className={cn(
        'group flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-all',
        'hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isCompleted
          ? 'border-emerald-200 dark:border-emerald-400/30'
          : 'border-border',
        isNext && 'ring-1 ring-primary/30'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold',
          isCompleted
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-300'
            : 'border-border bg-secondary/60 text-muted-foreground'
        )}
        aria-hidden="true"
      >
        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground break-words transition-colors group-hover:text-primary">
          {lesson.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
            {lesson.duration}
          </span>
          {isNext && <span className="font-medium text-primary">Continuar aquí</span>}
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden="true"
      />
    </Link>
  </li>
);

export default CourseLessonRow;
