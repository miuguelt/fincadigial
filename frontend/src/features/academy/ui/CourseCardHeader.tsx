import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/ui/cn';
import {
  getCourseAccent,
  getCourseIcon,
  statusBadge,
  type CourseWithProgress,
} from './courseVisuals';

interface CourseCardHeaderProps {
  course: CourseWithProgress;
  href: string;
}

export const CourseCardHeader: React.FC<CourseCardHeaderProps> = ({ course, href }) => {
  const CourseIcon = getCourseIcon(course.icon);
  const accent = getCourseAccent(course.color);
  const badge = statusBadge[course.status];

  return (
    <CardHeader className="gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
              accent.tile
            )}
            aria-hidden="true"
          >
            <CourseIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold break-words">
              <Link
                to={href}
                className="rounded-lg outline-none transition-colors group-hover:text-primary after:absolute after:inset-0 after:content-['']"
              >
                {course.title}
              </Link>
            </CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
                {course.totalLessons} lecciones
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                {course.totalDuration}
              </span>
              <span aria-hidden="true">·</span>
              <span>{course.level}</span>
            </CardDescription>
          </div>
        </div>
        <Badge variant={badge.variant} className="shrink-0">
          {badge.label}
        </Badge>
      </div>
    </CardHeader>
  );
};

export default CourseCardHeader;
