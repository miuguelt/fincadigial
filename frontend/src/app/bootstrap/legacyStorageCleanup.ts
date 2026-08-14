const CLEANUP_MARKER = 'villaluz:legacy-storage-cleanup:v2';
const LEGACY_KEYS = [
  'finca_access_token',
  'dev_user_data',
  'jwt_metadata',
  'auth:user',
  'auth:recent_ts',
  'auth:user:cache',
  'auth:auto_login_block',
  'auth:session_active',
  'finca_auth_login_path',
];
const LEGACY_PREFIXES = ['app-cache:', 'offline_cache_v1:'];

function removeLegacyKeys(storage: Storage): void {
  for (const key of LEGACY_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // Private browsing and quota errors are safe to ignore here.
    }
  }

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (!key || !LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
    try {
      storage.removeItem(key);
    } catch {
      // Private browsing and quota errors are safe to ignore here.
    }
  }
}

/** Removes storage keys from versions that persisted auth/cache in localStorage. */
export function cleanupLegacyLocalStorage(): void {
  if (typeof window === 'undefined' || !('localStorage' in window)) return;

  try {
    if (window.localStorage.getItem(CLEANUP_MARKER) === 'done') return;
    removeLegacyKeys(window.localStorage);
    window.localStorage.setItem(CLEANUP_MARKER, 'done');
  } catch {
    // Storage can be unavailable; authentication does not depend on this cleanup.
  }
}
