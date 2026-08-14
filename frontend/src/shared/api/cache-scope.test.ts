import { beforeEach, describe, expect, it } from 'vitest';
import { getCacheScope } from './cache-scope';
import { BaseService } from './base-service';

class ProbeService extends BaseService<unknown> {
  public cacheKey(params?: Record<string, any>): string {
    return this.getCacheKey(params);
  }
}

describe('tenant cache scope', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('uses the active user and farm from the authenticated context', () => {
    sessionStorage.setItem('auth:user', JSON.stringify({
      user: { id: 7, finca_id: 1 },
      ts: Date.now(),
    }));

    expect(getCacheScope()).toBe('7:1');
  });

  it('changes BaseService keys between consecutive sessions in the same browser', () => {
    const service = new ProbeService('/treatment_medications');

    sessionStorage.setItem('auth:user', JSON.stringify({ user: { id: 7, finca_id: 1 } }));
    const fincaOneKey = service.cacheKey({ page: 1 });

    sessionStorage.setItem('auth:user', JSON.stringify({ user: { id: 12, finca_id: 2 } }));
    const fincaTwoKey = service.cacheKey({ page: 1 });

    expect(fincaOneKey).toContain('7:1:/treatment_medications:');
    expect(fincaTwoKey).toContain('12:2:/treatment_medications:');
    expect(fincaTwoKey).not.toBe(fincaOneKey);
  });

  it('prefers an explicitly selected farm over the user profile farm', () => {
    sessionStorage.setItem('auth:user', JSON.stringify({ user: { id: 7, finca_id: 1 } }));
    localStorage.setItem('villaluz_finca_id', '2');

    expect(getCacheScope()).toBe('7:2');
  });

  it('falls back to the user and farm claims in a JWT', () => {
    const encode = (value: Record<string, unknown>) =>
      btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const token = [
      encode({ alg: 'HS256', typ: 'JWT' }),
      encode({ sub: '19', id: 19, finca_id: 4, iat: 1, exp: 4102444800 }),
      'signature',
    ].join('.');
    localStorage.setItem('access_token', token);

    expect(getCacheScope()).toBe('19:4');
  });
});
