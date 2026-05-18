import { User, Role } from "@/entities/user/model/types"

export const LS_AUTH_USER_KEY = 'auth:user'
export const LS_AUTH_TTL = 24 * 60 * 60 * 1000
export const LS_AUTH_RECENT_TS = 'auth:recent_ts'
export const AUTH_SESSION_ACTIVE_KEY = 'auth:session_active'
export const RECENT_WINDOW_MS = 2000
export const USER_CACHE_TTL = 60 * 60 * 1000
export const LS_USER_CACHE_KEY = 'auth:user:cache'
export const DEV_USER_SESSION_KEY = 'dev_user_data_session'
export const AUTO_LOGIN_BLOCK_KEY = 'auth:auto_login_block';
export const RATE_LIMIT_COOLDOWN_MS = 60_000;
export const AUTH_BC_NAME = 'auth:sync'
export const INFLIGHT_SUPPRESSION_WINDOW_MS = 5000
export const AUTH_BC_FALLBACK_KEY = 'auth:sync:storage'

export const lsGet = (k: string): string | null => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null
    const v = window.localStorage.getItem(k)
    return v && v.trim() ? v : null
  } catch {
    return null
  }
}

export const lsSet = (k: string, v: string) => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return
    window.localStorage.setItem(k, v)
  } catch { /* noop */ }
}

export const lsRemove = (k: string) => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return
    window.localStorage.removeItem(k)
  } catch { /* noop */ }
}

export function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const setCachedUser = (u: User | null) => {
  if (!u) {
    lsRemove(LS_USER_CACHE_KEY)
    return
  }
  const payload = { user: u, cachedAt: Date.now() }
  lsSet(LS_USER_CACHE_KEY, JSON.stringify(payload))
}

export const getCachedUser = (): User | null => {
  const parsed = safeJsonParse<{ user?: User; cachedAt?: number }>(lsGet(LS_USER_CACHE_KEY))
  if (!parsed) return null
  const cachedAt = Number(parsed?.cachedAt || 0)
  const age = Date.now() - cachedAt

  if (!cachedAt || age > USER_CACHE_TTL) {
    lsRemove(LS_USER_CACHE_KEY)
    return null
  }
  return parsed?.user || null
}

export const invalidateUserCache = () => lsRemove(LS_USER_CACHE_KEY)

export const blockAutoLogin = () => lsSet(AUTO_LOGIN_BLOCK_KEY, '1')
export const clearAutoLoginBlock = () => lsRemove(AUTO_LOGIN_BLOCK_KEY)
export const isAutoLoginBlocked = (): boolean => lsGet(AUTO_LOGIN_BLOCK_KEY) === '1'

export const persistUser = (u: User | null) => {
  if (!u) {
    lsRemove(LS_AUTH_USER_KEY)
    lsRemove(LS_AUTH_RECENT_TS)
    lsRemove(AUTH_SESSION_ACTIVE_KEY)
    invalidateUserCache()
    return
  }
  const payload = { user: u, ts: Date.now() }
  lsSet(LS_AUTH_USER_KEY, JSON.stringify(payload))
  lsSet(LS_AUTH_RECENT_TS, String(payload.ts))
  lsSet(AUTH_SESSION_ACTIVE_KEY, '1')
  setCachedUser(u)
}

export const readPersistedUser = (): User | null => {
  const parsed = safeJsonParse<{ user?: User; ts?: number }>(lsGet(LS_AUTH_USER_KEY))
  if (!parsed) return null
  const ts = Number(parsed?.ts || 0)
  if (!ts || (Date.now() - ts) > LS_AUTH_TTL) {
    lsRemove(LS_AUTH_USER_KEY)
    return null
  }
  return parsed?.user || null
}

export const prefetchRoleRoutes = (role?: string | Role | null) => {
  if (
    typeof (globalThis as any).process !== 'undefined' &&
    (!!(((globalThis as any).process as any).env?.JEST_WORKER_ID) ||
      !!(((globalThis as any).process as any).env?.VITEST))
  ) {
    return
  }
  try {
    void import("@/widgets/dashboard-layout/DashboardLayout")
    switch (role) {
      case Role.Administrador:
        void import("@/pages/dashboard/admin/AdminDashboard")
        break
      case Role.Instructor:
        void import("@/pages/dashboard/instructor/InstructorDashboard")
        break
      case Role.Aprendiz:
        void import("@/pages/dashboard/apprentice/ApprenticeDashboard")
        break
    }
  } catch { /* ignore */ }
}

