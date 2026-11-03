# Contributing

Thank you for helping your fellow developers' daemons thrive!

## Setup

```bash
corepack enable
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Requires Node.js 22 (≥ 20 works) and pnpm 10. See [docs/RUNBOOK.md](docs/RUNBOOK.md) for every
script.

## Workflow

1. Open an issue first for anything bigger than a small fix, so we can agree on the approach.
2. Branch from `main`; use [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat(core): …`, `fix(cli): …`, `docs: …`).
3. Add or update tests. `packages/core` must stay at ≥ 90% line and branch coverage (CI enforces
   it); every game rule needs a test.
4. Run `pnpm ci` (lint, typecheck, test, build) and `pnpm format` before pushing.
5. Record non-obvious decisions in [docs/DECISIONS.md](docs/DECISIONS.md) and user-visible changes in
   [CHANGELOG.md](CHANGELOG.md).

## Ground rules

- **Keep the engine pure.** No `Date.now()`, randomness or I/O in `packages/core`; time comes from
  event timestamps. Put every tunable number in `packages/core/src/config.ts`.
- **Keep the privacy promise.** No telemetry, no network calls at runtime, never read code, file
  names or keystrokes. Changes that touch data must update [PRIVACY.md](PRIVACY.md).
- **Keep it kind.** The pet never dies, copy never shames, recovery is never sold, at most two
  unsolicited notifications per day.
- **Original art only.** No copyrighted characters, logos or third-party assets; do not use other
  virtual-pet trademarks in names, code or copy.
- **TypeScript strict.** No `any` without a comment explaining why. JSDoc on public APIs.
- **Stored data is forever.** Changing the event record shape needs a read-time migration and tests.

## Code of conduct

Be kind and assume good intent. Harassment or discrimination is not tolerated; maintainers may
remove content or contributors that violate this.
