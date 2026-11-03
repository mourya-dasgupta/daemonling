# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-11-03

First open-core MVP.

### Added

- **Engine (`@daemonling/core`):** pure, event-sourced pet simulation — decay over awake hours in
  the user's time zone, sessions, honest vs. silent stops, editor distraction penalties, breaks,
  burnout guardian, commit treats and CI celebrations, hunger and health (floor 10), petting,
  vacation, settings, conditions, hibernation and wake-up, streaks with earned freezes, tricks, life
  stages, evolution into five species (owlbyte, sprintail, zenpaca, shipwyrm, nocturne), the pet's
  voice, weekly journal, week stats and the rubber-duck question picker.
- **Store (`@daemonling/store`):** versioned JSONL event log with a v1 → v2 migration, cached
  snapshots, lock-file concurrency and atomic writes (Node), an IndexedDB adapter (browser), and
  export/import.
- **Sprites (`@daemonling/sprites`):** original ASCII frames for eight moods with species accents,
  an SVG pet renderer with CSS-variable theming and reduced-motion support, and a README card.
- **CLI (`dmn`):** `init`, `start` (animated countdown, Ctrl+C honesty prompt), `status`, `pet`,
  `break`, `distracted`, `vacation`, `settings`, `stats [--week]`, `journal`, `duck`,
  `badge [--from]`, `hook install|uninstall`, `event commit|ci-passed`, `prompt`, `export`,
  `import`.
- **VS Code extension:** status-bar pet and session timer, quick-pick actions, privacy-first focus
  sensing (window focus only), "Open Den" webview, settings, `.vsix` packaging in CI.
- **Web home:** offline React PWA with Den, Focus, Stats, Journal and Settings; light/dark themes;
  accessible (axe audit clean); GitHub Pages workflow.
- **Docs:** user guide, game design, architecture, runbook, roadmap, product spec, pitch and HTML
  deck, due diligence, portfolio case study, privacy promise, security policy, contributing guide,
  decision log and build log.
