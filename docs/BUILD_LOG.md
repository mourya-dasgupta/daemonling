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

## M2 — Store, sprites and the `dmn` CLI (2026-11-03)

**What was built.**

- `packages/store`: versioned JSONL record format with validation and a v1 → v2 migration, snapshot
  caching that replays only the events newer than the snapshot, export/import documents, a
  `FileStore` for Node (lock file, atomic snapshot writes, backups on import, snapshot rebuild) and
  an `IndexedDbStore` for browsers with the same `PetStore` interface.
- `packages/sprites` (pulled forward from M5): original ASCII frames for every mood (idle, happy,
  sad, sick, sleeping, cocoon, dance, egg) with species accents, an SVG renderer built from simple
  shapes with CSS-variable theming and a reduced-motion fallback, and the README card.
- `apps/cli`: `dmn init`, `start` (live animated countdown; Ctrl+C asks for honesty), `status`,
  `pet`, `break`, `distracted`, `vacation`, `settings`, `stats [--week]`, `journal`, `duck`,
  `badge`, `hook install|uninstall`, `event commit|ci-passed`, `prompt`, `export`, `import`. Respects
  `NO_COLOR`/`FORCE_COLOR`, friendly errors, `--help` everywhere. Bundled with esbuild into
  `dist/dmn.js` + lazy chunks.

**Key decisions.** D-020 (store layout and locking), D-022 (start persists immediately and
re-attaches), D-024 (prompt fast path).

**What was hard.** Two things. First, esbuild's ESM output cannot `require()` Node built-ins from a
CommonJS dependency (commander) — fixed with a `createRequire` banner. Second, the 50 ms budget for
`dmn prompt`: profiling showed the time was not our code but ICU initialisation for `Intl` time
zones (~15 ms) and parsing the whole CLI bundle. Code-splitting plus a snapshot-only path brought our
share down to ~10 ms over bare Node start-up.

**Tests / coverage.** 122 tests across the workspace, all passing. Coverage: core 100% lines /
97.6% branches; store 99.0% lines; sprites 99.7% lines; CLI 90.7% lines. The CLI integration tests
drive the real command tree in a temporary `DAEMONLING_HOME` with a fake clock: init → start (via
the hidden `--test-duration-ms` flag) → status → badge, plus Ctrl+C honesty, hooks in a temp git
repo, export/import, and the rubber duck. CI also smoke-tests the built binary.

**Deferred.** Publishing to npm (steps in RUNBOOK.md). A break timer. Shell-specific prompt snippets
beyond the examples in the guide.

**Founder's comment.** The terminal is where our users already live, so `dmn` is the heart of the
first impression: one command to hatch an egg, one to focus, and a little creature that is visibly
happier afterwards. We spent real effort on the boring parts — a crash-safe log anyone can read with
`cat`, a lock so the editor and the terminal never fight, and a prompt fast enough to run on every
keystroke — because trust in a local-first tool is earned by never losing someone's data or slowing
down their shell.

## M3 — VS Code extension (2026-11-03)

**What was built.** `apps/vscode`: a status-bar pet showing its face, condition (or streak) and the
time left in a session; a click opens a quick pick (Start 25/50/90, I got distracted, Take a break,
Pet, Show status). Focus sensing via `window.state.focused` only, through a pure state machine:
away longer than the grace period → `DISTRACTION_DETECTED`; away more than five minutes → one
non-modal "end honestly?" notification (budget: two unsolicited notifications per day). A "Daemonling:
Open Den" webview renders the SVG pet, stats and actions under a strict nonce-based CSP. Settings:
`daemonling.graceSeconds`, `daemonling.dailyGoalMinutes`, `daemonling.showInStatusBar`. Shares
`~/.daemonling` with the CLI. Bundled with esbuild (64 KB) and packaged with `vsce` into a 23 KB
`daemonling-0.1.0.vsix`, uploaded as a CI artifact. `PRIVACY.md` written.

**Key decisions.** D-026 (either surface may complete a session), D-027 (pure focus machine and
notification budget), D-029 (activation tested with a stub).

**What was hard.** Being useful without being creepy. The extension could know far more than it
does; we chose one boolean (window focus) and made the code that interprets it a pure function
small enough to read in a minute. The second hard part was two writers: the CLI and the extension
both finish sessions, so the reducer's "no active session → ignore" rule (D-011) is what keeps them
from double-feeding the pet.

**Tests / coverage.** 12 tests for the extension: the focus state machine (grace period, return
detection, single nudge, session start while unfocused, resets), the notification budget, status
bar/menu/den rendering, and a full activation run against the `vscode` stub. Workspace total: 133
tests passing.

**Deferred.** Publishing to the VS Code Marketplace and Open VSX (steps in RUNBOOK.md). An extension
icon. Testing inside a real VS Code instance in CI.

**Founder's comment.** The editor is where focus actually happens, so it is where a gentle companion
earns the most trust — or loses it. We designed the extension so we can say, truthfully and
checkably, that it never looks at your code. That promise is part of the product: privacy-by-design
is what lets a developer leave Daemonling running all day without a second thought.

## M4 — Web home (2026-11-03)

**What was built.** `apps/web`: a React 19 + Vite PWA that works fully offline from an IndexedDB
store. Screens: **Den** (animated SVG pet whose mood follows its condition — bob, sleepy, sad,
sick shiver, cocoon, dance — plus meters, speech and actions), **Focus** (25/50/90 presets, optional
task, live countdown, honest stop, break logging; completes the session when the timer hits zero),
**Stats** (plain-SVG week bars with a goal line, streak/freeze/XP facts, species progress from
weighted traits), **Journal** (the weekly letter plus recent moments), **Settings** (name, goal,
bedtime/wake, time zone, vacation, light/dark/system theme, export/import JSON, start over).
Warm light and dark palettes, mobile-first bottom tab bar, 44 px touch targets,
`prefers-reduced-motion` honoured. Manifest, SVG icons and a hand-written service worker.
`.github/workflows/pages.yml` deploys `apps/web/dist` once Pages is enabled.

**Key decisions.** D-030 (hand-written service worker), D-031 (browser keeps its own pet; JSON
export/import bridges devices), D-033 (no router or chart library).

**What was hard.** Accessibility details that tests do not catch. An axe-core audit in headless
Chromium found real issues on the first pass — the selected-tab colour missed AA contrast in light
mode, `role="tablist"` on `<nav>` erased the navigation landmark, and `role="tabpanel"` on `<main>`
was invalid. All fixed; the audit now reports zero violations on every screen in both themes. A
subtler bug: the timer briefly showed 25:01 because the reducer clamps a session's start forward
when the UI clock lags the last event by a few hundred milliseconds; the view now clamps too.

**Tests / coverage.** 11 web tests: `timerView` (idle, countdown, done, clamping), the `<Focus>`
component (start with preset and task, honest stop, auto-complete, break), den state mapping for
every mood, `<Den>` rendering and petting, species shares, and a full `<App>` run over
`fake-indexeddb` (hatch → focus → honest stop → every tab → keyboard tab navigation → settings
validation → vacation → theme → start over). Production build: 87 KB gzipped JS.

**Deferred.** Notifications in the browser (deliberately off for now). PNG icons for older
platforms. A visual-regression baseline.

**Founder's comment.** The web home is how most people will meet their daemon for the first time —
no install, one link, a warm little room where an egg is waiting. It is also our promise made
visible: a footer that says "your pet lives only in this browser" is only credible if the app works
with the network cable pulled out, and it does. Getting accessibility right from day one matters to
us; a companion meant to make work kinder should be usable by everyone.

## M5 — Developer-native extras (2026-11-03)

**What was built.** Most extras landed with the CLI in M2 and are now finished and documented:

- **README card:** `renderCard(state)` produces a self-contained SVG (pet, name, species, stage,
  streak, condition, satiety/mood bars, "fed by focus" footer, light/dark via
  `prefers-color-scheme`). `dmn badge` writes it; new `dmn badge --from <export.json>` renders from
  an export for CI. `docs/README-CARD.md` explains embedding in a profile README and includes a
  GitHub Actions workflow. Example art in `docs/assets/` (card, the five species, all moods).
- **Commit treats:** `dmn hook install|uninstall` manages a marked block in `.git/hooks/post-commit`
  (preserving any existing hook) that runs `dmn event commit`; commits only count during an active
  session (max 10/day).
- **Rubber-duck mode:** `dmn duck` — 16 keyword rules plus 5 fallbacks, no repeats, and a summary of
  what you said. Fully offline.
- **Weekly journal:** in `dmn journal` and the web Journal tab.
- Art polish: sad and sick expressions redrawn (D-036).

**Key decisions.** D-035 (badge from export), D-036 (expressions), D-037 (duck never gated).

**What was hard.** Keeping the card truly self-contained: GitHub serves README SVGs through an image
proxy that blocks external resources and scripts, so everything (palette, fonts, theme switching)
has to live inside one file and still look right in both themes.

**Tests / coverage.** Card validity (parses as XML via DOMParser, contains the escaped name,
species, stage and footer, no external URLs), duck question selection and summaries, hook
install/uninstall/idempotence in a temporary git repository, and `badge --from`. Workspace: 143
tests passing.

**Deferred.** npm publication of the CLI (then the Actions snippet shrinks to one `npx` line).
BYO-LLM duck (roadmap).

**Founder's comment.** These are the features that make Daemonling feel like it was built by
developers for developers: it notices commits, it celebrates green builds, it sits in your profile
README, and it listens when you are stuck. Each one is small, but together they turn a cute pet into
something that belongs in a developer's workflow — and every one of them works without sending a
single byte off your machine.

## M6 — Document pack (2026-11-03)

**What was built.** The full founder pack, written against the code: `README.md`, `docs/GUIDE.md`,
`docs/GAME_DESIGN.md` (every rule and constant in tables, evolution matrix, Mermaid condition
diagram, beta tuning plan), `docs/ARCHITECTURE.md` (package and event-sourcing diagrams, store
format, CLI/VS Code concurrency, future server-ordered sync, threat model), `docs/RUNBOOK.md`,
`docs/ROADMAP.md` (phases with gates, 12-feature backlog with shipped markers, Mermaid gantt),
`docs/PRODUCT_SPEC.md`, `docs/PITCH.md` + `docs/pitch/deck.html` (10 slides, arrow keys, `N` for
notes, prints to PDF), `docs/DUE_DILIGENCE.md` (YC answers + 30 investor questions),
`docs/PORTFOLIO.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`. Example art and screenshots
live in `docs/assets/`. Also: the CLI package is now self-contained for npm (D-038).

**Key decisions.** D-038 (self-contained CLI package), D-040 (market claims discipline), D-041
(deck generated from our renderer).

**What was hard.** Writing persuasive documents without inventing anything. Every market number had
to come from the provided sources with links and an "estimate" label, and every product claim had
to be checked against the code (for example, the guide's prompt examples, the command list, and the
exact rule numbers in GAME_DESIGN.md come straight from `config.ts`).

**Tests / coverage.** No code-path changes beyond the CLI packaging; the suite stays green (143
tests). The deck was verified in headless Chromium: navigation, notes toggle, no page errors, and a
10-page PDF.

**Deferred.** Real traction numbers, founder details and quotes — all marked as placeholders.

**Founder's comment.** A company is a story that the code has to keep true. These documents are how
we will recruit beta users, contributors and investors, so they had to be both warm and rigorous: a
user guide that a tired developer can skim, a game design document a contributor can tune from, and
a pitch that tells the truth about being pre-launch. Writing them also forced us to re-check every
promise — which is exactly what a founder should do before asking anyone for their time or money.
