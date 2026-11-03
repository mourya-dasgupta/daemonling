# Pitch

> All revenue and download figures below are **third-party estimates** from the linked sources.
> Founder-specific facts are `[placeholders]`. We have no users yet: traction is `[TBD after beta]`.

## Narrative (YC style)

**Daemonling is a tiny virtual pet that lives in a solo developer's terminal, editor and browser,
and stays healthy only when its owner does focused, balanced work.**

Solo developers — indie hackers, freelancers, student builders — have nobody to work alongside.
Focus erodes quietly and overwork is invisible until it becomes burnout. The tools they have either
measure minutes (timers) or measure them (trackers). Neither makes them _care_.

Our insight is that **responsibility beats reward**. People protect something small that depends on
them more reliably than they chase points. Focus pets have already proven this with consumers:
Focus Friend reached #1 on the US App Store in August 2025
([Appfigures](https://appfigures.com/resources/insights/20250905/1-the-app-that-dethroned-chatgpt-isnt-what-youd-expect))
and Forest has about 48 million Google Play downloads
([AppBrain](https://www.appbrain.com/app/forest-focus-for-productivity/cc.forestapp)). But
developers do not live on their phones during work; they live in the terminal and the editor. And
unlike everyone else, **developers already emit focus signals** — sessions, commits, green CI runs,
editor focus — so a pet can be cared for without any manual logging.

We also believe **overwork is a form of neglect**. Daemonling's pet gets tired after three hours
without a break and after late nights, rewards real breaks, and never dies — a week away turns it
into a cocoon that wakes when you return. Honesty pays: telling it you got distracted earns more
than quietly quitting.

The MVP is built and open source: a pure, event-sourced engine with 100% line coverage, a `dmn`
CLI, a VS Code extension, an offline web home and a README card. It is local-first: no accounts, no
telemetry, no network calls. We will make money with **Pro** ($5/month or $39/year: extra species,
cosmetics, opt-in sync, co-focus dens, insights) and later **Teams** ($4/seat/month), with no ads,
no data sales and no paid revival. Our north-star metric is **Weekly Fed Pets**: pets with at least
three completed sessions in a week.

## Slides

### 1. Title

**Daemonling — a tiny daemon that lives on your focus.**
A virtual pet for solo developers, in the terminal, VS Code and the browser.

> _Speaker notes:_ "I'm `[founder name]`. Daemonling is a tiny creature that lives where developers
> work, and it only thrives when its owner does focused, balanced work. Let me show you why that
> matters."

### 2. Problem

- Solo developers have no manager, standup or team rhythm.
- Focus erodes quietly; overwork is invisible until it hurts.
- Timers count minutes; trackers feel like surveillance. Neither makes you care.

> _Speaker notes:_ Describe the persona: an indie hacker building at night after a day job, a
> freelancer juggling three codebases, a student shipping a side project. They all know what they
> should do; the missing piece is a reason to care today. `[Add one real beta interview quote here
once we have it.]`

### 3. Insight

1. **Responsibility beats reward** — people protect what depends on them.
2. **Developers already emit focus signals** — sessions, commits, CI, editor focus.
3. **Overwork is also neglect** — a caring pet should get tired, not just hungry.

> _Speaker notes:_ Consumer focus pets prove point 1. Point 2 is our wedge: no other audience can
> feed a pet with data they already produce, without extra logging. Point 3 is our ethics: we
> reward balance, not maximum minutes.

### 4. Demo

```
$ dmn start 25 --task "parser"
     *     *
     \   /
   .-'"""'-.
  (  ^   ^  )
  (   \_/   )
   '-.___.-'~~>
   24:59 left
```

Status-bar pet in VS Code → honest stop → weekly journal → README card.

> _Speaker notes:_ Live: `dmn init`, `dmn start`, switch away from VS Code for two minutes, come
> back, show the gentle distraction note, stop honestly, show `dmn journal`, then the README card on
> a GitHub profile. Keep it under 90 seconds.

### 5. Why now

- Focus pets went mainstream: Focus Friend hit #1 on the US App Store (Aug 2025) with an estimated
  ~$370K net revenue in that period, then fell to #48 within two weeks
  ([Appfigures](https://appfigures.com/resources/insights/20250905/1-the-app-that-dethroned-chatgpt-isnt-what-youd-expect));
  ~1.4M downloads by early 2026 ([Foundry](https://www.builtbyfoundry.io/blog/hank-green-focus-friend-app)).
- Self-care pets monetise: Finch is estimated at ~$1M monthly revenue, Finch Plus ~$40/year
  ([Adapty](https://adapty.io/paywall-library/finch/)).
- Developers are a large, growing audience: GitHub reports 180M+ developers, 36M+ new in one year
  ([Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)).
- Developers want companions in their tools: vscode-pets, a decorative editor pet, has ~3.5K
  GitHub stars ([repo](https://github.com/tonybaloney/vscode-pets)).

> _Speaker notes:_ The Focus Friend curve is both validation and warning: novelty spikes, retention
> is the game. Our answer is embedding in the daily workflow (terminal, editor, git) rather than a
> phone app you must remember to open. All figures are third-party estimates.

### 6. Product

| Surface   | What it does                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| `dmn` CLI | Sessions with an animated countdown, honest stops, stats, journal, rubber duck, README card, git commit treats, prompt line |
| VS Code   | Status-bar pet and timer, den webview, privacy-first focus sensing (window focus only)                                      |
| Web       | Offline PWA den with focus timer, stats, journal, settings                                                                  |
| Engine    | Pure, event-sourced, deterministic; five species shaped by work style; never dies                                           |

> _Speaker notes:_ Emphasise local-first and the event log: it makes the product trustworthy now
> and makes sync straightforward later.

### 7. Market

- 47.2M active software developers (SlashData 2025); India alone has 21.9M GitHub developers
  ([source](https://voxbooster.com/blog/developer-survey-statistics-2026)).
- Comparable consumer focus/self-care pets: Forest (~48M Google Play downloads; highest iOS monthly
  revenue since 2021 about $400K — [36Kr](https://eu.36kr.com/de/p/3432666329124482)), Finch (~$1M
  monthly revenue, estimated).
- Wedge: solo developers → students and freelancers → small teams.

> _Speaker notes:_ We are not claiming a share of these numbers; they size the audience and show
> that people pay for caring-for-a-creature products. Illustrative arithmetic on our own pricing:
> every 10,000 Pro subscribers on annual plans is ~$390K ARR. Real conversion data: `[TBD after beta]`.

### 8. Business model

| Plan  | Price                 | Includes                                                                                      |
| ----- | --------------------- | --------------------------------------------------------------------------------------------- |
| Free  | $0                    | One pet and the full loop: sessions, streaks, tricks, evolution, CLI/VS Code/web, README card |
| Pro   | $5/month or $39/year  | Extra species, cosmetics, opt-in sync, co-focus dens, insights                                |
| Teams | $4/seat/month (later) | Team office pet and shared dens — never individual surveillance                               |

**Never:** ads, data sales, paid revival, paid streak repair. **North star:** Weekly Fed Pets (pets
with ≥ 3 completed sessions in a week).

> _Speaker notes:_ The free tier must be genuinely complete — that is how a developer tool spreads.
> Pro sells delight and convenience, not relief from guilt.

### 9. Traction

`[TBD after beta]` — Weekly Fed Pets, D7 retention (gate ≥ 30%), README cards in the wild, GitHub
stars, extension installs.

What exists today: the open-source MVP (engine, CLI, VS Code extension, web home), green CI, and the
founder document pack.

> _Speaker notes:_ Be explicit that we are pre-launch. Show the build log and test coverage as
> evidence of execution speed and quality.

### 10. Team & ask

- `[Founder name]` — `[background, relevant experience, why this problem]`.
- `[Advisors / early supporters]`.
- **Ask:** `[amount]` to run the beta, publish to npm/Marketplace/Open VSX, build sync and co-focus
  dens, and reach the 4% Pro conversion gate. `[Use of funds split]`.

> _Speaker notes:_ Close on the mission: a kinder way to do focused work, built by developers for
> developers, that never sells your data or your guilt.

## Ethics

Daemonling's ethics are part of the pitch because they are part of the product:

- **The pet never dies** — neglect means a cocoon; coming back is celebrated.
- **Empathetic copy** — no shaming, guilt-tripping or nagging.
- **Balance over maximum minutes** — overwork and late nights tire the pet; breaks are rewarded.
- **Never sell recovery** — no paid revival or streak repair.
- **Local-first data** — nothing leaves the device unless the user opts into sync.
- **Earned streak freezes** — one per 7-day streak, at most two banked, never for sale.
- **At most two notifications per day.**

A slide-ready version of this pitch is in [`docs/pitch/deck.html`](pitch/deck.html).
