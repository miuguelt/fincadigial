import React from 'react';
import { cn } from '@/shared/ui/cn';
import type { HelpStep } from '../model/helpSteps';

interface NfcHelpStepsProps {
  steps: HelpStep[];
  /** Los pasos se numeran; los tropiezos no llevan orden. */
  numbered?: boolean;
  tone?: 'emerald' | 'amber';
  className?: string;
}

const TONE = {
  emerald: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100',
  amber: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
} as const;

/**
 * Lista de instrucciones para el corral.
 *
 * Letra grande, un paso por renglón y el número en un círculo del tamaño de un
 * dedo: se lee de pie, con el celular en una mano y a pleno sol.
 */
export const NfcHelpSteps: React.FC<NfcHelpStepsProps> = ({
  steps,
  numbered = true,
  tone = 'emerald',
  className,
}) => (
  <ol className={cn('flex flex-col gap-4', className)}>
    {steps.map((step, index) => (
      <li key={step.title} className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base font-black',
            TONE[tone]
          )}
        >
          {numbered ? index + 1 : '!'}
        </span>
        <span className="min-w-0">
          <span className="block text-base font-bold leading-6 text-white">{step.title}</span>
          <span className="mt-1 block text-[15px] leading-6 text-indigo-100/75">
            {step.detail}
          </span>
        </span>
      </li>
    ))}
  </ol>
);
