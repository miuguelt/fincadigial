import { getUserFromToken } from '@/shared/utils/jwtUtils';

const AUTH_USER_KEY = 'auth:user';
const ACTIVE_FARM_KEY = 'villaluz_finca_id';
const TOKEN_KEYS = ['finca_access_token', 'access_token'] as const;

type ScopeRecord = Record<string, any>;

function isRecord(value: unknown): value is ScopeRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;

  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      const value = storage?.getItem(key);
      if (value && value.trim()) return value;
    } catch {
      // Storage may be unavailable or blocked; try the next source.
    }
  }

  return null;
}

function parseStoredRecord(raw: string | null): ScopeRecord | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    const candidate = [parsed.user, parsed.data, parsed.profile].find(isRecord) ?? parsed;
    return isRecord(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function readStoredUser(): ScopeRecord | null {
  return parseStoredRecord(readStorage(AUTH_USER_KEY));
}

function readTokenClaims(): ScopeRecord | null {
  for (const key of TOKEN_KEYS) {
    const token = readStorage(key);
    if (token === null || token === 'cookie') continue;

    const normalizedToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token;
    if (normalizedToken.split('.').length !== 3) continue;

    const claims = getUserFromToken(normalizedToken);
    if (isRecord(claims)) return claims;
  }

  return null;
}

function firstValue(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function scopePart(value: unknown, fallback: string): string {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function getUserId(user: ScopeRecord | null, claims: ScopeRecord | null): unknown {
  return firstValue(user?.id, user?.user_id, claims?.id, claims?.user_id, claims?.sub);
}

function getProfileFincaId(user: ScopeRecord | null): unknown {
  return firstValue(user?.active_finca_id, user?.current_finca_id, user?.finca_id, user?.finca?.id);
}

function getClaimFincaId(claims: ScopeRecord | null): unknown {
  return firstValue(
    claims?.active_finca_id,
    claims?.current_finca_id,
    claims?.finca_id,
    claims?.finca?.id,
    claims?.tenant_id,
  );
}

function getActiveFincaId(user: ScopeRecord | null, claims: ScopeRecord | null): unknown {
  return firstValue(readStorage(ACTIVE_FARM_KEY), getProfileFincaId(user), getClaimFincaId(claims));
}

/**
 * Returns the tenant scope shared by BaseService and the Axios GET cache.
 * Identifiers only are included; authentication tokens never become cache keys.
 */
export function getCacheScope(): string {
  const storedUser = readStoredUser();
  const tokenClaims = readTokenClaims();
  return `${scopePart(getUserId(storedUser, tokenClaims), 'anonymous')}:${scopePart(getActiveFincaId(storedUser, tokenClaims), 'default-finca')}`;
}
