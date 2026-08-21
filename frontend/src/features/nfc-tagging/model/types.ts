import type { NfcTagAnimal, NfcTagType } from './ndefPayload';

export type { NfcTagAnimal, NfcTagType };

/** Estado de cada animal dentro de una jornada de marcaje. */
export type TargetStatus = 'pending' | 'active' | 'written' | 'failed' | 'skipped';

/** Etapa de la sesión. El operario ve una sola instrucción a la vez. */
export type SessionPhase =
  | 'idle'
  | 'waiting'
  | 'writing'
  | 'verifying'
  | 'conflict'
  | 'finished';

export interface NfcTarget {
  animal: NfcTagAnimal;
  status: TargetStatus;
  /** Serial del arete que quedó asignado. */
  uid?: string;
  error?: string;
}

/** Arete que ya venía grabado con otro animal. */
export interface TagConflict {
  uid: string;
  holderRecord?: string;
  holderId?: number;
}

export interface NfcSessionState {
  targets: NfcTarget[];
  activeIndex: number;
  phase: SessionPhase;
  conflict: TagConflict | null;
  /** Instrucción corta para el operario, legible bajo el sol y con guantes. */
  instruction: string;
}

export interface NfcTagSettings {
  /** Graba la ficha compacta además del enlace. */
  includeSnapshot: boolean;
  /** Relee el arete después de grabar para confirmar que quedó bien. */
  verifyAfterWrite: boolean;
  /** Bloquea el arete de forma permanente e irreversible. */
  lockAfterWrite: boolean;
  /** Chip del arete, para avisar antes si el contenido no cabe. */
  tagType: NfcTagType;
  /** Anuncia por voz el resultado, para no tener que mirar la pantalla. */
  voiceFeedback: boolean;
}

export const DEFAULT_NFC_SETTINGS: NfcTagSettings = {
  includeSnapshot: true,
  verifyAfterWrite: true,
  lockAfterWrite: false,
  tagType: 'NTAG213',
  voiceFeedback: true,
};
