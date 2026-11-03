import { defineProject } from 'vitest/config';
import { sharedResolve } from '../../vitest.shared.js';

export default defineProject({
  ...sharedResolve,
  test: { environment: 'node', include: ['test/**/*.test.ts'] },
});
