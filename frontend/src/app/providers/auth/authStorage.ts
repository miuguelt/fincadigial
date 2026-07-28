const LS_AUTH_USER_KEY = "auth:user";
const LS_AUTH_TTL = 24 * 60 * 60 * 1000;
const LS_AUTH_RECENT_TS = "auth:recent_ts";
const AUTH_SESSION_ACTIVE_KEY = "auth:session_active";
const RECENT_WINDOW_MS = 2000;
const USER_CACHE_TTL = 60 * 60 * 1000;
const LS_USER_CACHE_KEY = "auth:user:cache";
const DEV_USER_SESSION_KEY = "dev_user_data_session";

const ssGet = (k: string): string | null => {
	try {
		if (typeof window === "undefined" || !("sessionStorage" in window))
			return null;
		const v = window.sessionStorage.getItem(k);
		return v && v.trim() ? v : null;
	} catch {
		return null;
	}
};

const ssSet = (k: string, v: string) => {
	try {
		if (typeof window === "undefined" || !("sessionStorage" in window)) return;
		window.sessionStorage.setItem(k, v);
	} catch {
		/* ignore */
	}
};

const ssRemove = (k: string) => {
	try {
		if (typeof window === "undefined" || !("sessionStorage" in window)) return;
		window.sessionStorage.removeItem(k);
	} catch {
		/* ignore */
	}
};

export function persistUser(user: any) {
	try {
		const payload = JSON.stringify({ data: user, ts: Date.now() });
		sessionStorage.setItem(LS_AUTH_USER_KEY, payload);
	} catch {
		/* ignore */
	}
}

export function readPersistedUser(): any | null {
	try {
		const raw = sessionStorage.getItem(LS_AUTH_USER_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (Date.now() - parsed.ts > LS_AUTH_TTL) {
			sessionStorage.removeItem(LS_AUTH_USER_KEY);
			return null;
		}
		return parsed.data;
	} catch {
		return null;
	}
}

export function removePersistedUser() {
	try {
		sessionStorage.removeItem(LS_AUTH_USER_KEY);
	} catch {
		/* ignore */
	}
}

export function setRecentAuth() {
	try {
		sessionStorage.setItem(LS_AUTH_RECENT_TS, String(Date.now()));
	} catch {
		/* ignore */
	}
}

export function isRecentAuth(): boolean {
	try {
		const ts = sessionStorage.getItem(LS_AUTH_RECENT_TS);
		return !!ts && Date.now() - Number(ts) < RECENT_WINDOW_MS;
	} catch {
		return false;
	}
}

export function persistSessionActive() {
	try {
		sessionStorage.setItem(AUTH_SESSION_ACTIVE_KEY, "1");
	} catch {
		/* ignore */
	}
}

export function clearSessionActive() {
	try {
		sessionStorage.removeItem(AUTH_SESSION_ACTIVE_KEY);
	} catch {
		/* ignore */
	}
}

export function isSessionActive(): boolean {
	try {
		return sessionStorage.getItem(AUTH_SESSION_ACTIVE_KEY) === "1";
	} catch {
		return false;
	}
}

export function getUserCache(): any | null {
	try {
		const raw = sessionStorage.getItem(LS_USER_CACHE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (Date.now() - parsed.ts > USER_CACHE_TTL) {
			sessionStorage.removeItem(LS_USER_CACHE_KEY);
			return null;
		}
		return parsed.data;
	} catch {
		return null;
	}
}

export function setUserCache(user: any) {
	try {
		sessionStorage.setItem(
			LS_USER_CACHE_KEY,
			JSON.stringify({ data: user, ts: Date.now() }),
		);
	} catch {
		/* ignore */
	}
}

export function clearUserCache() {
	try {
		sessionStorage.removeItem(LS_USER_CACHE_KEY);
	} catch {
		/* ignore */
	}
}

export { DEV_USER_SESSION_KEY, LS_AUTH_USER_KEY, ssGet, ssRemove, ssSet };
