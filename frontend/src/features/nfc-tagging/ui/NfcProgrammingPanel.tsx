import React from 'react';
import { CloudOff, Play, RotateCcw, Square, SkipForward, TriangleAlert } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { useNfcTagging } from '../model/useNfcTagging';
import { TAG_CAPACITIES } from '../model/ndefPayload';
import type { NfcTagAnimal, NfcTagSettings } from '../model/types';
import { NfcConflictPrompt } from './NfcConflictPrompt';
import { NfcFieldStage } from './NfcFieldStage';
import { NfcSupportNotice } from './NfcSupportNotice';
import { NfcTargetList } from './NfcTargetList';
import { NfcUsageHelp } from './NfcUsageHelp';

interface NfcProgrammingPanelProps {
  animals: NfcTagAnimal[];
  settings: NfcTagSettings;
  onFinished?: (writtenCount: number) => void;
}

/**
 * Panel de marcaje de aretes NFC.
 *
 * Está pensado para usarse de pie en el corral: una sola instrucción visible,
 * botones que se aciertan con guante y ninguna acción que dependa de leer
 * texto pequeño.
 */
export const NfcProgrammingPanel: React.FC<NfcProgrammingPanelProps> = ({
  animals,
  settings,
  onFinished,
}) => {
  const session = useNfcTagging({ animals, settings });
  const { state, progress, support } = session;

  const finishedRef = React.useRef(false);
  React.useEffect(() => {
    if (state.phase === 'finished' && !finishedRef.current) {
      finishedRef.current = true;
      onFinished?.(progress.written);
    }
    if (state.phase !== 'finished') finishedRef.current = false;
  }, [state.phase, progress.written, onFinished]);

  if (!support.canWrite) return <NfcSupportNotice support={support} />;

  const isRunning = state.phase !== 'idle' && state.phase !== 'finished';
  const activeRecord = state.targets[state.activeIndex]?.animal.record ?? '';

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:gap-5 sm:p-6">
      <NfcFieldStage state={state} progress={progress} />

      {session.payloadBytes > 0 && (
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-indigo-300/45">
          Contenido del arete: {session.payloadBytes} de {TAG_CAPACITIES[settings.tagType]} bytes
        </p>
      )}

      {state.conflict && (
        <NfcConflictPrompt
          conflict={state.conflict}
          currentRecord={activeRecord}
          onResolve={session.resolveConflict}
        />
      )}

      {session.capacityWarning && (
        <p className="flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-50">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          {session.capacityWarning}
        </p>
      )}

      {session.error && (
        <button
          type="button"
          onClick={session.dismissError}
          className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-left text-sm leading-6 text-red-50"
        >
          {session.error}
          <span className="mt-1 block text-xs uppercase tracking-widest text-red-200/70">
            Toca para ocultar
          </span>
        </button>
      )}

      {session.pendingSync > 0 && (
        <p className="flex items-start gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-sm leading-6 text-indigo-50">
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" aria-hidden="true" />
          {session.pendingSync} vinculación(es) esperando señal. Los aretes ya quedaron grabados;
          el registro se envía solo al recuperar conexión.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {!isRunning ? (
          <Button
            onClick={() => void session.start()}
            className="h-16 flex-1 gap-3 rounded-2xl bg-emerald-500 text-lg font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400"
          >
            <Play className="h-6 w-6" aria-hidden="true" />
            {state.phase === 'finished' ? 'Marcar de nuevo' : 'Iniciar marcaje'}
          </Button>
        ) : (
          <>
            <Button
              onClick={session.skip}
              variant="outline"
              className="h-16 flex-1 gap-3 rounded-2xl border-white/20 bg-transparent text-base font-bold text-white hover:bg-white/10"
            >
              <SkipForward className="h-5 w-5" aria-hidden="true" />
              Saltar este animal
            </Button>
            <Button
              onClick={session.stop}
              variant="outline"
              className="h-16 gap-3 rounded-2xl border-white/20 bg-transparent px-8 text-base font-bold text-white hover:bg-white/10"
            >
              <Square className="h-5 w-5" aria-hidden="true" />
              Pausar
            </Button>
          </>
        )}

        {progress.failed > 0 && (
          <Button
            onClick={session.retryFailed}
            variant="outline"
            className="h-16 gap-3 rounded-2xl border-amber-400/50 bg-transparent px-8 text-base font-bold text-amber-100 hover:bg-amber-500/15"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            Reintentar {progress.failed}
          </Button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4">
          {/* Abierta mientras nadie haya grabado todavía: es cuando se necesita. */}
          <NfcUsageHelp defaultOpen={progress.written === 0 && state.phase === 'idle'} />
          <NfcTargetList
            targets={state.targets}
            activeIndex={state.activeIndex}
            onSelect={session.select}
          />
        </div>
      </ScrollArea>
    </div>
  );
};
