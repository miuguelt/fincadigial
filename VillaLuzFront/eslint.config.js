import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import devbrain from './eslint-plugin-devbrain.js'

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'build'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'devbrain': devbrain,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'devbrain/no-es-es': 'error',
      'devbrain/require-locale': 'error',
      // Project pragmatics: relax strict TS rules for faster iteration
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          ignoreRestSiblings: true,
        },
      ],
      // Common DX tweaks
      'no-irregular-whitespace': 'off',
      'prefer-const': 'warn',
      '@typescript-eslint/no-unused-expressions': 'off',

      // Architecture guardrails — enforced for high quality
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 4],
      'max-params': ['error', 5],
      'complexity': ['error', 10],
    },
  },
  // Disable Fast Refresh rule for context providers and entrypoint where mixed exports are expected
  {
    files: [
      'src/app/providers/*.tsx',
      'src/app/main.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
