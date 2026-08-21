import { beforeEach, describe, expect, it } from 'vitest';
import { hasClientSession } from './session';
import { AUTH_SESSION_ACTIVE_KEY, AUTH_STORAGE_KEY } from './settings';

/**
 * `hasClientSession` decide si el cliente puede asumir que hay sesión antes de
 * reintentar un 401. Exige dos cosas: que este arranque del navegador haya
 * autenticado (la marca de sesión activa) y que quede alguna evidencia legible
 * —token guardado o cookie no HttpOnly, como la de CSRF—.
 */
describe('hasClientSession', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = 'csrf_access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('reconoce la sesión cuando hay marca activa y cookie CSRF legible', () => {
    sessionStorage.setItem(AUTH_SESSION_ACTIVE_KEY, '1');
    document.cookie = 'csrf_access_token=token-de-prueba; path=/';

    expect(hasClientSession()).toBe(true);
  });

  it('rechaza una sesión de navegador que no fue autenticada en este arranque', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'token-viejo');

    expect(hasClientSession()).toBe(false);
  });

  it('rechaza la marca activa sin ninguna evidencia de credencial', () => {
    sessionStorage.setItem(AUTH_SESSION_ACTIVE_KEY, '1');

    expect(hasClientSession()).toBe(false);
  });
});
