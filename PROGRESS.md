# Daemonling MVP — Progress

**Next action:** M3 — VS Code extension (`apps/vscode`): focus-sensing state machine, status bar, den webview.

Branch: `feat/daemonling-mvp` → `main`. This file is the source of truth for resuming work.
Every checkpoint commit updates it.

## M0 — Foundations

- [x] pnpm workspace (`pnpm-workspace.yaml`), root `package.json` scripts
- [x] `tsconfig.base.json` (strict, NodeNext, `daemonling-source` export condition)
- [x] ESLint flat config + Prettier + `.editorconfig` + `.nvmrc` (22)
- [x] Vitest projects + V8 coverage (core gate ≥ 90%)
- [x] Package/app skeletons: core, store, sprites, cli, vscode, web
- [x] CI workflow (`.github/workflows/ci.yml`)
- [x] `PROGRESS.md`, `docs/DECISIONS.md`, `docs/BUILD_LOG.md`
- [x] Skeletons of every M6 document
- [x] `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` green

## M1 — Core engine (`packages/core`)

- [x] `config.ts` with every constant
- [x] Types: `PetState`, events, stages, species, conditions
- [x] Time helpers (local day / hour in user timezone, awake-hours integration)
- [x] Reducer: decay, sessions, honest vs silent stop, distraction detected, breaks, overwork
- [x] Commits / CI, health & hunger, petting, vacation, settings
- [x] Conditions, hibernation + waking
- [x] Streaks + freezes, tricks, stages, evolution
- [x] `petSays`, `summarize`, `buildWeeklyJournal`, week stats, rubber-duck question picker
- [x] Unit tests for every rule + honesty-pays test
- [x] 60-day persona simulation test
- [x] Coverage ≥ 90% lines and branches
- [x] Draft PR opened (or skipped if no PR tool)

## M2 — Store + CLI

- [x] Store: `events.jsonl` + `snapshot.json`, `DAEMONLING_HOME`, lock + atomic writes
- [x] Schema versioning + example migration
- [x] IndexedDB adapter (tested with `fake-indexeddb`)
- [x] CLI: init, start (live countdown, Ctrl+C honesty prompt), status, pet, break, distracted
- [x] CLI: vacation, stats [--week], journal, duck, badge, hook, event, prompt, export/import
- [x] `NO_COLOR`, friendly errors, `--help`
- [x] Integration tests: init → start (test flag) → status → badge

## M3 — VS Code extension

- [ ] Status bar item (face + condition + remaining time) + quick pick
- [ ] Focus-sensing state machine (pure) + tests
- [ ] Shared store with CLI
- [ ] "Daemonling: Open Den" webview with SVG pet
- [ ] Settings: graceSeconds, dailyGoalMinutes, showInStatusBar
- [ ] esbuild bundle + `.vsix` packaging in CI

## M4 — Web home

- [ ] Vite + React PWA (manifest + hand-written service worker), IndexedDB store
- [ ] Den, Focus, Stats, Journal, Settings screens
- [ ] Themes (light/dark), a11y (AA contrast, keyboard, reduced motion), mobile-first
- [ ] Component tests: timer + den state mapping
- [ ] `.github/workflows/pages.yml`

## M5 — Developer-native extras

- [x] `renderCard(state)` README card + `dmn badge` (built in M2)
- [ ] `docs/README-CARD.md`
- [x] Commit treats via `dmn hook` + `dmn event commit` (built in M2)
- [x] Rubber-duck mode `dmn duck` (built in M2)
- [ ] Weekly journal in CLI and web
- [ ] Tests: card SVG validity, duck selection, hook install/uninstall

## M6 — Document pack

- [ ] README.md
- [ ] docs/GUIDE.md
- [ ] docs/RUNBOOK.md
- [ ] docs/ROADMAP.md
- [ ] docs/PORTFOLIO.md
- [ ] docs/PITCH.md
- [ ] docs/pitch/deck.html
- [ ] docs/DUE_DILIGENCE.md
- [ ] docs/PRODUCT_SPEC.md
- [ ] docs/GAME_DESIGN.md
- [ ] docs/ARCHITECTURE.md
- [ ] PRIVACY.md, SECURITY.md, CONTRIBUTING.md, CHANGELOG.md, LICENSE
- [ ] BUILD_LOG + DECISIONS retrospective

## M7 — Hardening + PR

- [ ] Clean run with `--frozen-lockfile`
- [ ] CLI smoke test transcript in BUILD_LOG
- [ ] Docs re-read against code
- [ ] `docs/PULL_REQUEST.md`
- [ ] PR ready for review (or instructions to create it)
