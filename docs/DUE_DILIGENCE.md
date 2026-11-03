# Due diligence

Honest answers for accelerator applications and investor conversations. Founder-specific facts are
`[placeholders]`. Market figures are third-party estimates from the sources linked in
[PITCH.md](PITCH.md). We are pre-launch: there are no users, revenue or retention numbers yet.

> Timing note: the YC Winter 2027 on-time deadline was 2 November 2026; late applications are read
> without a guaranteed reply date ([source](https://the-tech.kz/?p=44126)). These answers are written
> to be usable for a late application or the next batch.

## YC application answers

**Describe what your company does in 50 characters or less.**
A virtual pet that lives on developers' focus.

**What is your company going to make?**
Daemonling is a tiny creature that lives in a solo developer's terminal, VS Code and browser. Focus
sessions feed it, streaks teach it tricks, and weeks of work evolve it into a species shaped by how
you work. Overwork and late nights tire it; breaks restore it; neglect puts it into a cocoon — it
never dies. It is local-first and open-core: the full loop is free; Pro adds sync, co-focus dens,
cosmetics and insights.

**Where do you live now, and where would the company be based?**
`[City, country]` / `[Company base]`.

**How far along are you?**
The open-source MVP is built: a pure event-sourced engine (100% line coverage, 60-day persona
simulation), a `dmn` CLI, a VS Code extension packaged as a `.vsix`, an offline web PWA, a README
card, and full product/engineering docs. Private beta starts November 2026. No users yet.

**How long have each of you been working on this? Full-time?**
`[Duration, full-time/part-time per founder]`.

**What tech stack are you using?**
TypeScript (strict) everywhere; pnpm monorepo; Vitest; esbuild for the CLI and extension; React +
Vite for the PWA; IndexedDB in the browser; plain JSONL files locally. No backend yet.

**Are people using your product?** Not yet. `[TBD after beta]`.

**Do you have revenue?** No.

**Why did you pick this idea? Do you have domain expertise?**
`[Founder story: personal experience with solo work, focus and burnout; relevant background]`.
The product insight: focus pets work for consumers, developers already emit the signals needed to
care for one, and nobody has built one that rewards balance inside developer tools.

**Who are your competitors? What do you understand that they don't?**
Consumer focus pets (Focus Friend, Forest), self-care pets (Finch), developer timers and trackers,
and decorative editor pets (vscode-pets). We understand that developers will not open a phone app
mid-flow, that their existing signals (sessions, commits, CI, editor focus) can feed a pet with zero
logging, and that "productivity" for solo builders must include rest.

**How do or will you make money? How much could you make?**
Pro at $5/month or $39/year; Teams later at $4/seat/month. No ads, no data sales, no paid revival.
Illustrative only: every 10,000 annual Pro subscribers is about $390K ARR. Conversion target before
scaling: 4% of weekly users.

**If you had any other ideas you considered applying with, please list them.** `[Optional]`.

## Investor questions

### Product

**1. Isn't this just a Pomodoro timer with a mascot?**
No. A timer counts minutes; Daemonling gives you something to look after. The pet responds to
balance (breaks, overwork, late nights), honesty (admitting distraction pays more than quitting),
consistency (streaks, freezes, tricks) and work style (five species). It lives where developers
already are — terminal, editor, git — and can be fed by signals they already produce. The engine is
a real game system with tested rules, not a skin.

**2. Why would developers want a pet at all?**
Because responsibility motivates more reliably than reward, and many developers already enjoy
companions in their tools — vscode-pets, a purely decorative editor pet, has about 3.5K GitHub
stars. Our pet is not decoration: it reflects how your work is going. Whether enough developers
want this is exactly what the private beta measures (gate: D7 retention ≥ 30%).

**3. What does the first five minutes look like?**
`dmn init` shows an egg; `dmn start` starts a 25-minute session with an animated countdown; the egg
hatches after three sessions, usually on day one. In VS Code the pet appears in the status bar. In
the browser, onboarding is one field and one button. No account, no setup screens.

**4. What is the core loop?**
Start a session → the pet watches with you → finish → it is fed, happier, closer to hatching or
evolving. Daily goal → streak → tricks and freezes. Weekly → a warm journal letter and visible
species progress. Away too long → cocoon → two sessions wake it. Every step is driven by the user's
real focus.

**5. How do you avoid becoming another guilt machine?**
Ethics are product requirements: the pet never dies; copy is empathetic (a test checks the weekly
journal for guilt words); freezes are earned, never sold; vacation mode pauses everything; at most
two unsolicited notifications a day; hibernation is restful and coming back is celebrated with no
penalty.

### Market

**6. How big is the market?**
SlashData counts 47.2M active software developers (2025) and GitHub reports 180M+ developers with
36M+ joining in one year (third-party sources in PITCH.md). Our beachhead is solo developers —
indie hackers, freelancers and students — who lack a team rhythm. We do not claim a share yet; the
beta will tell us conversion and retention.

**7. Do people actually pay for focus or self-care pets?**
Third-party estimates say yes: Finch at about $1M monthly revenue with Finch Plus around $40/year;
Forest's highest iOS monthly revenue since 2021 around $400K; Focus Friend about $370K estimated net
revenue around its #1 ranking. These are consumer apps; whether developers pay similarly is an open
question we will test.

**8. Why start with solo developers?**
They feel the problem most (no manager, no rhythm, burnout risk), they influence each other publicly
(README cards, posts, open source), they try new CLI tools and extensions readily, and they decide
for themselves what to install. Teams come later and only in a non-surveillance form.

**9. What about markets outside the US?**
Local-first software has no data-residency hurdles, and the engine handles every time zone,
including half-hour zones and DST. India is notable: 21.9M GitHub developers per the cited source.
Localising the pet's voice is on the roadmap.

### Competition

**10. What stops Focus Friend or Forest from adding a developer mode?**
Nothing stops them trying, but their product is a phone app built around a consumer audience. Ours
is built into the CLI, the editor and git, with privacy-first focus sensing and developer-native
features (commit treats, CI celebrations, rubber-duck debugging, README cards). Shipping and
maintaining good developer tooling is a different competence.

**11. What about vscode-pets?**
It proves interest in pets inside the editor, but its pets are decorative and do not respond to how
you work. Daemonling's pet is a game system driven by your focus, spans terminal/editor/browser, and
has a business model. We see it as validation, not a threat.

**12. Could GitHub or JetBrains build this?**
They could, but a playful, opinionated wellbeing companion is far from their core and risky for a
platform brand. If they validate the category, our open-source, local-first, cross-tool approach
remains a reason to choose us.

### Moat

**13. What is the moat?**
Early: brand and character (original species and art), a growing log of attachment (users do not
abandon a pet they have raised for months), and distribution through README cards. Later: social
features (co-focus dens, heirloom eggs) and sync that make the pet portable across devices. Honest
caveat: there is little technical moat; the moat is product taste and community.

**14. Open source means anyone can fork it. Why is that okay?**
The open core builds trust (privacy claims are verifiable) and distribution. Pro features —
sync, co-focus dens, cosmetics, insights — require a service and continuous content, which forks do
not get for free. Many developer-tool companies run this model.

### Monetisation

**15. What is in Pro, and why would someone pay?**
Extra species and cosmetics (delight), opt-in sync across machines (convenience), co-focus dens with
friends (social), and deeper insights into focus patterns (self-knowledge). The free tier stays
complete: one pet and the full loop. We will never sell relief from guilt.

**16. Why not ads or a usage-based model?**
Ads conflict with focus and with our privacy promise; data sales are off the table. A subscription
aligns us with users' long-term wellbeing rather than time-on-app.

**17. What conversion do you expect?**
Our gate to scale Sync & Pro is 4% of weekly users converting. Actual conversion is `[TBD after
beta]`; until we have data we treat 4% as a hypothesis to validate, not a forecast.

**18. What about Teams?**
Later, at $4/seat/month: a shared office pet fed by a small team's balanced work and shared focus
dens. It must never become individual surveillance; aggregate, opt-in signals only.

### Privacy

**19. What data do you collect?**
None. There are no accounts, servers, telemetry or analytics. Data lives in a local JSONL event log
(or the browser's IndexedDB): timestamps, minutes, settings, the pet's name, optional task labels and
optional commit hashes. Users can read, export or delete it at any time.

**20. Doesn't the VS Code extension watch what I do?**
It observes exactly one thing during a session: whether a VS Code window has focus. It never reads
code, file names, window titles or keystrokes. The logic is a small pure function with tests, so
the claim is checkable in the source.

**21. How will sync work without breaking the promise?**
Opt-in only, syncing just the event log via a server-ordered append-only log (no CRDTs). End-to-end
encryption of event payloads is a design goal. PRIVACY.md will be updated before sync ships.

### Retention

**22. Focus Friend fell from #1 to #48 in two weeks. Why won't you?**
That curve shows novelty is not retention. Our bets: live inside daily tools rather than a separate
app; feed the pet from signals users already produce; make the long game meaningful (evolution at
14+ days, elder at 90, tricks up to 30-day streaks); and make lapses safe (hibernation, freezes,
vacation) so users come back instead of churning in shame.

**23. What is your north-star metric?**
Weekly Fed Pets: pets with at least three completed sessions in a week. It captures real,
repeated use rather than installs.

**24. How will you measure retention without telemetry?**
During the beta: opt-in surveys, interviews and voluntarily shared exports. If we add any product
analytics later, it will be opt-in, aggregate, documented in PRIVACY.md, and off by default.

### Team

**25. Why are you the right team?**
`[Founder background, relevant experience, unfair advantages]`. Evidence of execution: the MVP —
engine, CLI, VS Code extension, web app and docs — was built in one focused sprint with a full test
suite and CI.

**26. Who else do you need to hire first?**
`[Plan]`. Likely a designer/illustrator for species and cosmetics, and later a backend engineer for
sync and dens.

### Risks

**27. What is the biggest risk?**
That developers find it charming but do not keep using it. The beta gate (D7 ≥ 30%) exists to test
this before we spend on growth.

**28. What else could go wrong?**
Novelty spikes without retention; Pro not converting at 4%; the pet feeling like pressure for some
users; a platform (VS Code Marketplace) policy change; and trademark confusion with older virtual-pet
brands — we use original names and art and avoid their trademarks.

**29. What if users game it (fake sessions, edited logs)?**
It is their pet; there is no leaderboard to protect yet. Minutes are clamped per session and
duplicate completions are ignored. Social features will need server-side checks.

### Use of funds

**30. What will you do with the money?**
`[Amount and split]`. Priorities: run and learn from the private beta; publish to npm, the VS Code
Marketplace and Open VSX; build opt-in sync and co-focus dens; commission original art for new
species and cosmetics; and reach the 4% Pro conversion gate before spending on growth.
