import { beforeEach, describe, expect, it } from "vitest";
import { hasClientSession } from "./auth-utils";
import { AUTH_SESSION_ACTIVE_KEY } from "./config";

describe("hasClientSession", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
	});

	it("reconoce una sesión autenticada mediante cookie HttpOnly", () => {
		sessionStorage.setItem(AUTH_SESSION_ACTIVE_KEY, "1");

		expect(hasClientSession()).toBe(true);
	});

	it("rechaza una sesión de navegador que no fue autenticada", () => {
		expect(hasClientSession()).toBe(false);
	});
});
