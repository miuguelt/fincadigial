import { QueuedOperation } from './offlineQueue';

export interface ConflictLog {
  id: string;
  resource: string;
  winner: QueuedOperation;
  loser: QueuedOperation;
  resolvedAt: number;
}

/**
 * ConflictResolver: Se encarga de decidir qué dato prevalece cuando
 * hay cambios divergentes en la red Mesh.
 */
export class ConflictResolver {
  private static STORAGE_KEY = 'villaruz_conflicts_log';

  /**
   * Resuelve un conflicto entre dos operaciones sobre el mismo recurso.
   * Estrategia: Last Write Wins (LWW) basada en syncVersion.
   */
  static resolve(opA: QueuedOperation, opB: QueuedOperation): { winner: QueuedOperation, loser: QueuedOperation } {
    const versionA = opA.syncVersion || 0;
    const versionB = opB.syncVersion || 0;

    const result = versionA >= versionB
      ? { winner: opA, loser: opB }
      : { winner: opB, loser: opA };

    this.logConflict(result.winner, result.loser);
    return result;
  }

  /**
   * Guarda el registro del conflicto resuelto para auditoría del administrador.
   */
  private static logConflict(winner: QueuedOperation, loser: QueuedOperation) {
    const logs = this.getLogs();
    const newLog: ConflictLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      resource: winner.url,
      winner,
      loser,
      resolvedAt: Date.now()
    };

    logs.unshift(newLog);
    // Mantener solo los últimos 50 conflictos
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs.slice(0, 50)));
  }

  static getLogs(): ConflictLog[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static clearLogs() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
