import React from 'react';
import { ClipboardList, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useLessonQuiz } from '../model/useLessonQuiz';
import { LessonQuizQuestion } from './LessonQuizQuestion';
import { LessonQuizResult } from './LessonQuizResult';
import { QuizIntro, QuizNav, QuizProgress } from './LessonQuizParts';
import { surfaceCard } from './courseVisuals';
import type { CourseQuiz } from '../model/types';

type QuizState = ReturnType<typeof useLessonQuiz>;

interface QuizRunnerProps {
  quiz: CourseQuiz;
  q: QuizState;
  onSubmit: () => void;
}

const QuizRunner: React.FC<QuizRunnerProps> = ({ quiz, q, onSubmit }) => (
  <>
    <QuizProgress
      current={q.current}
      total={quiz.questions.length}
      answered={Object.keys(q.answers).length}
    />
    <LessonQuizQuestion
      question={quiz.questions[q.current]}
      questionIndex={q.current}
      selected={q.answers[q.current]}
      submitted={q.submitted}
      onSelect={q.select}
    />
    <QuizNav
      current={q.current}
      total={quiz.questions.length}
      submitted={q.submitted}
      answeredAll={q.answeredAll}
      onGoTo={q.goTo}
      onSubmit={onSubmit}
    />
    {q.submitted && q.score && (
      <LessonQuizResult
        score={q.score}
        passed={q.passed}
        passingScore={quiz.passingScore}
        onRetry={q.start}
        onReview={q.review}
      />
    )}
  </>
);

interface LessonQuizProps {
  quiz: CourseQuiz;
  courseId: string;
  lessonId: string;
  onProgressChange?: () => void;
}

export const LessonQuiz: React.FC<LessonQuizProps> = ({
  quiz,
  courseId,
  lessonId,
  onProgressChange,
}) => {
  const q = useLessonQuiz({ courseId, lessonId, quiz });
  const total = quiz.questions.length;
  const handleSubmit = () => {
    q.submit();
    onProgressChange?.();
  };

  return (
    <Card hoverable={false} className={surfaceCard}>
      <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/15 dark:text-indigo-300"
            aria-hidden="true"
          >
            <ClipboardList className="h-4 w-4" />
          </span>
          <span className="break-words">Evaluación · {total} preguntas</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 p-4 pt-4 sm:p-6 sm:pt-5">
        {q.started ? (
          <QuizRunner quiz={quiz} q={q} onSubmit={handleSubmit} />
        ) : (
          <QuizIntro passingScore={quiz.passingScore} onStart={q.start} />
        )}
      </CardContent>
    </Card>
  );
};

interface CompleteLessonCardProps {
  onComplete: () => void;
}

/** Cierre de lecciones sin evaluación: acción explícita para marcar el avance. */
export const CompleteLessonCard: React.FC<CompleteLessonCardProps> = ({ onComplete }) => (
  <Card hoverable={false} className={surfaceCard}>
    <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <p className="text-sm text-muted-foreground break-words">
        ¿Terminaste de leer? Marca la lección como completada para registrar tu avance.
      </p>
      <Button size="sm" onClick={onComplete} className="w-full sm:w-auto">
        <Trophy className="h-4 w-4" aria-hidden="true" />
        Marcar como completada
      </Button>
    </CardContent>
  </Card>
);

export default LessonQuiz;
