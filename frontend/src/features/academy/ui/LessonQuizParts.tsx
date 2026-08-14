import React from 'react';
import { Trophy } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Progress } from '@/shared/ui/progress';

interface QuizIntroProps {
  passingScore: number;
  onStart: () => void;
}

export const QuizIntro: React.FC<QuizIntroProps> = ({ passingScore, onStart }) => (
  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-muted-foreground break-words">
      Pon a prueba lo aprendido. Necesitas {passingScore}% para aprobar la lección.
    </p>
    <Button size="sm" onClick={onStart} className="w-full sm:w-auto">
      <Trophy className="h-4 w-4" aria-hidden="true" />
      Iniciar evaluación
    </Button>
  </div>
);

interface QuizProgressProps {
  current: number;
  total: number;
  answered: number;
}

export const QuizProgress: React.FC<QuizProgressProps> = ({ current, total, answered }) => (
  <div className="space-y-1.5">
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>
        Pregunta {current + 1} de {total}
      </span>
      <span className="font-semibold tabular-nums text-foreground">
        {answered}/{total} respondidas
      </span>
    </div>
    <Progress
      value={((current + 1) / total) * 100}
      className="h-1.5"
      aria-label={`Pregunta ${current + 1} de ${total}`}
    />
  </div>
);

interface QuizNavProps {
  current: number;
  total: number;
  submitted: boolean;
  answeredAll: boolean;
  onGoTo: (index: number) => void;
  onSubmit: () => void;
}

export const QuizNav: React.FC<QuizNavProps> = ({
  current,
  total,
  submitted,
  answeredAll,
  onGoTo,
  onSubmit,
}) => {
  const isLast = current === total - 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={current === 0}
        onClick={() => onGoTo(Math.max(0, current - 1))}
      >
        Anterior
      </Button>
      {!isLast || submitted ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isLast}
          onClick={() => onGoTo(Math.min(total - 1, current + 1))}
        >
          Siguiente
        </Button>
      ) : (
        <Button size="sm" disabled={!answeredAll} onClick={onSubmit}>
          <Trophy className="h-4 w-4" aria-hidden="true" />
          Finalizar evaluación
        </Button>
      )}
    </div>
  );
};
