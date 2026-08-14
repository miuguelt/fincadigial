import baseConfig from './eslint.config.js'

export default [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Structural metrics remain visible as a dedicated, non-blocking report.
      // They are migration targets, not functional correctness failures.
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 5],
      complexity: ['warn', 10],
    },
  },
]
