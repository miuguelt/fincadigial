import { ConflictResolver } from '../ConflictResolver';
import type { QueuedOperation } from './types';

/**
 * Aplica Last Write Wins sobre las operaciones que mutan el mismo recurso.
 *
 * Dos dispositivos sin cobertura pueden editar el mismo animal; al reconectar,
 * enviar ambas ediciones en orden de cola hacía que la más vieja sobrescribiera
 * a la más reciente. Sólo sobrevive la de mayor syncVersion, y el descarte
 * queda registrado en ConflictResolver para que el administrador lo audite.
 *
 * Los POST quedan fuera: crean recursos distintos aunque compartan URL.
 */
export function resolveQueueConflicts(operations: QueuedOperation[]): {
  survivors: QueuedOperation[];
  discarded: QueuedOperation[];
} {
  const byResource = new Map<string, QueuedOperation>();
  const survivors: QueuedOperation[] = [];
  const discarded: QueuedOperation[] = [];

  for (const op of operations) {
    if (op.method === 'POST') {
      survivors.push(op);
      continue;
    }

    const key = `${op.method}:${op.url}`;
    const existing = byResource.get(key);
    if (!existing) {
      byResource.set(key, op);
      continue;
    }

    const { winner, loser } = ConflictResolver.resolve(existing, op);
    byResource.set(key, winner);
    discarded.push(loser);
  }

  survivors.push(...byResource.values());
  // Conservar el orden de encolado original entre las supervivientes.
  survivors.sort((a, b) => operations.indexOf(a) - operations.indexOf(b));
  return { survivors, discarded };
}
