import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Global ignores — must be first
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/bun.lock',
      // Corpus task fixtures are third-party repo snapshots + withheld solutions;
      // they are data, not our source, and must not be linted.
      'corpus/**',
    ],
  },

  // Base rules for all TS files
  {
    files: ['core/**/*.ts', 'pier/**/*.ts', 'domains/**/*.ts', 'cli/**/*.ts'],
    ...js.configs.recommended,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['core/**/*.ts', 'pier/**/*.ts', 'domains/**/*.ts', 'cli/**/*.ts'],
  })),

  {
    files: ['core/**/*.ts', 'pier/**/*.ts', 'domains/**/*.ts', 'cli/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Prettier compat — always last
  prettierConfig,
];
