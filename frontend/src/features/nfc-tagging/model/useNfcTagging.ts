/**
 * Jornada de marcaje: une el lector del celular, la fila de animales y el
 * registro en el servidor.
 *
 * El operario solo debería tener que acercar el arete. Todo lo demás —leer el
 * serial, decidir si el arete está libre, grabar, comprobar, avisar y avanzar
 * al siguiente animal— pasa sin que tenga que tocar la pantalla.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { nfcBindingService, TagConflictError } from '../api/nfcBinding.service';
import { notifyField, primeFieldFeedback } from './fieldFeedback';
import { buildTagRecords, estimateNdefBytes, fitsInTag } from './ndefPayload';
import { NfcReader, type DetectedTag } from './nfcReader';
import { createSession, nfcSessionReducer, summarize } from './nfcSession';
import { detectNfcSupport } from './nfcSupport';
import { DEFAULT_NFC_SETTINGS, type NfcTagAnimal, type NfcTagSettings } from './types';

interface UseNfcTaggingParams {
  animals: NfcTagAnimal[];
  settings?: NfcTagSettings;
}

export const useNfcTagging = ({
  animals,
  settings = DEFAULT_NFC_SETTINGS,
}: UseNfcTaggingParams) => {
  const [state, dispatch] = useReducer(nfcSessionReducer, animals, createSession);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(0);

  const support = useMemo(() => detectNfcSupport(), []);
  const readerRef = useRef(new NfcReader());
  /** Arete que el operario autorizó a reasignar pese a pertenecer a otro animal. */
  const authorizedUidRef = useRef<string | null>(null);
  /** El manejador del lector vive fuera de React; necesita el estado más reciente. */
  const stateRef = useRef(state);
  const settingsRef = useRef(settings);
  stateRef.current = state;
  settingsRef.current = settings;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const activeTarget = state.targets[state.activeIndex];
  const progress = useMemo(() => summarize(state), [state]);

  /** Bytes que ocupará el arete del animal activo, para avisar antes de grabar. */
  const payloadBytes = useMemo(() => {
    if (!activeTarget) return 0;
    return estimateNdefBytes(
      buildTagRecords(activeTarget.animal, {
        origin,
        includeSnapshot: settings.includeSnapshot,
      })
    );
  }, [activeTarget, origin, settings.includeSnapshot]);

  const capacityWarning = useMemo(() => {
    if (!payloadBytes || fitsInTag(payloadBytes, settings.tagType)) return null;
    return `El contenido ocupa ${payloadBytes} bytes y no cabe en un ${settings.tagType}. Apaga la ficha sin señal o usa aretes de mayor capacidad.`;
  }, [payloadBytes, settings.tagType]);

  /** Registra el vínculo. Si no hay señal queda encolado y se avisa como tal. */
  const persistBinding = useCallback(async (animalId: number, uid: string, force: boolean) => {
    try {
      const result = await nfcBindingService.bind({ animalId, nfcUid: uid, force });
      if (!result.persisted) setPendingSync((count) => count + 1);
    } catch (bindError) {
      if (bindError instanceof TagConflictError) {
        setError(
          `${bindError.message}. El arete quedó grabado, pero el registro no se guardó: confirma la reasignación.`
        );
        return;
      }
      setError((bindError as Error).message);
    }
  }, []);

  const finishTag = useCallback(
    async (uid: string, animalId: number, animalRecord: string) => {
      if (settingsRef.current.lockAfterWrite) {
        try {
          await readerRef.current.lock();
        } catch (lockError) {
          // El bloqueo es una protección extra: si falla, el arete ya quedó
          // grabado y la jornada no se debe detener por eso.
          setError((lockError as Error).message);
        }
      }
      notifyField('ok', {
        say: `${animalRecord} listo`,
        voiceEnabled: settingsRef.current.voiceFeedback,
      });
      await persistBinding(animalId, uid, authorizedUidRef.current === uid);
      authorizedUidRef.current = null;
    },
    [persistBinding]
  );

  /** Comprueba que lo leído en el segundo contacto sea de este animal. */
  const verifyTag = useCallback(
    async (tag: DetectedTag) => {
      const target = stateRef.current.targets[stateRef.current.activeIndex];
      if (!target) return;

      const matchesSnapshot = tag.snapshot?.id === target.animal.id;
      const matchesUid = target.uid === tag.uid;
      const isValid = settingsRef.current.includeSnapshot
        ? matchesSnapshot && matchesUid
        : matchesUid && tag.hasContent;

      if (!isValid) {
        notifyField('error', {
          say: 'No quedó grabado',
          voiceEnabled: settingsRef.current.voiceFeedback,
        });
        dispatch({
          type: 'write-failed',
          error: 'La comprobación falló: el arete no quedó con los datos de este animal.',
        });
        return;
      }

      dispatch({ type: 'verified' });
      await finishTag(tag.uid, target.animal.id, target.animal.record);
    },
    [finishTag]
  );

  /** Graba el arete que está pegado al celular en este instante. */
  const writeTag = useCallback(async (tag: DetectedTag) => {
    const target = stateRef.current.targets[stateRef.current.activeIndex];
    if (!target) return;

    try {
      await readerRef.current.write(
        buildTagRecords(target.animal, {
          origin: window.location.origin,
          includeSnapshot: settingsRef.current.includeSnapshot,
        })
      );
    } catch (writeError) {
      notifyField('error', {
        say: 'No entró',
        voiceEnabled: settingsRef.current.voiceFeedback,
      });
      dispatch({ type: 'write-failed', error: (writeError as Error).message });
      return;
    }

    const verify = settingsRef.current.verifyAfterWrite;
    dispatch({ type: 'write-succeeded', uid: tag.uid, verifyAfterWrite: verify });

    if (verify) {
      notifyField('attention', {
        say: 'Retira y vuelve a acercar',
        voiceEnabled: settingsRef.current.voiceFeedback,
      });
      return;
    }
    await finishTag(tag.uid, target.animal.id, target.animal.record);
  }, [finishTag]);

  const handleTag = useCallback(
    async (tag: DetectedTag) => {
      setError(null);
      const current = stateRef.current;
      const target = current.targets[current.activeIndex];
      if (!target) return;

      if (current.phase === 'verifying') {
        await verifyTag(tag);
        return;
      }
      if (current.phase !== 'waiting') return;

      // Quién es el dueño del arete: primero lo que trae escrito el propio
      // chip, que funciona sin señal; el servidor solo se consulta si el arete
      // viene en blanco y hay conexión.
      let holder = tag.snapshot
        ? { id: tag.snapshot.id, record: tag.snapshot.record }
        : null;
      if (!holder && tag.hasContent && navigator.onLine) {
        holder = await nfcBindingService.lookup({ nfcUid: tag.uid });
      }

      const isForeign = holder && holder.id !== target.animal.id;
      if (isForeign && authorizedUidRef.current !== tag.uid) {
        notifyField('attention', {
          say: 'Arete ocupado',
          voiceEnabled: settingsRef.current.voiceFeedback,
        });
        dispatch({ type: 'tag-detected', uid: tag.uid, holder: holder ?? undefined });
        return;
      }

      dispatch({ type: 'tag-detected', uid: tag.uid });
      await writeTag(tag);
    },
    [verifyTag, writeTag]
  );

  const start = useCallback(async () => {
    setError(null);
    primeFieldFeedback();
    try {
      await readerRef.current.start(
        (tag) => void handleTag(tag),
        (message) => setError(message)
      );
      dispatch({ type: 'start' });
    } catch (startError) {
      setError((startError as Error).message);
    }
  }, [handleTag]);

  const stop = useCallback(() => {
    readerRef.current.stop();
    dispatch({ type: 'stop' });
  }, []);

  /** El lector queda abierto hasta que se cierra el panel; sin esto sigue vivo. */
  useEffect(() => {
    const reader = readerRef.current;
    return () => reader.stop();
  }, []);

  const resolveConflict = useCallback((reassign: boolean) => {
    authorizedUidRef.current = reassign ? stateRef.current.conflict?.uid ?? null : null;
    dispatch({ type: 'conflict-resolved' });
  }, []);

  return {
    state,
    progress,
    support,
    error,
    pendingSync,
    payloadBytes,
    capacityWarning,
    start,
    stop,
    skip: () => dispatch({ type: 'skip' }),
    select: (index: number) => dispatch({ type: 'select', index }),
    retryFailed: () => dispatch({ type: 'retry-failed' }),
    resolveConflict,
    dismissError: () => setError(null),
  };
};
