import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'json-summary', 'lcov'],
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', 'apps/vscode/src/extension.ts', 'apps/web/src/main.tsx'],
      thresholds: {
        // The engine is the product: hold it to a high bar (enforced in CI).
        'packages/core/src/**': { lines: 90, branches: 90, functions: 90, statements: 90 },
      },
    },
  },
});
