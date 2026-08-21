import React from 'react';
import { CheckCircle2, CircleDot, MinusCircle, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { FitText } from '@/shared/ui/FitText';
import type { NfcTarget, TargetStatus } from '../model/types';

const STATUS_STYLE: Record<TargetStatus, { icon: React.ElementType; className: string; label: string }> = {
  pending: { icon: CircleDot, className: 'text-indigo-300/50', label: 'Pendiente' },
  active: { icon: RefreshCw, className: 'text-emerald-300', label: 'En turno' },
  written: { icon: CheckCircle2, className: 'text-emerald-400', label: 'Grabado' },
  failed: { icon: XCircle, className: 'text-red-400', label: 'Falló' },
  skipped: { icon: MinusCircle, className: 'text-amber-300', label: 'Omitido' },
};

interface NfcTargetListProps {
  targets: NfcTarget[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Fila de animales de la jornada.
 *
 * Se puede tocar un animal para adelantarlo: en la manga no siempre entran en
 * el orden de la lista, y obligar a seguirlo haría que el operario tuviera que
 * omitir media docena de animales para llegar al que tiene enfrente.
 */
export const NfcTargetList: React.FC<NfcTargetListProps> = ({
  targets,
  activeIndex,
  onSelect,
}) => (
  <ul className="flex flex-col gap-2" aria-label="Animales de la jornada">
    {targets.map((target, index) => {
      const style = STATUS_STYLE[target.status];
      const Icon = style.icon;
      const isActive = index === activeIndex;
      const isDone = target.status === 'written';

      return (
        <li key={target.animal.id}>
          <button
            type="button"
            onClick={() => onSelect(index)}
            disabled={isDone}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
              'min-h-[3.25rem] disabled:cursor-default',
              isActive
                ? 'border-emerald-400/50 bg-emerald-500/10'
                : 'border-white/10 bg-white/[0.03] hover:border-white/25'
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0', style.className)} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <FitText
                as="span"
                className="block text-base font-semibold text-white"
                maxLines={1}
              >
                {target.animal.record}
              </FitText>
              {target.error && (
                <span className="block text-xs leading-5 text-red-300/80">{target.error}</span>
              )}
              {target.uid && !target.error && (
                <FitText
                  as="span"
                  className="block font-mono text-[11px] text-indigo-300/50"
                  maxLines={1}
                >
                  {target.uid}
                </FitText>
              )}
            </span>
            <span className={cn('shrink-0 text-xs font-bold uppercase tracking-wider', style.className)}>
              {style.label}
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);
