# Decision Log

Every non-obvious product or engineering call made while building the MVP. Format: decision,
alternatives considered, why. Newest decisions are appended at the bottom of each milestone.

## M0 — Foundations

### D-001 Branch name

- **Decision:** Work on `feat/daemonling-mvp` as the founder asked. The cloud session was created
  with a different default branch (`claude/busy-goldberg-m8aoai`); we push the same commits there too
  only if pushing to `feat/daemonling-mvp` is refused.
- **Alternatives:** Use only the session branch.
- **Why:** The founder's brief names the branch explicitly and the PR body refers to it.

### D-002 Workspace packages resolve to TypeScript sources in dev, `dist` in production

- **Decision:** Each workspace package's `exports` has a custom `daemonling-source` condition pointing
  at `src/index.ts`. TypeScript (`customConditions`), Vitest/Vite (`resolve.conditions`) and esbuild
  (`conditions`) use it; `tsc` builds and plain Node fall back to `dist`.
- **Alternatives:** TS project references (`tsc -b`); path aliases; always building before testing.
- **Why:** Tests and typechecks need no prior build step, bundles never go stale, and published
  packages still work as normal compiled ESM.

### D-003 Library modules use NodeNext + explicit `.js` import extensions

- **Decision:** `packages/*` and `apps/cli` compile with `module: NodeNext`; the web app uses
  `moduleResolution: Bundler`.
- **Alternatives:** Bundler resolution everywhere.
- **Why:** The compiled libraries are valid Node ESM without a bundler, which keeps the npm story
  simple.

### D-004 Bundle the CLI and the VS Code extension with esbuild

- **Decision:** `apps/cli` → single `dist/dmn.js` (ESM, shebang); `apps/vscode` →
  `dist/extension.cjs` (CommonJS, `vscode` external).
- **Alternatives:** Ship `tsc` output with `node_modules`.
- **Why:** One file loads fast (important for `dmn prompt` < 50 ms) and the `.vsix` needs no
  dependencies (`vsce package --no-dependencies`).

### D-005 Tool versions

- **Decision:** TypeScript 5.9, Vitest 3.2, ESLint 9, Vite 7, React 19, esbuild 0.25.
- **Alternatives:** The newest majors (TypeScript 7, Vitest 5, ESLint 10).
- **Why:** The brief fixes TypeScript 5; the other picks are the newest lines with long, stable
  track records together.

### D-006 Coverage gate scope

- **Decision:** CI enforces ≥ 90% lines/branches/functions/statements for `packages/core/src/**`
  only; other packages are reported but not gated.
- **Alternatives:** One global threshold.
- **Why:** The brief gates the engine. UI glue code (VS Code activation, React entry) is better
  covered by pure-function tests than by chasing a global number.
