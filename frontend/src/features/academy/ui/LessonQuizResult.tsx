import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import type { QuizScore } from '../model/useLessonQuiz';

interface LessonQuizResultProps {
  score: QuizScore;
  passed: boolean;
  passingScore: number;
  onRetry: () => void;
  onReview: () => void;
}

export const LessonQuizResult: React.FC<LessonQuizResultProps> = ({
  score,
  passed,
  passingScore,
  onRetry,
  onReview,
}) => (
  <div
    className={cn(
      'space-y-3 rounded-lg border p-4 shadow-sm',
      passed
        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-400/40 dark:bg-emerald-400/10'
        : 'border-rose-300 bg-rose-50 dark:border-rose-400/40 dark:bg-rose-400/10'
    )}
    role="status"
  >
    <div className="flex gap-2">
      {passed ? (
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
      ) : (
        <XCircle
          className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400"
          aria-hidden="true"
        />
      )}
      <p className="min-w-0 text-sm text-foreground break-words">
        {passed
          ? `Aprobaste la evaluación con ${score.percentage}% (${score.correct} de ${score.total} respuestas correctas). La lección quedó marcada como completada.`
          : `Obtuviste ${score.percentage}% (${score.correct} de ${score.total} respuestas correctas). Necesitas ${passingScore}% para aprobar: repasa el contenido e inténtalo de nuevo.`}
      </p>
    </div>
    <div className="flex flex-wrap gap-2">
      {!passed && (
        <Button variant="primary" size="sm" onClick={onRetry}>
          Reintentar evaluación
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={onReview}>
        Revisar contenido
      </Button>
    </div>
  </div>
);

export default LessonQuizResult;
