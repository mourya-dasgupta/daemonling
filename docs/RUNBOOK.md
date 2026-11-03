# Runbook

Engineering and operations guide for Daemonling 0.1.x. Daemonling has no servers, so "operations"
means building, releasing, and helping users with their local data.

## Prerequisites

| Tool    | Version             | Notes                                                       |
| ------- | ------------------- | ----------------------------------------------------------- |
| Node.js | 22 LTS (≥ 20 works) | `.nvmrc` pins 22                                            |
| pnpm    | 10.x                | `corepack enable` (the version is pinned in `package.json`) |
| git     | any recent          | Hook tests create temporary repositories                    |
| VS Code | ≥ 1.95 (optional)   | To try the `.vsix`                                          |

## Setup

```bash
git clone https://github.com/mourya-dasgupta/daemonling && cd daemonling
corepack enable
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Scripts

| Command (repo root)                       | What it does                                                     |
| ----------------------------------------- | ---------------------------------------------------------------- |
| `pnpm lint`                               | ESLint (flat config), zero warnings allowed                      |
| `pnpm format` / `pnpm format:check`       | Prettier write / check                                           |
| `pnpm typecheck`                          | `tsc --noEmit` in every package                                  |
| `pnpm test`                               | Vitest across all projects with V8 coverage; fails if core < 90% |
| `pnpm test:watch`                         | Vitest watch mode                                                |
| `pnpm build`                              | Builds every package in dependency order                         |
| `pnpm ci`                                 | lint + typecheck + test + build                                  |
| `pnpm --filter daemonling build`          | Bundle the CLI to `apps/cli/dist/dmn.js`                         |
| `pnpm --filter daemonling-vscode package` | Build `apps/vscode/daemonling-0.1.0.vsix`                        |
| `pnpm --filter web build` / `preview`     | Build / locally preview the web app                              |

## Testing

- Unit and integration tests live next to each package in `test/`. Run one project with
  `npx vitest run --project @daemonling/core` (projects: `@daemonling/core`, `@daemonling/store`,
  `@daemonling/sprites`, `daemonling` (CLI), `daemonling-vscode`, `web`).
- `packages/core/test/simulation.test.ts` replays 60 days for five personas; run it after any
  constant change.
- CLI tests drive the real command tree with a fake clock in a temporary `DAEMONLING_HOME`; the
  hidden `dmn start --test-duration-ms <ms>` flag shortens a session to real milliseconds.
- The VS Code extension is tested with an in-memory `vscode` stub (`apps/vscode/test/vscode-stub.ts`).
- Web tests use Testing Library in jsdom with `fake-indexeddb`.
- Coverage reports are written to `coverage/` (`lcov`, `json-summary`) and uploaded by CI.

## Releasing the CLI to npm (steps — not yet executed)

1. Make sure `main` is green and `CHANGELOG.md` has the new version.
2. Bump versions consistently: `apps/cli/package.json`, `VERSION` in `apps/cli/src/program.ts`,
   and the package/extension versions you are releasing.
3. `pnpm install --frozen-lockfile && pnpm ci`.
4. Check the tarball: `cd apps/cli && npm pack --dry-run`. It should contain only `dist/` and
   `package.json`.
5. The CLI's workspace packages and `commander` are `devDependencies` because esbuild bundles them
   into `dist/`, so the published package has no runtime dependencies. Verify with a clean install:
   `npm i -g ./daemonling-<version>.tgz && dmn --version`.
6. `npm publish --access public` (requires the npm account and 2FA).
7. Tag: `git tag cli-v<version> && git push --tags`; create a GitHub release from the changelog.

## Packaging and publishing the VS Code extension (steps — not yet executed)

1. Build: `pnpm --filter daemonling-vscode package` → `apps/vscode/daemonling-<version>.vsix` (CI
   uploads this as the `daemonling-vsix` artifact on every run).
2. Smoke test: `code --install-extension apps/vscode/daemonling-<version>.vsix`, then run
   "Daemonling: Hatch a Daemon", start a session, switch windows for > 90 s, return, and check
   `~/.daemonling/events.jsonl` for `DISTRACTION_DETECTED`.
3. Add a 128×128 PNG `icon` to `apps/vscode/package.json` (Marketplace requirement for a good
   listing) and confirm the `publisher` id.
4. VS Code Marketplace: create the publisher in Azure DevOps, create a PAT with Marketplace
   (Manage) scope, then `npx @vscode/vsce login <publisher>` and
   `npx @vscode/vsce publish --no-dependencies --packagePath apps/vscode/daemonling-<version>.vsix`.
5. Open VSX: `npx ovsx create-namespace <publisher> -p <token>` (first time), then
   `npx ovsx publish apps/vscode/daemonling-<version>.vsix -p <token>`.

## Deploying the web app to GitHub Pages

`.github/workflows/pages.yml` builds `apps/web` and deploys `apps/web/dist` on every push to `main`
(or manually via "Run workflow").

1. In GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main` (or run the workflow). The URL appears in the workflow's `deploy` job and under
   Settings → Pages.
3. Until Pages is enabled, the workflow's deploy step fails — that is expected and harmless.

The build uses a relative base (`./`), so it works under `/<repo>/` without configuration. The
service worker caches the shell; after a deploy, users get the new version on their next visit
(or after closing all tabs).

## Data locations, backup and restore

| Surface      | Location                                                                         |
| ------------ | -------------------------------------------------------------------------------- |
| CLI, VS Code | `~/.daemonling/` (`%USERPROFILE%\.daemonling` on Windows), or `$DAEMONLING_HOME` |
| Web          | Browser IndexedDB database `daemonling` for the site's origin                    |

Backup: `dmn export --out daemonling-backup.json` (or web Settings → Export JSON), or copy
`~/.daemonling/events.jsonl`.

Restore: `dmn import daemonling-backup.json` (asks before replacing; keeps the old log as
`events.jsonl.bak-<timestamp>`), or web Settings → Import JSON.

## Recovering a corrupted snapshot

The snapshot is only a cache; the log is the truth.

```bash
mv ~/.daemonling/snapshot.json ~/.daemonling/snapshot.json.broken
dmn status        # replays events.jsonl and writes a fresh snapshot on the next write
```

Readers already ignore unreadable snapshots automatically. If `events.jsonl` itself has a damaged
line (for example a torn final write after a power cut), that line is skipped and everything else
loads. To inspect: `tail -n 5 ~/.daemonling/events.jsonl`; remove the broken line with a text
editor after making a copy.

## Troubleshooting

| Symptom                                                   | Likely cause                                                                      | Fix                                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `No pet yet. Run dmn init to hatch one.`                  | Empty or different `DAEMONLING_HOME`                                              | `dmn init`, or unset/check `DAEMONLING_HOME`                                              |
| `Daemonling's data is busy (lock held …)`                 | Another writer, or a crash left `events.lock`                                     | Wait; if nothing is running, delete `~/.daemonling/events.lock` (stale after 10 s anyway) |
| VS Code status bar not updating after a CLI command       | Extension not active or hidden                                                    | Check `daemonling.showInStatusBar`; run "Daemonling: Show Menu"                           |
| Commits never count                                       | No session running, hook not installed, or `dmn` not on PATH in git's environment | `dmn hook install`; start a session; make `dmn` available on PATH                         |
| Streak reset unexpectedly                                 | Missed a day without a freeze, or time zone changed                               | `dmn settings --timezone <zone>`; consider vacation mode for planned breaks               |
| `Dynamic require of "node:events" is not supported` (CLI) | Old/custom bundle without the `createRequire` banner                              | Rebuild with `pnpm --filter daemonling build`                                             |
| Web app shows an old version                              | Service worker cache                                                              | Close all tabs and reopen, or hard-reload                                                 |
| Web app: "IndexedDB is not available"                     | Private mode in some browsers                                                     | Use a normal window                                                                       |

## Incident checklist

Daemonling has no backend, so incidents are bad releases or data-handling bugs.

1. **Assess:** which surface and version? Is user data at risk (loss, corruption, privacy)?
2. **Stop the bleeding:** unpublish/deprecate the npm version (`npm deprecate daemonling@<v> "<why>"`),
   unpublish the extension version, or revert the Pages deploy (re-run the workflow on the last good
   commit).
3. **Protect data:** tell users how to back up (`dmn export`) before upgrading again. Never ship a
   fix that rewrites `events.jsonl` in place; migrations must be read-time.
4. **Fix forward** with a test that reproduces the issue; for rule bugs, remember replay fixes
   existing pets automatically.
5. **Communicate:** GitHub release notes and an issue describing impact, fix and any user action.
6. **Learn:** add an entry to `docs/DECISIONS.md` and, if relevant, a test to the persona simulation.

Privacy-related reports follow [SECURITY.md](../SECURITY.md).

## Versioning policy

- **Semantic Versioning** for the CLI, extension and packages. Until 1.0, minor versions may change
  game balance; patch versions only fix bugs.
- **Event record version** (`EVENT_SCHEMA_VERSION`, currently 2): bump only when the stored record
  shape changes, always with a read-time migration and tests. Old logs must always load.
- **State schema version** (`CONFIG.stateSchemaVersion`): bump when `PetState` changes shape; this
  invalidates snapshots and forces a replay — no data migration needed.
- **Balance changes** (constants in `config.ts`) apply retroactively by replay; call them out in
  `CHANGELOG.md`.
