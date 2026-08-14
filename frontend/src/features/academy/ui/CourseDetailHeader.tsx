import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { ProgressMeter } from './ProgressMeter';
import { cn } from '@/shared/ui/cn';
import {
  getCourseAccent,
  getCourseIcon,
  statusBadge,
  surfaceCard,
  type CourseWithProgress,
} from './courseVisuals';

const CourseMeta: React.FC<{ course: CourseWithProgress }> = ({ course }) => (
  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
    <Badge variant={statusBadge[course.status].variant}>
      {statusBadge[course.status].label}
    </Badge>
    <span className="inline-flex items-center gap-1">
      <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {course.totalLessons} lecciones
    </span>
    <span className="inline-flex items-center gap-1">
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {course.totalDuration}
    </span>
    <span>Nivel {course.level.toLowerCase()}</span>
  </div>
);

interface CourseDetailHeaderProps {
  course: CourseWithProgress;
}

export const CourseDetailHeader: React.FC<CourseDetailHeaderProps> = ({ course }) => {
  const CourseIcon = getCourseIcon(course.icon);
  const accent = getCourseAccent(course.color);

  return (
    <header className="space-y-4">
      <Link
        to="/instructor/courses"
        className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        Centro de Capacitación
      </Link>

      <Card hoverable={false} className={surfaceCard}>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <span
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border sm:h-14 sm:w-14',
                accent.tile
              )}
              aria-hidden="true"
            >
              <CourseIcon className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>
            <div className="min-w-0 space-y-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-words">
                {course.title}
              </h1>
              <CourseMeta course={course} />
            </div>
          </div>

          <p className="text-sm text-muted-foreground break-words">{course.description}</p>

          <ProgressMeter
            label="Progreso del curso"
            detail={`${course.completed}/${course.totalLessons} lecciones · ${course.percentage}%`}
            value={course.percentage}
            indicatorClassName={
              course.status === 'completado' ? 'bg-emerald-500 dark:bg-emerald-400' : accent.bar
            }
            ariaLabel={`Progreso del curso: ${course.percentage} por ciento`}
          />
        </CardContent>
      </Card>
    </header>
  );
};

export default CourseDetailHeader;
