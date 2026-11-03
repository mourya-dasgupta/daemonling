# Product spec — Daemonling 0.1 (open-core MVP)

**One line:** a tiny virtual creature that lives in a solo developer's terminal, editor and browser,
and stays healthy only when its owner does focused, balanced work.

**Problem.** Solo developers have no manager, no standup and no team rhythm. Focus erodes quietly,
overwork is invisible until it hurts, and generic productivity apps feel like surveillance or
homework. Timers measure minutes but do not make you _care_.

**Bet.** Responsibility beats reward. People will protect something small that depends on them
more reliably than they will chase points — and developers already emit the signals (sessions,
commits, CI, editor focus) needed to care for it, without any extra logging.

## Personas

| Persona               | Context                                                          | What they want                                   | What they fear                                              |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| **Solo indie hacker** | Building a product alone, evenings and weekends, ships in bursts | Steady progress, a reason to sit down daily      | Burnout, losing weeks to context-switching                  |
| **Freelancer**        | Several client codebases, billable hours, self-managed schedule  | Protected deep-work blocks, healthy boundaries   | Overwork, late nights, tracking that feels like a timesheet |
| **Student builder**   | Learning to code, side projects, hackathons, irregular schedule  | Motivation that survives a missed week, some fun | Streak-shame, apps that punish being human                  |

## Jobs to be done

1. _When I sit down to code,_ I want a frictionless way to start a focused block, _so that_ I
   actually go deep instead of drifting.
2. _When I drift or stop early,_ I want to own it without being punished for honesty, _so that_ I
   stay truthful with myself.
3. _When I have been working for hours,_ I want a gentle nudge to take a real break, _so that_ I do
   not burn out.
4. _When I come back after time away,_ I want a warm welcome rather than a broken streak and guilt,
   _so that_ I return at all.
5. _When I look back on my week,_ I want a short, kind summary of what I did, _so that_ progress
   feels real.
6. _When I am stuck,_ I want something to talk the problem through with, _so that_ I unblock myself.
7. _When I show my work,_ I want a small, personal way to share my habit, _so that_ it feels like
   part of my developer identity.

## Feature specs (as built in 0.1)

| Feature            | Surfaces          | Behaviour                                                                                            | Acceptance (tested)                            |
| ------------------ | ----------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Pet lifecycle      | all               | Egg → hatchling (3 sessions) → juvenile (300 xp) → adult (1500 xp, 14 days) → elder (90 days)        | Stage tests; 60-day persona simulation         |
| Focus sessions     | CLI, VS Code, web | Start with presets (25/50/90 or any 1–240), live countdown, completion feeds the pet                 | CLI integration test; web `<Focus>` tests      |
| Honest stop        | all               | "I got distracted" ends a session with a smaller penalty and more XP than a silent quit              | Honesty-pays grid test                         |
| Focus sensing      | VS Code           | Only window focus; away > grace → distraction; away > 5 min → one non-modal offer to end honestly    | Pure state-machine tests; activation test      |
| Burnout guardian   | engine            | > 180 min without a break → yawn (energy/mood cost); late sessions cost energy; breaks restore       | Overwork and break tests                       |
| Streaks + freezes  | engine            | Daily goal in the user's time zone; freezes earned every 7 days (max 2); vacation-safe               | Streak tests incl. DST/half-hour zones         |
| Tricks             | engine            | Unlocked at streak 3/7/14/21/30 and bond 50; never removed                                           | Trick tests                                    |
| Evolution          | engine            | Species from dominant weighted work trait at adulthood                                               | Evolution + persona tests (all 5 species)      |
| Hibernation        | engine            | 7 days idle → cocoon (decay stops); 2 sessions in 48 h → wake (+20 mood), no penalty                 | Hibernation tests                              |
| Vacation           | CLI, web          | Pauses decay, streak, hibernation and hunger                                                         | Vacation tests                                 |
| Commit treats / CI | CLI               | Post-commit hook; commits count only during a session (max 10/day); `dmn event ci-passed` celebrates | Hook tests in a temp repo; commit rule tests   |
| Rubber duck        | CLI               | Keyword-driven debugging questions, no repeats, summary at the end                                   | Duck tests                                     |
| Weekly journal     | CLI, web          | 4–8 warm sentences in the pet's voice from the week's numbers                                        | Journal tests (incl. tone check)               |
| README card        | CLI               | Self-contained SVG; light/dark; renders from local pet or an export                                  | Card XML validity tests                        |
| Shell prompt       | CLI               | `dmn prompt` one-liner from the cached snapshot                                                      | CLI test; measured ~10 ms over Node start-up   |
| Data portability   | CLI, web          | Export/import JSON; CLI backs up the old log                                                         | Export/import tests                            |
| Web home           | web               | Offline PWA: Den, Focus, Stats, Journal, Settings; light/dark; keyboard and screen-reader friendly   | Component + app tests; axe audit: 0 violations |

## Non-goals (for 0.1)

- **No accounts, cloud sync, leaderboards or social feeds.** Local-first first; sync is a later,
  opt-in Pro feature.
- **No time tracking or reporting for employers.** Daemonling is for the developer, not about them.
- **No content analysis.** We will never read code, files, window titles or keystrokes.
- **No LLM features in the MVP.** "Bring your own LLM" for the rubber duck is a roadmap item.
- **No mobile apps yet.** The PWA works on phones; native apps come later.
- **No monetisation in 0.1.** Pricing is defined for later (see PITCH.md); nothing is paywalled now.
- **No pet death, paid revival or loot boxes. Ever.**

## Ethics

These are product requirements, not marketing:

1. **The pet never dies.** Neglect leads to a cocoon; returning wakes it with no penalty.
2. **Empathetic copy.** The pet never shames, guilt-trips or nags ("No rush. It will be right
   here."). A test checks the weekly journal for guilt words.
3. **Balance is rewarded over maximum minutes.** Overwork and late nights cost energy; breaks are a
   trait that shapes evolution.
4. **Never sell recovery.** No paid revival, paid freezes or paid streak repair.
5. **Local-first data.** Nothing leaves the device; the log is readable, exportable and deletable.
6. **Earned streak freezes.** One per 7-day streak, max two banked. Never purchasable.
7. **At most two notifications per day.** Unsolicited nudges are budgeted in code.

## Success metrics

- **North star: Weekly Fed Pets** — pets with ≥ 3 completed sessions in a week.
- Beta gate: **D7 retention ≥ 30%** (see ROADMAP.md).
- Guardrails: share of users who report the pet "made me feel guilty" (target: near zero); share of
  sessions ended honestly vs. abandoned (honesty should rise over time).

Measurement during the beta is via opt-in surveys and voluntarily shared exports — the product
itself contains no telemetry. Actual numbers: `[TBD after beta]`.
