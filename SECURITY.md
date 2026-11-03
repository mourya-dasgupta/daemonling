# Security policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a vulnerability

Please **do not open a public issue** for security or privacy problems. Instead, use GitHub's
private vulnerability reporting for this repository (**Security → Report a vulnerability**), or
email `[security contact email]`.

Include what you found, how to reproduce it, and the impact you expect. We aim to acknowledge
reports within 3 working days and to ship a fix or mitigation within 30 days for confirmed issues.
We are happy to credit reporters in the release notes.

## Scope

In scope: anything that could leak user data off the device, read content Daemonling promises not to
read (code, file names, keystrokes), corrupt or lose the event log, execute unexpected code (for
example through the git hook, an import file, the VS Code webview or the web app), or bypass the
notification budget.

Daemonling has no servers, accounts or telemetry, so there is no hosted service in scope today.

## Design notes

- No network calls at runtime; the web service worker only serves the site's own files.
- Pet names are escaped in all generated SVG/HTML; the VS Code webview uses a strict CSP with a
  per-render script nonce.
- Import files are validated per event type; the previous log is backed up before replacement.
- The git hook block is static and never fails a commit.
- See [PRIVACY.md](PRIVACY.md) and the threat model in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
