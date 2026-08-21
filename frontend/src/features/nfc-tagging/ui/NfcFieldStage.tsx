import React from 'react';
import { CheckCircle2, Nfc, Radio, TriangleAlert } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { FitText } from '@/shared/ui/FitText';
import type { NfcSessionState, SessionPhase } from '../model/types';

const PHASE_TONE: Record<SessionPhase, string> = {
  idle: 'border-white/15 bg-white/[0.03]',
  waiting: 'border-emerald-400/40 bg-emerald-500/10',
  writing: 'border-indigo-400/50 bg-indigo-500/15',
  verifying: 'border-amber-400/50 bg-amber-500/10',
  conflict: 'border-amber-400/50 bg-amber-500/10',
  finished: 'border-emerald-400/40 bg-emerald-500/10',
};

const PHASE_ICON: Record<SessionPhase, React.ElementType> = {
  idle: Nfc,
  waiting: Nfc,
  writing: Radio,
  verifying: Radio,
  conflict: TriangleAlert,
  finished: CheckCircle2,
};

interface NfcFieldStageProps {
  state: NfcSessionState;
  progress: { total: number; written: number; failed: number; skipped: number };
}

/**
 * Lo único que el operario necesita mirar.
 *
 * A pleno sol, con el celular a la altura de la oreja del animal, solo se
 * alcanza a ver una cosa: el nombre del animal en turno y qué hacer con él.
 * Todo lo demás va debajo.
 */
export const NfcFieldStage: React.FC<NfcFieldStageProps> = ({ state, progress }) => {
  const active = state.targets[state.activeIndex];
  const Icon = PHASE_ICON[state.phase];
  const isListening = state.phase === 'waiting' || state.phase === 'verifying';

  return (
    <section
      className={cn(
        // La consulta de contenedor deja que el nombre del animal se mida contra
        // esta caja y no contra el ancho de la pantalla.
        'rounded-3xl border p-5 text-center transition-colors [container-type:inline-size] sm:p-8',
        PHASE_TONE[state.phase]
      )}
      aria-live="polite"
    >
      <div className="flex items-center justify-center">
        <span
          className={cn(
            'flex h-20 w-20 items-center justify-center rounded-full border-2 sm:h-24 sm:w-24',
            isListening
              ? 'animate-pulse border-emerald-300/70 bg-emerald-400/20'
              : 'border-white/20 bg-white/5'
          )}
        >
          <Icon className="h-10 w-10 text-white sm:h-12 sm:w-12" aria-hidden="true" />
        </span>
      </div>

      {state.phase !== 'finished' && active && (
        <FitText
          as="p"
          className="mt-5 text-[clamp(1.75rem,9cqi,3rem)] font-black uppercase leading-none tracking-tight text-white"
          maxLines={1}
        >
          {active.animal.record}
        </FitText>
      )}

      <p className="mx-auto mt-4 max-w-md text-balance text-lg leading-7 text-white/85 sm:text-xl">
        {state.instruction}
      </p>

      <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-white/60">
        {progress.written} de {progress.total} grabados
        {progress.failed > 0 && ` · ${progress.failed} con falla`}
        {progress.skipped > 0 && ` · ${progress.skipped} omitidos`}
      </p>
    </section>
  );
};
