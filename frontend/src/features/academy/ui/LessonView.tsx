import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { useLessonProgressState } from '../model/useLessonProgressState';
import { LessonHeader } from './LessonHeader';
import { LessonMarkdown } from './LessonMarkdown';
import { LessonHighlights } from './LessonHighlights';
import { LessonQuiz, CompleteLessonCard } from './LessonQuiz';
import { LessonNav } from './LessonNav';
import { surfaceCard } from './courseVisuals';
import type { Course, CourseLesson } from '../model/types';

interface LessonViewProps {
  course: Course;
  lesson: CourseLesson;
}

export const LessonView: React.FC<LessonViewProps> = ({ course, lesson }) => {
  const { progress, refresh, complete } = useLessonProgressState(course.id);
  const index = course.lessons.findIndex((item) => item.id === lesson.id);
  const isCompleted = progress.completedLessons.includes(lesson.id);
  const previous = index > 0 ? course.lessons[index - 1] : undefined;
  const next = index < course.lessons.length - 1 ? course.lessons[index + 1] : undefined;

  return (
    <div className="bg-background px-4 pt-4 pb-10 sm:pb-12">
      <div className="mx-auto w-full max-w-3xl space-y-5 sm:space-y-6">
        <LessonHeader
          course={course}
          lesson={lesson}
          lessonIndex={index}
          completedLessons={progress.completedLessons.length}
          isCompleted={isCompleted}
          savedScore={progress.quizScores[lesson.id]}
          passingScore={lesson.quiz?.passingScore ?? 70}
        />

        <Card hoverable={false} className={surfaceCard}>
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <LessonMarkdown content={lesson.content} />
          </CardContent>
        </Card>

        <LessonHighlights objectives={lesson.objectives} keyPoints={lesson.keyPoints} />

        {lesson.quiz && (
          <LessonQuiz
            quiz={lesson.quiz}
            courseId={course.id}
            lessonId={lesson.id}
            onProgressChange={refresh}
          />
        )}

        {!lesson.quiz && !isCompleted && (
          <CompleteLessonCard onComplete={() => complete(lesson.id)} />
        )}

        <LessonNav courseSlug={course.slug} previous={previous} next={next} />
      </div>
    </div>
  );
};

export default LessonView;
