// Bundles the CLI into a single ESM file so `dmn prompt` starts fast.
import { build } from 'esbuild';
import { chmodSync } from 'node:fs';

await build({
  entryPoints: ['src/bin.ts'],
  outdir: 'dist',
  entryNames: 'dmn',
  chunkNames: 'chunks/[name]-[hash]',
  splitting: true,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  conditions: ['daemonling-source'],
  banner: {
    // CommonJS dependencies (commander) need `require` inside an ESM bundle.
    js: "#!/usr/bin/env node\nimport { createRequire as __dmnCreateRequire } from 'node:module';\nconst require = __dmnCreateRequire(import.meta.url);",
  },
  logLevel: 'warning',
});
chmodSync('dist/dmn.js', 0o755);
