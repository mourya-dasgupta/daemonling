import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sharedResolve } from '../../vitest.shared.js';

export default defineConfig({
  ...sharedResolve,
  // Relative base so the build works on GitHub Pages under /<repo>/ and from any sub-path.
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: true },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
  },
});
