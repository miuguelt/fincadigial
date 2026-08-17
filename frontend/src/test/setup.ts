import React from 'react'
import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { server } from '../tests/mocks/mocks/server'

// Mock de ResponsiveContainer de recharts para evitar warnings de dimensión 0 en JSDOM
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children, width = 500, height = 300, ...props }: any) => {
      const w = typeof width === 'number' ? width : 500;
      const h = typeof height === 'number' ? height : 300;
      return React.createElement(
        'div',
        {
          className: 'recharts-responsive-container',
          style: { width: '100%', height: '100%' },
          ...props,
        },
        React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, { width: w, height: h })
          : children
      );
    },
  };
});

// Hacer compatible jest con vi de vitest
if (typeof globalThis !== 'undefined') {
  (globalThis as any).jest = vi
}

// Mock global de i18n para evitar errores de Provider en tests unitarios
vi.mock('@/shared/i18n', () => {
  const t = (key: string, def?: string) => def || key;
  return {
    useI18n: () => ({
      t,
      locale: 'es',
      messages: {},
    }),
    useT: () => t,
    I18nProvider: ({ children }: any) => children,
    i18n: {
      t,
      locale: 'es',
      messages: {},
    },
    extendMessages: () => {},
  };
})

// Mock global de CacheContext para evitar errores de Provider en tests unitarios
vi.mock('@/app/providers/CacheContext', () => {
  return {
    useCache: () => ({
      getCache: () => null,
      setCache: () => {},
      invalidateCache: () => {},
      invalidatePattern: () => {},
      invalidateByEndpoint: () => {},
      clearCache: () => {},
      preloadData: async (_key: string, fetchFn: any) => await fetchFn(),
    }),
    useCacheKey: () => ({
      generateKey: (endpoint: string) => endpoint,
    }),
    CacheProvider: ({ children }: any) => children,
    CacheUtils: {
      patterns: {},
      getRelatedKeys: () => [],
      getRealURL: (key: string) => key,
    },
  };
})


// Polyfill para ResizeObserver en JSDOM
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub

// Polyfill para IntersectionObserver en JSDOM
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver = IntersectionObserverStub as any;

// Polyfill para matchMedia en JSDOM
if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function() {
    return {
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }
  }
}

// Polyfill para PointerEvent en JSDOM (Requerido por Radix UI Dialog/Dropdown)
if (typeof globalThis !== 'undefined' && !globalThis.PointerEvent) {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, props: any = {}) {
      super(type, props)
      ;(this as any).pointerId = props.pointerId || 0
      ;(this as any).pointerType = props.pointerType || ''
    }
  } as any
}

// Establecer el servidor de MSW antes de todos los tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// Limpiar los manejadores después de cada test para que no afecten a otros
afterEach(() => server.resetHandlers())

// Cerrar el servidor después de que terminen todos los tests
afterAll(() => server.close())
