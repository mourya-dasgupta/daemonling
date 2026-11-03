// Bundles the extension (and the workspace packages it uses) into one CommonJS file.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['vscode'],
  conditions: ['daemonling-source'],
  logLevel: 'warning',
});
