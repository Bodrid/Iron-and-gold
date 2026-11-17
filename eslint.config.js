import tseslint from 'typescript-eslint';

const banned = ['random', 'sin', 'cos', 'tan', 'atan', 'atan2', 'asin', 'acos', 'exp', 'expm1', 'log', 'log2', 'log10', 'log1p', 'pow', 'hypot', 'cbrt', 'sinh', 'cosh', 'tanh']
  .map(property => ({ object: 'Math', property, message: 'Not deterministic across devices; the simulation must stay deterministic.' }));

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'tools/map/cache', 'test-results', 'playwright-report', '.superpowers'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/sim/**/*.ts'],
    ignores: ['src/sim/**/*.test.ts'],
    rules: {
      'no-restricted-properties': ['error', ...banned],
      'no-restricted-globals': ['error', { name: 'Date', message: 'No wall-clock time in the simulation.' }, { name: 'performance', message: 'No wall-clock time in the simulation.' }],
      'no-restricted-syntax': ['error', { selector: 'ForInStatement', message: 'for...in iteration order is not something to rely on; use Object.keys with a fixed order.' }],
    },
  },
);
