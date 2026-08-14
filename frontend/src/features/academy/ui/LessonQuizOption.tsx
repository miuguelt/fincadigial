import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/shared/ui/cn';

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong';

const stateClass: Record<OptionState, string> = {
  idle: 'border-border bg-card hover:border-primary/50 hover:bg-secondary/40',
  selected: 'border-primary bg-primary/10 ring-1 ring-primary/30',
  correct:
    'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-400/50 dark:bg-emerald-400/10 dark:text-emerald-100',
  wrong:
    'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-400/50 dark:bg-rose-400/10 dark:text-rose-100',
};

interface LessonQuizOptionProps {
  label: string;
  text: string;
  state: OptionState;
  disabled: boolean;
  onSelect: () => void;
}

export const LessonQuizOption: React.FC<LessonQuizOptionProps> = ({
  label,
  text,
  state,
  disabled,
  onSelect,
}) => (
  <button
    type="button"
    onClick={onSelect}
    disabled={disabled}
    aria-pressed={state === 'selected'}
    className={cn(
      'flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm shadow-sm transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:cursor-default',
      stateClass[state]
    )}
  >
    <span
      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-black/10 bg-background/60 text-xs font-bold dark:border-white/15"
      aria-hidden="true"
    >
      {label}
    </span>
    <span className="min-w-0 flex-1 break-words">{text}</span>
    {state === 'correct' && (
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
    )}
    {state === 'wrong' && (
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
    )}
  </button>
);

export type { OptionState };
export default LessonQuizOption;
