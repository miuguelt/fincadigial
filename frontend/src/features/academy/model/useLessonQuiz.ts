import { useCallback, useMemo, useState } from 'react';
import { useCourseProgress } from './useCourseProgress';
import type { CourseQuiz } from './types';

export interface QuizScore {
  correct: number;
  total: number;
  percentage: number;
}

const computeScore = (quiz: CourseQuiz, answers: Record<number, number>): QuizScore => {
  const correct = quiz.questions.reduce(
    (acc, question, index) => (answers[index] === question.correctAnswer ? acc + 1 : acc),
    0
  );
  const total = quiz.questions.length;
  return { correct, total, percentage: total > 0 ? Math.round((correct / total) * 100) : 0 };
};

interface UseLessonQuizArgs {
  courseId: string;
  lessonId: string;
  quiz?: CourseQuiz;
}

/** Estado y calificación de la evaluación de una lección. */
export function useLessonQuiz({ courseId, lessonId, quiz }: UseLessonQuizArgs) {
  const { saveQuizScore, markComplete } = useCourseProgress();
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const start = useCallback(() => {
    setStarted(true);
    setCurrent(0);
    setAnswers({});
    setSubmitted(false);
  }, []);

  const review = useCallback(() => {
    setStarted(false);
    setSubmitted(false);
  }, []);

  const select = useCallback(
    (questionIndex: number, answerIndex: number) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [questionIndex]: answerIndex }));
    },
    [submitted]
  );

  const score = useMemo(
    () => (quiz && submitted ? computeScore(quiz, answers) : null),
    [quiz, submitted, answers]
  );

  const submit = useCallback(() => {
    if (!quiz) return;
    const result = computeScore(quiz, answers);
    setSubmitted(true);
    saveQuizScore(courseId, lessonId, result.percentage);
    if (result.percentage >= quiz.passingScore) markComplete(courseId, lessonId);
  }, [quiz, answers, courseId, lessonId, saveQuizScore, markComplete]);

  return {
    started,
    current,
    answers,
    submitted,
    score,
    passed: score ? score.percentage >= (quiz?.passingScore ?? 0) : false,
    answeredAll: quiz ? Object.keys(answers).length >= quiz.questions.length : false,
    start,
    review,
    select,
    submit,
    goTo: setCurrent,
  };
}
