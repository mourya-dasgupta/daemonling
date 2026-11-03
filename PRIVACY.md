# The Daemonling Privacy Promise

Daemonling is local-first. Your pet lives on your machine, and so does everything it knows about
you. This promise covers every part of this repository: the `dmn` CLI, the VS Code extension and
the web app.

## The short version

- **No accounts, no servers, no telemetry, no analytics, no ads.** Nothing in Daemonling makes a
  network request at runtime. (The web app is a static site; once loaded, it runs offline from your
  browser cache.)
- **No content, ever.** We never read your code, documents, file names, window titles, keystrokes,
  clipboard or browsing history.
- **You own the data.** It is a plain text file you can read, export, back up or delete.
- **We never sell data**, and we will never charge you to revive or "rescue" your pet. It cannot
  die: if neglected it hibernates in a cocoon and wakes up when you come back.

## What is stored, and where

| Surface      | Location                                             | Contents                                                                                             |
| ------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| CLI, VS Code | `~/.daemonling/` (or `$DAEMONLING_HOME`)             | `events.jsonl` (the event log), `snapshot.json` (cached pet state), a short-lived `events.lock` file |
| Web app      | Your browser's IndexedDB for the site (`daemonling`) | The same events and snapshot                                                                         |
| VS Code      | VS Code's extension global state                     | A counter of notifications shown today (to keep the limit of two per day)                            |

The event log contains only:

- **Timestamps** of events (session started/completed/stopped, break taken, pet petted, settings
  changed, vacation on/off, commit made, CI passed).
- **Numbers**: planned and completed minutes, break minutes, seconds spent away from the editor.
- **Your pet's name, your settings** (daily goal, bedtime, wake hour, grace period, time zone).
- **Optional free text you type yourself**: a session task label (`dmn start --task "…"`).
- **Optional commit hashes** from the git hook (`dmn event commit --sha …`). Never commit messages,
  diffs or file names.

## How editor focus sensing works

While a focus session is running, the VS Code extension listens to exactly one signal:
`window.state.focused` — whether a VS Code window has focus. It records **when** focus was lost and
regained and **how many** times. If you were away longer than the grace period
(`daemonling.graceSeconds`, default 90 seconds), it records one `DISTRACTION_DETECTED` event with the
number of seconds away. After five minutes away it may show one non-modal notification offering to
end the session honestly.

It does **not** look at which documents are open, what you type, which application you switched to,
or anything else. Outside a session it records nothing. The logic is a small pure function
(`apps/vscode/src/focus.ts`) with tests, so you can verify this claim.

## Notifications

At most **two unsolicited notifications per day** (for example, the "you've been away" nudge). The
pet never nags, guilt-trips or sends emails, and there are no push notifications.

## Deleting everything

- CLI / VS Code: delete the `~/.daemonling` folder (or `$DAEMONLING_HOME`).
- Web app: Settings → "Start over", or clear the site's data in your browser.

Use `dmn export` (or the web app's export button) first if you want a backup.

## Future features

If we ever offer optional sync (see `docs/ROADMAP.md`), it will be opt-in, will sync only the event
log described above, and this document will be updated before it ships.

_Last updated: 3 November 2026 (version 0.1.0)._
