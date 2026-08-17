/**
 * FieldReadyService — "Modo Campo"
 * =================================
 * Descarga y almacena en IndexedDB todos los datos críticos que el
 * operario necesita para trabajar sin señal en el potrero.
 *
 * Estrategia:
 *  1. Cuando hay WiFi, pre-carga animales, potreros, catálogos y recomendaciones.
 *  2. Los datos se guardan en un store IndexedDB propio ('field-ready-data').
 *  3. El Service Worker intercepta las peticiones GET con NetworkFirst, por lo
 *     que si no hay red, el browser ya sirve desde su caché Workbox.
 *     Este servicio complementa eso con datos estructurados para formularios.
 *  4. Ttl por defecto: 8 horas (una jornada de trabajo).
 */

import { openDB, IDBPDatabase } from 'idb';
import { api } from '@/shared/api/base-client';

const DB_NAME   = 'VillaLuzFieldReady';
const DB_VER    = 1;
const STORE     = 'field_data';
const TTL_MS    = 8 * 60 * 60 * 1000; // 8 horas

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface FieldDataEntry {
  key: string;           // Ej: 'animals', 'fields', 'recommendations_42'
  data: any;
  cachedAt: number;      // Timestamp UTC
  expiresAt: number;
}

export interface FieldReadyStatus {
  isReady: boolean;
  cachedAt: number | null;  // Epoch ms de la última descarga completa
  itemsCached: number;
  pendingSync: number;      // Operaciones offline pendientes de enviar
}

export interface PrefetchProgress {
  step: string;
  current: number;
  total: number;
  done: boolean;
  error?: string;
}

type ProgressCallback = (p: PrefetchProgress) => void;

// ─── DB ──────────────────────────────────────────────────────────────────────

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VER, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'key' });
        s.createIndex('expiresAt', 'expiresAt');
      }
    },
  });
}

async function dbSet(key: string, data: any): Promise<void> {
  const db = await getDB();
  const entry: FieldDataEntry = {
    key,
    data,
    cachedAt: Date.now(),
    expiresAt: Date.now() + TTL_MS,
  };
  await db.put(STORE, entry);
}

async function dbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const entry = await db.get(STORE, key) as FieldDataEntry | undefined;
    if (!entry) return null;

    // Si estamos sin conexión (offline), permitimos usar datos expirados
    // para que la app no deje de funcionar en periodos largos sin internet.
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (!isOffline && Date.now() > entry.expiresAt) return null; // Expirado

    return entry.data as T;
  } catch {
    return null;
  }
}

async function dbGetAll(): Promise<FieldDataEntry[]> {
  try {
    const db = await getDB();
    return (await db.getAll(STORE)) as FieldDataEntry[];
  } catch {
    return [];
  }
}

async function dbClear(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE);
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchPage(endpoint: string, params: Record<string, any> = {}): Promise<any[]> {
  try {
    const res = await api.get(endpoint, { params: { page: 1, limit: 500, ...params } });
    const body = res.data;
    return body?.data || body?.items || body?.results || (Array.isArray(body) ? body : []);
  } catch {
    return [];
  }
}

// ─── Servicio principal ───────────────────────────────────────────────────────

export class FieldReadyService {
  /**
   * Precarga todos los datos necesarios para trabajar offline.
   * Llama al callback `onProgress` en cada paso para actualizar la UI.
   */
  static async prefetch(onProgress?: ProgressCallback): Promise<boolean> {
    const steps = [
      { key: 'animals',         label: 'Animales',         fn: () => fetchPage('/animals') },
      { key: 'fields',          label: 'Potreros',         fn: () => fetchPage('/fields') },
      { key: 'species',         label: 'Especies',         fn: () => fetchPage('/species') },
      { key: 'breeds',          label: 'Razas',            fn: () => fetchPage('/breeds') },
      { key: 'diseases',        label: 'Enfermedades',     fn: () => fetchPage('/diseases') },
      { key: 'vaccines',        label: 'Vacunas',          fn: () => fetchPage('/vaccines') },
      { key: 'medications',     label: 'Medicamentos',     fn: () => fetchPage('/medications') },
      { key: 'route_admin',     label: 'Vías de Admin.',   fn: () => fetchPage('/route-administrations') },
      { key: 'kb_calendario',   label: 'Cal. Sanitario',   fn: () => fetchPage('/knowledge_base/calendario/animal/0').catch(() => []) },
    ];

    const total = steps.length;
    let hasError = false;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      onProgress?.({ step: step.label, current: i, total, done: false });
      try {
        const data = await step.fn();
        await dbSet(step.key, data);
      } catch (err: any) {
        console.warn(`[FieldReady] Error cacheando ${step.key}:`, err.message);
        hasError = true;
      }
    }

    // Marca la sesión de campo como lista
    await dbSet('__field_ready_meta', {
      completedAt: Date.now(),
      hasError,
    });

    onProgress?.({ step: 'Listo', current: total, total, done: true });
    return !hasError;
  }

  /** Obtiene un recurso del caché de campo (sin red) */
  static async getOffline<T = any>(key: string): Promise<T | null> {
    return dbGet<T>(key);
  }

  /** Estado general del modo campo */
  static async getStatus(): Promise<FieldReadyStatus> {
    const meta = await dbGet<{ completedAt: number; hasError: boolean }>('__field_ready_meta');
    const all  = await dbGetAll();
    // Excluir la meta entry del conteo
    // Durante una jornada sin señal los catálogos vencidos siguen siendo la
    // mejor fuente disponible; no se deben ocultar sólo por TTL.
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const dataEntries = all.filter(e =>
      e.key !== '__field_ready_meta' && (isOffline || Date.now() < e.expiresAt),
    );

    return {
      isReady:     !!meta && (isOffline || Date.now() < (meta.completedAt + TTL_MS)),
      cachedAt:    meta?.completedAt ?? null,
      itemsCached: dataEntries.length,
      pendingSync: 0, // Se llena desde el hook que lee offlineQueue
    };
  }

  /** Limpia el caché de campo (al volver a oficina / fin de jornada) */
  static async clear(): Promise<void> {
    await dbClear();
  }

  /** Devuelve lista de animales cacheados */
  static async getAnimals(): Promise<any[]> {
    return (await dbGet<any[]>('animals')) || [];
  }

  /** Devuelve lista de potreros cacheados */
  static async getFields(): Promise<any[]> {
    return (await dbGet<any[]>('fields')) || [];
  }

  /** Devuelve cualquier catálogo cacheado */
  static async getCatalog(key: string): Promise<any[]> {
    return (await dbGet<any[]>(key)) || [];
  }
}
