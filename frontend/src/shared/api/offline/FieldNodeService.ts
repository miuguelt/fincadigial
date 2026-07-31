/**
 * Access to an optional Villa Luz node on the farm LAN.
 *
 * A browser cannot listen for connections from other phones. The field node is
 * therefore a small Villa Luz backend reachable through the farm Wi-Fi/hotspot.
 * This client keeps the endpoint user-configurable so an installed PWA can keep
 * working when the internet disappears but the local network is still present.
 */
import { getEnvVar } from '@/shared/utils/viteEnv';

const STORAGE_KEY = 'villaluz.field-node.api-url';
const NODE_CHANGED_EVENT = 'villaluz:field-node-changed';

export type FieldNodeStatus = 'disabled' | 'checking' | 'available' | 'unavailable';

export interface FieldNodeProbe {
  status: FieldNodeStatus;
  url: string;
  latencyMs?: number;
}

function authHeaders(): Record<string, string> {
  try {
    const storageKey = String(getEnvVar('VITE_AUTH_STORAGE_KEY', 'finca_access_token'));
    const token = localStorage.getItem(storageKey)
      || sessionStorage.getItem(storageKey)
      || localStorage.getItem('access_token')
      || sessionStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function normalizeApiUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed) return '';

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  const parsed = new URL(withProtocol);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('NODE_URL_INVALID');

  // Plain HTTP is acceptable only inside the local network. Public endpoints
  // must use HTTPS because the node receives the user's access token.
  const host = parsed.hostname.toLowerCase();
  const privateHost = host === 'localhost'
    || host === '127.0.0.1'
    || host.endsWith('.local')
    || /^10\./.test(host)
    || /^192\.168\./.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (parsed.protocol === 'http:' && !privateHost) throw new Error('NODE_HTTPS_REQUIRED');

  let pathname = parsed.pathname.replace(/\/$/, '');
  pathname = pathname.replace(/\/sync$/, '').replace(/\/chat$/, '');
  if (!pathname || pathname === '/') pathname = '/api/v1';
  if (!pathname.endsWith('/api/v1')) pathname = `${pathname}/api/v1`.replace(/\/+/g, '/');
  parsed.pathname = pathname;
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

async function readJson(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (body as { message?: string } | null)?.message || `NODE_HTTP_${response.status}`;
    throw new Error(message);
  }
  return body;
}

class FieldNodeServiceImpl {
  getUrl(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return normalizeApiUrl(stored);
    } catch {
      // Storage can be unavailable in private/restricted browser modes.
    }

    const configured = String(getEnvVar('VITE_LAN_NODE_URL', '') || '');
    if (!configured || configured.startsWith('/')) return '';
    try {
      return normalizeApiUrl(configured);
    } catch {
      return '';
    }
  }

  setUrl(value: string): string {
    const normalized = value.trim() ? normalizeApiUrl(value) : '';
    if (normalized) localStorage.setItem(STORAGE_KEY, normalized);
    else localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(NODE_CHANGED_EVENT, { detail: normalized }));
    return normalized;
  }

  subscribe(listener: () => void): () => void {
    window.addEventListener(NODE_CHANGED_EVENT, listener);
    return () => window.removeEventListener(NODE_CHANGED_EVENT, listener);
  }

  async probe(candidate?: string): Promise<FieldNodeProbe> {
    const url = candidate === undefined ? this.getUrl() : normalizeApiUrl(candidate);
    if (!url) return { status: 'disabled', url: '' };
    const startedAt = Date.now();
    try {
      const response = await fetch(`${url}/sync/health`, {
        method: 'GET',
        headers: { Accept: 'application/json', ...authHeaders() },
        credentials: 'include',
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error(`NODE_HTTP_${response.status}`);
      return { status: 'available', url, latencyMs: Date.now() - startedAt };
    } catch {
      return { status: 'unavailable', url };
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /** Execute one queued domain mutation against the configured LAN node. */
  async mutate<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {};
    const init: RequestInit = { method: method.toUpperCase(), headers };
    if (method.toUpperCase() !== 'DELETE' && body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    return this.request<T>(path, init);
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = this.getUrl();
    if (!url) throw new Error('FIELD_NODE_NOT_CONFIGURED');
    const response = await fetch(`${url}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', ...authHeaders(), ...(init.headers || {}) },
      signal: AbortSignal.timeout(8000),
    });
    return readJson(response) as Promise<T>;
  }
}

export const FieldNodeService = new FieldNodeServiceImpl();
export default FieldNodeService;
