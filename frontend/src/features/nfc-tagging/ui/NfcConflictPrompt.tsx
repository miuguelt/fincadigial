import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { TagConflict } from '../model/types';

interface NfcConflictPromptProps {
  conflict: TagConflict;
  /** Registro del animal que está en turno. */
  currentRecord: string;
  onResolve: (reassign: boolean) => void;
}

/**
 * Decisión ante un arete que ya pertenece a otro animal.
 *
 * Es la única pausa obligatoria de la jornada. Reasignar sin darse cuenta deja
 * a dos animales compartiendo identidad, y eso solo se descubre meses después,
 * cuando ya no se sabe cuál historia clínica es de cuál.
 */
export const NfcConflictPrompt: React.FC<NfcConflictPromptProps> = ({
  conflict,
  currentRecord,
  onResolve,
}) => (
  <div
    role="alertdialog"
    aria-labelledby="nfc-conflict-title"
    className="rounded-3xl border border-amber-400/40 bg-amber-500/10 p-5 sm:p-6"
  >
    <div className="flex items-start gap-4">
      <ShieldAlert className="mt-1 h-7 w-7 shrink-0 text-amber-300" aria-hidden="true" />
      <div className="min-w-0 space-y-2">
        <h4 id="nfc-conflict-title" className="text-lg font-bold text-white">
          Ese arete ya tiene dueño
        </h4>
        <p className="text-base leading-6 text-amber-50/90">
          El arete <span className="font-mono text-sm">{conflict.uid}</span> está asignado a{' '}
          <strong className="font-bold">{conflict.holderRecord || 'otro animal'}</strong>. Si lo
          reasignas, ese animal queda sin identificación electrónica.
        </p>
      </div>
    </div>

    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
      <Button
        onClick={() => onResolve(false)}
        className="h-14 flex-1 rounded-2xl bg-white text-base font-bold text-slate-950 hover:bg-white/90"
      >
        Usar otro arete
      </Button>
      <Button
        variant="outline"
        onClick={() => onResolve(true)}
        className="h-14 flex-1 rounded-2xl border-amber-300/60 bg-transparent text-base font-bold text-amber-100 hover:bg-amber-500/20"
      >
        Pasarlo a {currentRecord}
      </Button>
    </div>
  </div>
);
