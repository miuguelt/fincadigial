import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Separator } from '@/shared/ui/separator';
import { getCourseBySlug, getLessonById } from '@/features/academy/data';
import { useCourseProgress } from '@/features/academy/model/useCourseProgress';
import { QuizQuestion } from '@/features/academy/model/types';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Target,
  ClipboardList,
  Trophy,
} from 'lucide-react';

const LessonPage: React.FC = () => {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const navigate = useNavigate();
  const { getProgress, markComplete, saveQuizScore } = useCourseProgress();

  const course = getCourseBySlug(slug || '');
  const lesson = getLessonById(slug || '', lessonId || '');

  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Todos los hooks van antes del early return de "lección no encontrada":
  // colgados detrás de él, React veía distinto número de hooks según existiera
  // o no la lección y abortaba con "Rendered fewer hooks than expected".
  const quiz = lesson?.quiz;

  const handleStartQuiz = useCallback(() => {
    setQuizStarted(true);
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setSubmitted(false);
    setShowExplanation(false);
  }, []);

  const handleSelectAnswer = useCallback(
    (questionIdx: number, answerIdx: number) => {
      if (submitted) return;
      setSelectedAnswers((prev) => ({ ...prev, [questionIdx]: answerIdx }));
    },
    [submitted]
  );

  const handleSubmitQuiz = useCallback(() => {
    setSubmitted(true);
    setShowExplanation(true);
    if (!quiz || !course || !lesson) return;

    let correct = 0;
    quiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) correct++;
    });

    const score = Math.round((correct / quiz.questions.length) * 100);
    saveQuizScore(course.id, lesson.id, score);

    if (score >= quiz.passingScore) {
      markComplete(course.id, lesson.id);
    }
  }, [quiz, selectedAnswers, course, lesson, saveQuizScore, markComplete]);

  const handleCompleteWithoutQuiz = useCallback(() => {
    if (!course || !lesson) return;
    markComplete(course.id, lesson.id);
  }, [course, lesson, markComplete]);

  const quizScore = useMemo(() => {
    if (!quiz || !submitted) return null;
    let correct = 0;
    quiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) correct++;
    });
    return { correct, total: quiz.questions.length, percentage: Math.round((correct / quiz.questions.length) * 100) };
  }, [quiz, submitted, selectedAnswers]);

  if (!course || !lesson) {
    return (
      <div className="bg-background px-4 pt-4 pb-6">
        <div className="w-full max-w-4xl mx-auto text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Lección no encontrada</h2>
          <p className="text-muted-foreground mb-4">
            Esta lección no existe o no está disponible.
          </p>
          <Button onClick={() => navigate('/instructor/courses')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a cursos
          </Button>
        </div>
      </div>
    );
  }

  const progress = getProgress(course.id);
  const lessonIndex = course.lessons.findIndex((l) => l.id === lesson.id);
  const hasPrev = lessonIndex > 0;
  const hasNext = lessonIndex < course.lessons.length - 1;
  const prevLesson = hasPrev ? course.lessons[lessonIndex - 1] : null;
  const nextLesson = hasNext ? course.lessons[lessonIndex + 1] : null;
  const savedScore = progress.quizScores[lesson.id];

  const isLessonCompleted = progress.completedLessons.includes(lesson.id);

  const passed = quizScore ? quizScore.percentage >= (quiz?.passingScore || 0) : false;

  return (
    <div className="bg-background px-4 pt-4 pb-6 sm:pb-8">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/instructor/courses/${course.slug}`)}
            className="-ml-3"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {course.title}
          </Button>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              Lección {lessonIndex + 1} de {course.lessons.length}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {lesson.duration}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {isLessonCompleted && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completada
            </Badge>
          )}
          {savedScore !== undefined && (
            <Badge
              className={
                (savedScore >= (quiz?.passingScore || 70)
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-red-100 text-red-700 border-red-200') +
                ' text-xs'
              }
            >
              <Trophy className="h-3 w-3 mr-1" />
              Quiz: {savedScore}%
            </Badge>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html: lesson.content
                  .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
                  .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
                  .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold mt-4 mb-1">$1</h4>')
                  .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm">$1</li>')
                  .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 text-sm"><span class="font-medium">$1.</span> $2</li>')
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n\n/g, '<br/><br/>')
                  .replace(/\|(.+)\|/g, (match) => {
                    if (match.includes('---')) return '';
                    const cells = match.split('|').filter(Boolean);
                    return `<div class="flex gap-4 text-sm">${cells
                      .map((c) => `<span class="flex-1">${c.trim()}</span>`)
                      .join('')}</div>`;
                  }),
              }}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" />
                Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {lesson.objectives.map((obj, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Puntos Clave
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {lesson.keyPoints.map((kp, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    {kp}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {quiz && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-indigo-600" />
                Evaluación ({quiz.questions.length} preguntas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!quizStarted ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Pon a prueba tus conocimientos. Necesitas{' '}
                    {quiz.passingScore}% para aprobar.
                  </p>
                  <Button onClick={handleStartQuiz}>
                    Iniciar Evaluación
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      Pregunta {currentQuestion + 1} de {quiz.questions.length}
                    </span>
                    {submitted && quizScore && (
                      <span
                        className={
                          passed ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'
                        }
                      >
                        {quizScore.correct}/{quizScore.total} correctas (
                        {quizScore.percentage}%)
                      </span>
                    )}
                  </div>

                  {!submitted && (
                    <Progress
                      value={((currentQuestion + 1) / quiz.questions.length) * 100}
                      className="h-1"
                    />
                  )}

                  <QuestionBlock
                    question={quiz.questions[currentQuestion]}
                    questionIndex={currentQuestion}
                    selectedAnswer={selectedAnswers[currentQuestion]}
                    isSubmitted={submitted}
                    onSelect={handleSelectAnswer}
                    showExplanation={showExplanation}
                  />

                  {!submitted && (
                    <div className="flex justify-between pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentQuestion === 0}
                        onClick={() =>
                          setCurrentQuestion((p) => Math.max(0, p - 1))
                        }
                      >
                        Anterior
                      </Button>
                      {currentQuestion < quiz.questions.length - 1 ? (
                        <Button
                          size="sm"
                          disabled={
                            selectedAnswers[currentQuestion] === undefined
                          }
                          onClick={() =>
                            setCurrentQuestion((p) =>
                              Math.min(quiz.questions.length - 1, p + 1)
                            )
                          }
                        >
                          Siguiente
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={
                            Object.keys(selectedAnswers).length <
                            quiz.questions.length
                          }
                          onClick={handleSubmitQuiz}
                        >
                          <Trophy className="h-4 w-4 mr-2" />
                          Finalizar Quiz
                        </Button>
                      )}
                    </div>
                  )}

                  {submitted && (
                    <div className="pt-4">
                      {passed ? (
                        <Alert className="bg-emerald-50 border-emerald-200">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <AlertDescription className="text-emerald-700">
                            Felicitaciones. Has aprobado la evaluación con{' '}
                            {quizScore?.percentage}%.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="bg-red-50 border-red-200">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700">
                            Obtuviste {quizScore?.percentage}%. Necesitas{' '}
                            {quiz.passingScore}% para aprobar. Repasa el
                            contenido e inténtalo de nuevo.
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="flex gap-2 mt-4">
                        {!passed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleStartQuiz}
                          >
                            Reintentar Quiz
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQuizStarted(false);
                            setSubmitted(false);
                          }}
                        >
                          Revisar Contenido
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!quiz && !isLessonCompleted && (
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <p className="text-sm text-muted-foreground">
                Marca esta lección como completada para continuar
              </p>
              <Button size="sm" onClick={handleCompleteWithoutQuiz}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar como Completada
              </Button>
            </CardContent>
          </Card>
        )}

        <Separator />

        <div className="flex justify-between">
          {prevLesson ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  `/instructor/courses/${course.slug}/lessons/${prevLesson.id}`
                )
              }
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {prevLesson.title}
            </Button>
          ) : (
            <div />
          )}
          {nextLesson ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  `/instructor/courses/${course.slug}/lessons/${nextLesson.id}`
                )
              }
            >
              {nextLesson.title}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
};

interface QuestionBlockProps {
  question: QuizQuestion;
  questionIndex: number;
  selectedAnswer: number | undefined;
  isSubmitted: boolean;
  onSelect: (questionIdx: number, answerIdx: number) => void;
  showExplanation: boolean;
}

const QuestionBlock: React.FC<QuestionBlockProps> = ({
  question,
  questionIndex,
  selectedAnswer,
  isSubmitted,
  onSelect,
  showExplanation,
}) => (
  <div className="space-y-3">
    <p className="text-sm font-medium">{question.question}</p>
    <div className="space-y-2">
      {question.options.map((option, oIdx) => {
        let variant: 'outline' | 'primary' | 'destructive' | 'secondary' =
          'outline';
        if (isSubmitted && oIdx === question.correctAnswer) {
          variant = 'primary';
        } else if (
          isSubmitted &&
          oIdx === selectedAnswer &&
          oIdx !== question.correctAnswer
        ) {
          variant = 'destructive';
        } else if (oIdx === selectedAnswer) {
          variant = 'secondary';
        }
        return (
          <Button
            key={oIdx}
            variant={variant}
            size="sm"
            className="w-full justify-start text-left h-auto py-3"
            onClick={() => onSelect(questionIndex, oIdx)}
          >
            <span className="font-medium mr-2">
              {String.fromCharCode(65 + oIdx)}.
            </span>
            {option}
            {isSubmitted && oIdx === question.correctAnswer && (
              <CheckCircle2 className="h-4 w-4 ml-auto text-emerald-600" />
            )}
            {isSubmitted &&
              oIdx === selectedAnswer &&
              oIdx !== question.correctAnswer && (
                <XCircle className="h-4 w-4 ml-auto text-red-600" />
              )}
          </Button>
        );
      })}
    </div>
    {showExplanation && question.explanation && (
      <Alert className="bg-blue-50 border-blue-200 mt-2">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700 text-sm">
          {question.explanation}
        </AlertDescription>
      </Alert>
    )}
  </div>
);

export default LessonPage;
