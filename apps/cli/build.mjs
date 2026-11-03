// Bundles the CLI into a single ESM file so `dmn prompt` starts fast.
import { build } from 'esbuild';
import { chmodSync } from 'node:fs';

await build({
  entryPoints: ['src/bin.ts'],
  outfile: 'dist/dmn.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  conditions: ['daemonling-source'],
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'warning',
});
chmodSync('dist/dmn.js', 0o755);
