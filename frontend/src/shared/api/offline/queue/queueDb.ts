import type { QueuedOperation } from './types';

/**
 * Persistencia de la cola offline en IndexedDB (misma base que el cache HTTP,
 * store separado).
 */
const DB_NAME = 'VillaLuzQueue';
const DB_VERSION = 1;
const QUEUE_STORE = 'offlineQueue';

/**
 * Conexión única a la cola. Antes cada lectura o escritura abría una conexión
 * nueva y no la cerraba: en una sesión larga sin cobertura se acumulaban
 * cientos de conexiones vivas, y cualquier `deleteDatabase` o cambio de versión
 * del esquema quedaba bloqueado indefinidamente por ellas.
 */
let queueDbPromise: Promise<IDBDatabase> | null = null;

export function openQueueDB(): Promise<IDBDatabase> {
  if (queueDbPromise) return queueDbPromise;

  queueDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      // Si otra pestaña pide borrar o migrar la base, soltamos la conexión en
      // vez de bloquearla, y la siguiente operación la reabre.
      db.onversionchange = () => {
        db.close();
        queueDbPromise = null;
      };
      db.onclose = () => {
        queueDbPromise = null;
      };
      resolve(db);
    };
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  }).catch((error) => {
    queueDbPromise = null;
    throw error;
  });

  return queueDbPromise;
}

export async function dbGetAll(): Promise<QueuedOperation[]> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const req = tx.objectStore(QUEUE_STORE).getAll();
      req.onsuccess = () => resolve(req.result as QueuedOperation[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function dbPut(op: QueuedOperation): Promise<void> {
  try {
    const db = await openQueueDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const req = tx.objectStore(QUEUE_STORE).put(op);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch { /* noop */ }
}

export async function dbDelete(id: string): Promise<void> {
  try {
    const db = await openQueueDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const req = tx.objectStore(QUEUE_STORE).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch { /* noop */ }
}
