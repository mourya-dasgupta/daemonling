# Build Log

One entry per milestone: what was built, key decisions, what was hard, test/coverage numbers, what
is deferred, and a Founder's comment.

## M0 — Foundations (2026-11-03)

**What was built.** A pnpm monorepo with three libraries (`packages/core`, `packages/store`,
`packages/sprites`) and three apps (`apps/cli`, `apps/vscode`, `apps/web`), each wired for
TypeScript strict typechecking, Vitest, and a production build. Root ESLint (flat config) and
Prettier, `.editorconfig`, `.nvmrc`, a GitHub Actions CI workflow (install → lint → format check →
typecheck → test with coverage gate → build → package the `.vsix` as an artifact), `PROGRESS.md`,
this log, the decision log, and skeletons for every founder document.

**Key decisions.** D-002 (a custom `daemonling-source` export condition so tests and bundles read
TypeScript sources directly), D-004 (esbuild bundles for the CLI and the extension), D-006 (coverage
gate scoped to the engine).

**What was hard.** Making one TypeScript setup serve three runtimes (Node CLI, VS Code's CommonJS
extension host, and a browser bundle) without project references. The export-condition trick keeps
it to one `tsconfig.base.json` plus small per-package overrides.

**Tests / coverage.** 6 smoke tests passing (one per package). Coverage is trivially 100% on the
empty core.

**Deferred.** Everything functional — this milestone only proves the pipes.

**Founder's comment.** We are a tiny company betting that a small, delightful tool can earn a place
in a developer's daily loop. That only works if we can ship every day without fear, so the very
first thing we built is the safety net: one command that lints, typechecks, tests and builds every
surface. It is boring work, and it is the reason the interesting work can move fast.

## M1 — Core engine (2026-11-03)

**What was built.** `packages/core`: the complete pet simulation from the game design spec as a pure,
event-sourced reducer. `config.ts` holds every constant. Implemented: decay over awake hours (user
time zone, DST-safe), completed/abandoned/honestly-reported sessions, editor distraction penalties
(capped per session), breaks, the burnout guardian (overwork yawn, late-night energy cost), commit
treats (10/day cap) and CI celebrations, hunger → health damage with a floor of 10, petting,
vacation, settings, derived conditions, hibernation and the two-session wake-up, streaks with earned
freezes, tricks, life stages, evolution into five species, `petSays` (5–6 variants per condition),
`summarize`, per-day history, week stats, the weekly journal, and the rubber-duck question picker.
Public API: `createPet`, `reduce`, `replay`, `deriveCondition`, `petSays`, `buildWeeklyJournal`,
`summarize`, plus types and helpers.

**Key decisions.** D-008 (ledger + reactions), D-009 (health regen and focus energy cost), D-011
(completions require an active session so two surfaces cannot double-feed), D-013 (trait weights),
D-017 (time zone offset cache).

**What was hard.** Time. "Awake hours only" in the user's time zone sounds simple until half-hour
zones (India is a key market) and DST arrive. The first implementation was correct but spent
~80 µs per `Intl` call; caching offsets and integrating per day made replay ~10× faster. The other
hard part was making the rules compose without surprises: a hibernating pet must not take hunger
damage, a vacation must not end a streak on the day you return, and a forgotten session must expire
without punishing anyone.

**Tests / coverage.** 81 tests in core (time, every rule in 3.3, honesty-pays across a grid of mood
and minutes, progression, voice/journal/duck, and a 60-day simulation of five personas that each
evolve into their expected species, never drop below the health floor, and — for the absent
sprinter — hibernate and wake up). Coverage for `packages/core/src`: **100% lines, 97.2% branches,
100% functions**.

**Deferred.** Tuning against real beta data (see the tuning plan in GAME_DESIGN.md). Localisation of
the pet's voice.

**Founder's comment.** The engine is the product. Everything users will love — the pet's moods, the
streaks, the moment it hatches — is decided here, so we made it boring in the best way: pure,
deterministic, and tested down to every rule. Because state is just a replay of events, we can tune
the game during the beta, fix bugs retroactively, and one day sync across devices without ever
asking users to trust us with more than a list of timestamps. And the honesty test is the soul of
the company in one assertion: telling your pet you got distracted must always beat quietly quitting.
