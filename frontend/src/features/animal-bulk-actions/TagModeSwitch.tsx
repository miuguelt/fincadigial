import React from 'react';
import { cn } from '@/shared/ui/cn';
import { FitText } from '@/shared/ui/FitText';
import { TAG_MODES, type TagMode } from './tagModes';

interface TagModeSwitchProps {
  mode: TagMode;
  onChange: (mode: TagMode) => void;
}

/**
 * Selector entre etiqueta impresa, chapeta NFC y transpondedor.
 *
 * Va arriba de todo porque cambia por completo lo que el panel hace: no es un
 * ajuste, es elegir con qué se va a identificar el animal.
 */
export const TagModeSwitch: React.FC<TagModeSwitchProps> = ({ mode, onChange }) => (
  <div
    role="tablist"
    aria-label="Forma de identificación"
    className="grid grid-cols-1 gap-2 sm:grid-cols-3"
  >
    {TAG_MODES.map((spec) => {
      const Icon = spec.icon;
      const isActive = spec.value === mode;
      return (
        <button
          key={spec.value}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(spec.value)}
          className={cn(
            'flex min-h-[3.5rem] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
            isActive
              ? 'border-emerald-400/60 bg-emerald-500/15'
              : 'border-white/10 bg-white/[0.03] hover:border-white/25'
          )}
        >
          <Icon
            className={cn('h-5 w-5 shrink-0', isActive ? 'text-emerald-300' : 'text-indigo-300/60')}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <FitText as="span" className="block text-sm font-bold text-white" maxLines={1}>
              {spec.label}
            </FitText>
            <span className="mt-0.5 block text-xs leading-4 text-indigo-200/55">
              {spec.description}
            </span>
          </span>
        </button>
      );
    })}
  </div>
);
