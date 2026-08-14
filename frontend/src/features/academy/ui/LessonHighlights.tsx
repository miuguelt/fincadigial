import React from 'react';
import { Lightbulb, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { cn } from '@/shared/ui/cn';
import { surfaceCard } from './courseVisuals';

interface HighlightCardProps {
  icon: React.ElementType;
  title: string;
  items: string[];
  tile: string;
  marker: string;
}

const HighlightCard: React.FC<HighlightCardProps> = ({
  icon: Icon,
  title,
  items,
  tile,
  marker,
}) => (
  <Card hoverable={false} className={surfaceCard}>
    <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
        <span
          className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', tile)}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="break-words">{title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3">
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-sm text-muted-foreground break-words">
            <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', marker)} aria-hidden="true" />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

interface LessonHighlightsProps {
  objectives: string[];
  keyPoints: string[];
}

export const LessonHighlights: React.FC<LessonHighlightsProps> = ({
  objectives,
  keyPoints,
}) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
    <HighlightCard
      icon={Target}
      title="Objetivos de la lección"
      items={objectives}
      tile="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300"
      marker="bg-emerald-500 dark:bg-emerald-400"
    />
    <HighlightCard
      icon={Lightbulb}
      title="Puntos clave"
      items={keyPoints}
      tile="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300"
      marker="bg-amber-500 dark:bg-amber-400"
    />
  </div>
);

export default LessonHighlights;
