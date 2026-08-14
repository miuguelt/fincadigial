import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { CardContent } from '@/shared/ui/card';
import { buttonVariants } from '@/shared/ui/button';
import { Progress } from '@/shared/ui/progress';
import { ctaLabel, getCourseAccent, type CourseWithProgress } from './courseVisuals';

interface CourseCardBodyProps {
  course: CourseWithProgress;
  href: string;
}

export const CourseCardBody: React.FC<CourseCardBodyProps> = ({ course, href }) => {
  const isDone = course.status === 'completado';
  const barClass = isDone ? 'bg-emerald-500 dark:bg-emerald-400' : getCourseAccent(course.color).bar;

  return (
    <CardContent className="flex flex-1 flex-col gap-4 p-4 pt-3 sm:p-5 sm:pt-3">
      <p className="text-sm text-muted-foreground break-words">{course.description}</p>
      <div className="mt-auto space-y-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-semibold tabular-nums text-foreground">
              {course.completed}/{course.totalLessons} lecciones · {course.percentage}%
            </span>
          </div>
          <Progress
            value={course.percentage}
            className="h-2"
            indicatorClassName={barClass}
            aria-label={`Progreso de ${course.title}: ${course.percentage} por ciento`}
          />
        </div>
        {course.nextLesson ? (
          <p className="text-xs text-muted-foreground break-words">
            <span className="font-medium text-foreground">Siguiente: </span>
            {course.nextLesson.title}
          </p>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Todas las lecciones completadas
          </p>
        )}
        <Link
          to={href}
          tabIndex={-1}
          aria-hidden="true"
          className={buttonVariants({
            variant: course.status === 'sin-iniciar' ? 'primary' : 'outline',
            size: 'sm',
            className: 'relative z-10 w-full',
          })}
        >
          {ctaLabel[course.status]}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </CardContent>
  );
};

export default CourseCardBody;
