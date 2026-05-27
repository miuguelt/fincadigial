const config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/tests/mocks/fileMock.cjs',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.jest.json',
      diagnostics: {
        ignoreCodes: [1343]
      },
      astTransformers: {
        before: [
          {
            path: 'node_modules/ts-jest-mock-import-meta',
            options: { metaObjectKey: 'import_meta_env' }
          }
        ]
      }
    }],
    '^.+\\.(js|jsx)$': '<rootDir>/jest.transform.cjs',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/main.tsx',
    '!src/vite-env.d.ts',
    '!src/shared/types/**/*.ts',
    '!src/shared/api/client.ts',
    '!src/app/providers/AuthenticationContext.tsx',
    '!src/features/auth/model/useAuth.ts',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!jspdf|jspdf-autotable|fflate|fast-png|lucide-react|framer-motion|recharts|d3-.*)/',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};

export default config;
