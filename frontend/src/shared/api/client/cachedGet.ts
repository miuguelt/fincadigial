import { AxiosResponse } from 'axios';
import { ApiFetchError } from '../error-parser';
import { normalizePath } from './authGate';
import { buildGetKey } from './cacheKey';
import {
  getCacheGeneration,
  inflightGet,
  readCache,
  readMemoryCache,
  writeCache,
} from './httpCache';
import { api } from './instances';
import { getRateLimitBackoffUntil } from './rateLimit';
import { DEBUG_LOG, HTTP_CACHE_TTL, REQUEST_MIN_INTERVAL_MS, logDebugError } from './settings';

/**
 * GET con caché, coalescing y backoff.
 *
 * Reemplaza `api.get` para que toda lectura comparta la respuesta en vuelo,
 * aproveche la caché persistente y falle rápido cuando no hay cobertura.
 */
const lastRequestAt = new Map<string, number>();

/** Condicional GET: If-None-Match / If-Modified-Since desde la caché en memoria. */
function withConditionalHeaders(key: string, config?: any): any {
  try {
    const mem = readMemoryCache(key);
    if (!mem) return config;
    const headers = { ...(config?.headers || {}) };
    if (mem.etag) {
      headers['If-None-Match'] = mem.etag;
    } else if (mem.lastModified) {
      headers['If-Modified-Since'] = mem.lastModified;
    }
    return { ...(config || {}), headers };
  } catch {
    return config;
  }
}

/** Espacia las ráfagas al mismo endpoint para no disparar el rate limit. */
async function throttleEndpoint(path: string): Promise<void> {
  try {
    if (REQUEST_MIN_INTERVAL_MS > 0 && path) {
      const last = lastRequestAt.get(path) || 0;
      const elapsed = Date.now() - last;
      if (elapsed < REQUEST_MIN_INTERVAL_MS) {
        await new Promise((r) => setTimeout(r, REQUEST_MIN_INTERVAL_MS - elapsed));
      }
      lastRequestAt.set(path, Date.now());
    }
  } catch (throttleError) {
    logDebugError('[api] No se pudo aplicar throttle', throttleError);
  }
}

function cachedResponse(data: any, config: any, statusText = 'OK'): AxiosResponse {
  return { data, status: 200, statusText, headers: {}, config } as AxiosResponse;
}

export function installCachedGet(): void {
  const originalGet = api.get.bind(api);

  (api as any).get = async (url: string, config?: any) => {
    // Si se proporcionó cancelToken o signal, evitar coalescing pero mantener cache/backoff
    const hasCancel = !!(config && (config.cancelToken || config.signal));
    const key = buildGetKey(url, config);
    const path = normalizePath(url as any);

    config = withConditionalHeaders(key, config);

    // Si existe backoff activo por rate limit, servir caché si está disponible
    try {
      const until = getRateLimitBackoffUntil(path);
      if (until && Date.now() < until) {
        const cachedBackoff = await readCache(key, { allowIdb: true });
        if (cachedBackoff) {
          if (DEBUG_LOG) console.log('[api] Cache durante backoff:', key);
          return cachedResponse(cachedBackoff, config);
        }
      }
    } catch (backoffError) {
      logDebugError('[api] No se pudo evaluar backoff activo', backoffError);
    }

    await throttleEndpoint(path);

    const skipCache = !!(config && (config.skipCache || config.cache === false || config.responseType === 'blob'));

    // Cache fresco primero (ahora asíncrono por IndexedDB) si no se salta la caché
    if (!skipCache) {
      const cached = await readCache(key);
      if (cached) {
        if (DEBUG_LOG) console.log('[api] Cache HIT:', key);
        return cachedResponse(cached, config);
      }

      // En una zona rural, fallar rápido permite que la UI muestre el dato
      // pendiente/offline sin esperar el timeout completo de Axios.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new ApiFetchError('Sin conexión y sin datos guardados para esta consulta.', {
          code: 'OFFLINE_NO_CACHE',
          status: 0,
        });
      }
    }

    const existing = inflightGet.get(key);
    if (existing && !hasCancel) {
      if (DEBUG_LOG) console.log('[api] Coalesced GET:', key);
      return existing;
    }

    const requestGeneration = getCacheGeneration();
    const p = originalGet(url, config).then((resp: AxiosResponse) => {
      // Si una escritura terminó mientras este GET estaba en vuelo, no
      // entregues la respuesta anterior: vuelve a consultar al servidor.
      if (requestGeneration !== getCacheGeneration()) {
        return originalGet(url, {
          ...(config || {}),
          params: { ...(config?.params || {}), cache_bust: Date.now() },
          cache: false,
        });
      }

      // Guardar en caché la respuesta si no se salta la caché (y no es un 304 Not Modified)
      if (!skipCache && resp.status !== 304) {
        try {
          const etag = resp.headers?.['etag'] || resp.headers?.['ETag'];
          const lastModified = resp.headers?.['last-modified'] || resp.headers?.['Last-Modified'];
          writeCache(key, resp.data, HTTP_CACHE_TTL, { etag, lastModified });
        } catch (cacheError) {
          logDebugError('[api] No se pudo almacenar respuesta en caché', cacheError);
        }
      }
      if (resp.status === 304) {
        try {
          const mem = readMemoryCache(key);
          if (mem) {
            // Actualizar la expiración en caché ya que el servidor confirmó que sigue siendo válido (304)
            writeCache(key, mem.data, HTTP_CACHE_TTL, { etag: mem.etag, lastModified: mem.lastModified });
            return { data: mem.data, status: 200, statusText: 'Not Modified', headers: resp.headers, config } as AxiosResponse;
          }
        } catch { /* noop */ }
      }
      return resp;
    });
    inflightGet.set(key, p);
    const clear = () => {
      if (inflightGet.get(key) === p) inflightGet.delete(key);
    };
    p.then(clear, clear);
    return p;
  };
}
