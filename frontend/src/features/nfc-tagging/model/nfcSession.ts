/**
 * Fila de marcaje: qué animal toca, qué se le pide al operario y qué pasó.
 *
 * Es un reductor puro y sin dependencias del navegador porque es la parte que
 * no se puede probar en el potrero: un salto de fila mal resuelto deja un
 * animal sin chapeta o dos animales con la misma.
 */

import type { NfcSessionState, NfcTagAnimal, NfcTarget, TagConflict } from './types';

export type NfcSessionAction =
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'tag-detected'; uid: string; holder?: { id: number; record: string } }
  | { type: 'write-succeeded'; uid: string; verifyAfterWrite: boolean }
  | { type: 'write-failed'; error: string }
  | { type: 'verified' }
  | { type: 'conflict-resolved' }
  | { type: 'skip' }
  | { type: 'select'; index: number }
  | { type: 'retry-failed' };

/**
 * Un animal sigue en la fila mientras no se haya grabado, omitido ni fallado.
 *
 * Un fallo lo saca de la fila automática a propósito: si una chapeta no graba, la
 * manga no se puede detener hasta que ese animal ceda. Queda para el botón de
 * reintento al cerrar la jornada.
 */
const isQueued = (target: NfcTarget) =>
  target.status === 'pending' || target.status === 'active';

const findNextIndex = (targets: NfcTarget[], from: number) => {
  const forward = targets.findIndex((target, index) => index > from && isQueued(target));
  if (forward !== -1) return forward;
  return targets.findIndex((target) => isQueued(target));
};

const describe = (animal?: NfcTagAnimal) => animal?.record ?? 'el animal';

const instructionFor = (state: NfcSessionState): string => {
  const animal = state.targets[state.activeIndex]?.animal;
  switch (state.phase) {
    case 'idle':
      return 'Toca «Iniciar marcaje» y ten las chapetas a la mano.';
    case 'waiting':
      return state.targets[state.activeIndex]?.status === 'failed'
        ? `Acerca otra vez la chapeta a ${describe(animal)}: la grabación anterior no entró.`
        : `Acerca la chapeta de ${describe(animal)} a la parte de atrás del celular.`;
    case 'writing':
      return `Grabando ${describe(animal)}. No retires la chapeta.`;
    case 'verifying':
      return `Retira la chapeta y vuelve a acercarla para comprobar ${describe(animal)}.`;
    case 'conflict':
      return `Esa chapeta ya es de ${state.conflict?.holderRecord ?? 'otro animal'}.`;
    case 'finished':
      return 'Jornada terminada. Todos los animales de la lista quedaron atendidos.';
    default:
      return '';
  }
};

/** Recalcula la instrucción visible después de cada transición. */
const withInstruction = (state: NfcSessionState): NfcSessionState => ({
  ...state,
  instruction: instructionFor(state),
});

const setStatus = (
  targets: NfcTarget[],
  index: number,
  patch: Partial<NfcTarget>
): NfcTarget[] => targets.map((target, i) => (i === index ? { ...target, ...patch } : target));

/** Activa el siguiente animal de la fila o cierra la jornada. */
const advance = (state: NfcSessionState, targets: NfcTarget[]): NfcSessionState => {
  const nextIndex = findNextIndex(targets, state.activeIndex);
  if (nextIndex === -1) {
    return withInstruction({
      ...state,
      targets,
      phase: 'finished',
      conflict: null,
    });
  }
  return withInstruction({
    ...state,
    targets: setStatus(targets, nextIndex, { status: 'active' }),
    activeIndex: nextIndex,
    phase: 'waiting',
    conflict: null,
  });
};

export const createSession = (animals: NfcTagAnimal[]): NfcSessionState =>
  withInstruction({
    targets: animals.map((animal) => ({ animal, status: 'pending' as const })),
    activeIndex: 0,
    phase: 'idle',
    conflict: null,
    instruction: '',
  });

export const nfcSessionReducer = (
  state: NfcSessionState,
  action: NfcSessionAction
): NfcSessionState => {
  const active = state.targets[state.activeIndex];

  switch (action.type) {
    case 'start': {
      const firstIndex = state.targets.findIndex(isQueued);
      if (firstIndex === -1) return withInstruction({ ...state, phase: 'finished' });
      return withInstruction({
        ...state,
        targets: setStatus(state.targets, firstIndex, { status: 'active', error: undefined }),
        activeIndex: firstIndex,
        phase: 'waiting',
        conflict: null,
      });
    }

    case 'stop':
      return withInstruction({ ...state, phase: 'idle', conflict: null });

    case 'tag-detected': {
      if (state.phase !== 'waiting') return state;
      // Una chapeta que ya trae la ficha de otro animal es el error más caro de
      // todos: si se sobreescribe sin avisar, dos animales pierden identidad.
      if (action.holder && action.holder.id !== active?.animal.id) {
        const conflict: TagConflict = {
          uid: action.uid,
          holderId: action.holder.id,
          holderRecord: action.holder.record,
        };
        return withInstruction({ ...state, phase: 'conflict', conflict });
      }
      return withInstruction({ ...state, phase: 'writing', conflict: null });
    }

    // Reasignar o descartar la chapeta terminan igual: el operario debe volver a
    // acercarla, porque para cuando decidió ya la había retirado del celular.
    case 'conflict-resolved':
      if (state.phase !== 'conflict') return state;
      return withInstruction({ ...state, phase: 'waiting', conflict: null });

    case 'write-succeeded': {
      const targets = setStatus(state.targets, state.activeIndex, {
        uid: action.uid,
        error: undefined,
      });
      if (action.verifyAfterWrite) {
        return withInstruction({ ...state, targets, phase: 'verifying' });
      }
      return advance(state, setStatus(targets, state.activeIndex, { status: 'written' }));
    }

    case 'verified': {
      if (state.phase !== 'verifying') return state;
      return advance(
        state,
        setStatus(state.targets, state.activeIndex, { status: 'written' })
      );
    }

    case 'write-failed':
      return withInstruction({
        ...state,
        targets: setStatus(state.targets, state.activeIndex, {
          status: 'failed',
          error: action.error,
        }),
        phase: 'waiting',
        conflict: null,
      });

    case 'skip': {
      // Saltar un animal que acaba de fallar no borra el fallo: se debe poder
      // reintentar al final sin volver a buscarlo en la lista.
      const status = active?.status === 'failed' ? 'failed' : 'skipped';
      return advance(state, setStatus(state.targets, state.activeIndex, { status }));
    }

    case 'select': {
      const target = state.targets[action.index];
      if (!target || target.status === 'written') return state;
      return withInstruction({
        ...state,
        targets: setStatus(state.targets, action.index, { status: 'active' }),
        activeIndex: action.index,
        phase: 'waiting',
        conflict: null,
      });
    }

    case 'retry-failed': {
      const targets = state.targets.map((target) =>
        target.status === 'failed' ? { ...target, status: 'pending' as const } : target
      );
      const firstIndex = targets.findIndex(isQueued);
      if (firstIndex === -1) return withInstruction({ ...state, targets, phase: 'finished' });
      return withInstruction({
        ...state,
        targets: setStatus(targets, firstIndex, { status: 'active' }),
        activeIndex: firstIndex,
        phase: 'waiting',
        conflict: null,
      });
    }

    default:
      return state;
  }
};

/** Resumen para la cabecera: cuántos van y cuántos faltan. */
export const summarize = (state: NfcSessionState) => ({
  total: state.targets.length,
  written: state.targets.filter((t) => t.status === 'written').length,
  failed: state.targets.filter((t) => t.status === 'failed').length,
  skipped: state.targets.filter((t) => t.status === 'skipped').length,
});
