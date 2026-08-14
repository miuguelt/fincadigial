import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { ProgressMeter } from './ProgressMeter';
import { surfaceCard } from './courseVisuals';
import type { Course, CourseLesson } from '../model/types';

interface LessonMetaProps {
  position: string;
  duration: string;
  isCompleted: boolean;
  savedScore?: number;
  passingScore: number;
}

const LessonMeta: React.FC<LessonMetaProps> = ({
  position,
  duration,
  isCompleted,
  savedScore,
  passingScore,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="info">{position}</Badge>
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {duration}
    </span>
    {isCompleted && (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
        Completada
      </Badge>
    )}
    {savedScore !== undefined && (
      <Badge variant={savedScore >= passingScore ? 'success' : 'destructive'} className="gap-1">
        <Trophy className="h-3 w-3 shrink-0" aria-hidden="true" />
        Evaluación: {savedScore}%
      </Badge>
    )}
  </div>
);

interface LessonHeaderProps {
  course: Course;
  lesson: CourseLesson;
  lessonIndex: number;
  completedLessons: number;
  isCompleted: boolean;
  savedScore?: number;
  passingScore: number;
}

export const LessonHeader: React.FC<LessonHeaderProps> = ({
  course,
  lesson,
  lessonIndex,
  completedLessons,
  isCompleted,
  savedScore,
  passingScore,
}) => {
  const percentage =
    course.totalLessons > 0
      ? Math.round((completedLessons / course.totalLessons) * 100)
      : 0;

  return (
    <header className="space-y-4">
      <Link
        to={`/instructor/courses/${course.slug}`}
        className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="break-words">{course.title}</span>
      </Link>

      <Card hoverable={false} className={surfaceCard}>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <LessonMeta
            position={`Lección ${lessonIndex + 1} de ${course.totalLessons}`}
            duration={lesson.duration}
            isCompleted={isCompleted}
            savedScore={savedScore}
            passingScore={passingScore}
          />

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-words">
            {lesson.title}
          </h1>

          <ProgressMeter
            label="Avance del curso"
            detail={`${completedLessons}/${course.totalLessons} lecciones · ${percentage}%`}
            value={percentage}
            className="h-1.5"
            ariaLabel={`Avance del curso ${course.title}: ${percentage} por ciento`}
          />
        </CardContent>
      </Card>
    </header>
  );
};

export default LessonHeader;
