import { defineConfig, mergeConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig((env) => {
  const baseConfig = typeof viteConfig === 'function' ? viteConfig(env) : viteConfig

  // Eliminar define problemático en el entorno Vitest
  if (baseConfig.define) {
    delete baseConfig.define
  }

  return mergeConfig(baseConfig, {
    test: {
      environment: 'jsdom',
      globals: true,
      testTimeout: 15000,
      setupFiles: ['./src/test/setup.ts'],
      exclude: [
        ...configDefaults.exclude,
        'e2e/**',
        'playwright-tests/**',
        'src/test/**'
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: '../coverage',
        exclude: ['node_modules', 'src/test'],
        thresholds: {
          lines: 70,
          functions: 70,
          branches: 60,
          statements: 70,
          'src/hooks/useAnimales.ts': {
            lines: 85,
            functions: 85,
            branches: 85,
            statements: 85
          },
          'src/components/modules/AnimalForm.tsx': {
            lines: 85,
            functions: 85,
            branches: 85,
            statements: 85
          }
        }
      }
    }
  })
})
