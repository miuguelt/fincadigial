import { getCacheScope } from '../cache-scope';
import { api } from './instances';

/**
 * Clave canónica de un GET: método, URL absoluta y parámetros ordenados.
 *
 * Se usa tanto para la caché como para el coalescing de peticiones idénticas.
 */
export const buildGetKey = (url: string, config?: any): string => {
  const base = api.defaults.baseURL || '';
  let full = url;
  if (!/^https?:\/\//i.test(url)) {
    let cleanUrl = url;
    if (base.endsWith('/api/v1') && cleanUrl.startsWith('/api/v1/')) {
      cleanUrl = cleanUrl.slice('/api/v1'.length);
    }
    full = cleanUrl.startsWith('/') ? `${base}${cleanUrl}` : `${base}/${cleanUrl}`;
  }

  let paramsPart = '';
  if (config?.params) {
    if (typeof config.params === 'string') {
      paramsPart = config.params;
    } else if (typeof config.params === 'object') {
      const keys = Object.keys(config.params).filter((k) => config.params[k] !== undefined && config.params[k] !== null).sort();
      if (keys.length > 0) {
        paramsPart = keys.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(config.params[k]))}`).join('&');
      }
    }
  }

  const requestKey = !paramsPart
    ? `GET ${full}`
    : `GET ${full}${full.includes('?') ? '&' : '?'}${paramsPart}`;

  // Protected endpoints must never reuse data from another user or finca.
  // The scope contains identifiers only; tokens are deliberately excluded.
  return `${getCacheScope()} ${requestKey}`;
};
