import { describe, expect, it } from 'vitest';
import {
  generateSessionId,
  appStateReducer,
  AppStateStatus,
  AppState,
} from './AppStateContext';

describe('AppStateContext - generateSessionId', () => {
  it('genera un ID de sesión seguro usando crypto.randomUUID si está disponible', () => {
    const sessionId = generateSessionId();
    expect(sessionId).toMatch(/^session_\d+_[a-zA-Z0-9-]+$/);
  });

  it('utiliza crypto.getRandomValues como fallback si randomUUID no está disponible', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto') || {
      value: globalThis.crypto,
      configurable: true,
      writable: true,
    };

    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          getRandomValues: (arr: Uint32Array) => {
            arr[0] = 123456789;
            arr[1] = 987654321;
            return arr;
          },
        },
        configurable: true,
        writable: true,
      });

      const fallbackId = generateSessionId();
      expect(fallbackId).toMatch(/^session_\d+_[a-z0-9]+_[a-z0-9]+$/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', originalDescriptor);
    }
  });

  it('utiliza timestamp como último fallback determinista si crypto no está disponible', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto') || {
      value: globalThis.crypto,
      configurable: true,
      writable: true,
    };

    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      const fallbackId = generateSessionId();
      expect(fallbackId).toMatch(/^session_\d+$/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', originalDescriptor);
    }
  });
});

describe('AppStateContext - appStateReducer (RESET_STATE)', () => {
  const dummyState: AppState = {
    status: AppStateStatus.READY,
    isOnline: true,
    dashboardData: null,
    animalModuleData: null,
    userModuleData: null,
    isLoading: false,
    dashboardLoaded: true,
    animalModuleLoaded: true,
    userModuleLoaded: true,
    errors: [],
    hasCriticalErrors: false,
    lastUpdate: 123456,
    sessionId: 'session_old_test_id',
  };

  it('genera un nuevo sessionId al recibir la acción RESET_STATE', () => {
    const newState = appStateReducer(dummyState, { type: 'RESET_STATE' });
    expect(newState.sessionId).not.toBe(dummyState.sessionId);
    expect(newState.sessionId).toMatch(/^session_\d+_[a-zA-Z0-9-]+$/);
    expect(newState.status).toBe(AppStateStatus.INITIALIZING);
  });
});
