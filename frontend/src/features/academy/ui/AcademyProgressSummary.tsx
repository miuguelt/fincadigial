import React from 'react';
import { CheckCircle2, Layers, PlayCircle } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Progress } from '@/shared/ui/progress';
import { cn } from '@/shared/ui/cn';
import type { AcademySummary } from '../model/useCoursesWithProgress';
import { courseNumber, surfaceCard } from './courseVisuals';

interface SummaryStatProps {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
}

const SummaryStat: React.FC<SummaryStatProps> = ({ icon: Icon, label, value, tone }) => (
  <div className="min-w-0 rounded-lg border border-border/70 bg-secondary/40 px-3 py-2.5">
    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground break-words">
      <Icon className={cn('h-3.5 w-3.5 shrink-0', tone)} aria-hidden="true" />
      {label}
    </dt>
    <dd className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</dd>
  </div>
);

interface AcademyProgressSummaryProps {
  summary: AcademySummary;
  totalCourses: number;
}

export const AcademyProgressSummary: React.FC<AcademyProgressSummaryProps> = ({
  summary,
  totalCourses,
}) => (
  <Card hoverable={false} className={surfaceCard}>
    <CardContent className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Tu avance general</h2>
          <span className="text-2xl font-bold tabular-nums text-primary">
            {summary.percentage}%
          </span>
        </div>
        <Progress
          value={summary.percentage}
          className="h-2.5"
          aria-label={`Avance general: ${summary.percentage} por ciento`}
        />
        <p className="text-xs text-muted-foreground break-words">
          {courseNumber.format(summary.completedLessons)} de{' '}
          {courseNumber.format(summary.totalLessons)} lecciones completadas
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryStat
          icon={CheckCircle2}
          label="Cursos completados"
          value={`${summary.completedCourses}/${totalCourses}`}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <SummaryStat
          icon={PlayCircle}
          label="Cursos en progreso"
          value={courseNumber.format(summary.inProgressCourses)}
          tone="text-amber-600 dark:text-amber-400"
        />
        <SummaryStat
          icon={Layers}
          label="Lecciones pendientes"
          value={courseNumber.format(summary.totalLessons - summary.completedLessons)}
          tone="text-primary"
        />
      </dl>
    </CardContent>
  </Card>
);

export default AcademyProgressSummary;
