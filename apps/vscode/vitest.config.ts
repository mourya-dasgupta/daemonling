import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';
import { sharedResolve } from '../../vitest.shared.js';

export default defineProject({
  ...sharedResolve,
  resolve: {
    ...sharedResolve.resolve,
    // The real `vscode` module only exists inside the editor.
    alias: { vscode: fileURLToPath(new URL('./test/vscode-stub.ts', import.meta.url)) },
  },
  test: { environment: 'node', include: ['test/**/*.test.ts'], testTimeout: 30000 },
});
