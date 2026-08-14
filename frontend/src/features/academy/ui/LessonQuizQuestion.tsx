import React from 'react';
import { Lightbulb } from 'lucide-react';
import { LessonQuizOption, type OptionState } from './LessonQuizOption';
import type { QuizQuestion } from '../model/types';

const resolveState = (
  optionIndex: number,
  question: QuizQuestion,
  selected: number | undefined,
  submitted: boolean
): OptionState => {
  if (submitted && optionIndex === question.correctAnswer) return 'correct';
  if (submitted && optionIndex === selected) return 'wrong';
  if (!submitted && optionIndex === selected) return 'selected';
  return 'idle';
};

interface LessonQuizQuestionProps {
  question: QuizQuestion;
  questionIndex: number;
  selected: number | undefined;
  submitted: boolean;
  onSelect: (questionIndex: number, optionIndex: number) => void;
}

export const LessonQuizQuestion: React.FC<LessonQuizQuestionProps> = ({
  question,
  questionIndex,
  selected,
  submitted,
  onSelect,
}) => (
  <div className="space-y-3">
    <p className="text-sm font-semibold text-foreground break-words">{question.question}</p>
    <div className="space-y-2">
      {question.options.map((option, optionIndex) => (
        <LessonQuizOption
          key={optionIndex}
          label={String.fromCharCode(65 + optionIndex)}
          text={option}
          state={resolveState(optionIndex, question, selected, submitted)}
          disabled={submitted}
          onSelect={() => onSelect(questionIndex, optionIndex)}
        />
      ))}
    </div>
    {submitted && question.explanation && (
      <div className="flex gap-2 rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-foreground">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
        <p className="min-w-0 break-words">{question.explanation}</p>
      </div>
    )}
  </div>
);

export default LessonQuizQuestion;
