import React from 'react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { FitText } from '@/shared/ui/FitText';

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface OptionToggleGroupProps<T extends string> {
  /** Texto del grupo, anunciado a lectores de pantalla. */
  legend: string;
  icon?: React.ElementType;
  options: ReadonlyArray<ToggleOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Color de acento del botón activo. */
  tone?: 'indigo' | 'emerald';
  hint?: string;
}

const ACTIVE_TONE = {
  indigo: 'bg-indigo-500 text-slate-950 border-indigo-500',
  emerald: 'bg-emerald-500 text-slate-950 border-emerald-500',
} as const;

/**
 * Grupo de opciones excluyentes en una fila de botones.
 *
 * Las etiquetas se ajustan al ancho disponible en vez de recortarse: en
 * pantallas de 320 px, «A4 / CARTA» reducido a «A…» no le dice nada a nadie.
 */
export function OptionToggleGroup<T extends string>({
  legend,
  icon: Icon,
  options,
  value,
  onChange,
  tone = 'indigo',
  hint,
}: OptionToggleGroupProps<T>) {
  return (
    <fieldset className="space-y-3">
      <legend className="flex items-center gap-3">
        {Icon && <Icon size={16} className="text-indigo-400/60" aria-hidden="true" />}
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-300/60">
          {legend}
        </span>
      </legend>

      <div className="flex gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={value === option.value ? 'secondary' : 'outline'}
            size="sm"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-11 min-w-0 flex-1 rounded-xl px-2 text-[11px] font-black uppercase tracking-widest',
              value === option.value
                ? ACTIVE_TONE[tone]
                : 'border-white/10 bg-card text-indigo-300/60 hover:text-white'
            )}
          >
            <FitText as="span" className="block w-full" maxLines={1}>
              {option.label}
            </FitText>
          </Button>
        ))}
      </div>

      {hint && <p className="text-xs leading-5 text-indigo-300/50">{hint}</p>}
    </fieldset>
  );
}
