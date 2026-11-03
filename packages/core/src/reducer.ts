import { CONFIG } from './config.js';
import { addJournal, clampStat, createPet, mergeSettings, cleanName, round1 } from './pet.js';
import {
  advanceStage,
  countStreakDay,
  deriveCondition,
  learnTricks,
  settleStreak,
} from './progression.js';
import { awakeHoursBetween, isNight, localDay, MS, toIso, toMs } from './time.js';
import type { PetEvent, PetState } from './types.js';

/** Moves `value` toward `target` by at most `step`. */
function drift(value: number, target: number, step: number): number {
  if (value > target) return Math.max(target, value - step);
  return Math.min(target, value + step);
}

/** Resets the hunger clock (used after hibernation or vacation: no penalties for resting). */
function restartHunger(state: PetState, at: string): void {
  const hungry = state.stats.satiety < CONFIG.hunger.threshold;
  state.ledger.hungrySince = hungry ? at : null;
  state.ledger.hungerPenaltiesApplied = 0;
}

/**
 * Applies the passage of time between `fromMs` and `toMs`: decay over awake hours, hunger damage,
 * natural breaks, hibernation, day rollover and streak settlement.
 */
function applyElapsed(state: PetState, fromMs: number, nowMs: number): void {
  const { ledger, stats, settings } = state;
  const d = CONFIG.decay;
  const idle = state.activeSession === null;

  if (!state.vacation && !ledger.hibernating) {
    const hibernateAtMs = toMs(ledger.careClockAt) + CONFIG.conditions.hibernateAfterDays * MS.day;
    const decayEndMs = Math.min(nowMs, hibernateAtMs);
    const hours = awakeHoursBetween(fromMs, decayEndMs, settings);
    if (hours > 0) {
      const satietyBefore = stats.satiety;
      if (satietyBefore >= d.healthRegenSatietyThreshold) {
        stats.health = clampStat(stats.health + d.healthRegenPerHour * hours);
      }
      stats.satiety = clampStat(satietyBefore - d.satietyPerHour * hours);
      stats.mood = drift(stats.mood, d.moodBaseline, d.moodDriftPerHour * hours);
      if (idle) stats.energy = clampStat(stats.energy + d.energyRecoveryPerHour * hours);
      trackHunger(state, satietyBefore, fromMs, decayEndMs);
    }
    applyHungerDamage(state, decayEndMs);
    if (nowMs >= hibernateAtMs) {
      ledger.hibernating = true;
      ledger.wakeSessions = [];
      addJournal(state, {
        at: toIso(hibernateAtMs),
        kind: 'hibernate',
        text: `${state.name} curled up into a cozy cocoon to wait for you. No rush. It will be right here.`,
      });
    }
  }

  if (idle && nowMs - fromMs >= CONFIG.breaks.naturalBreakMinutes * MS.minute) {
    state.focusMinutesSinceBreak = 0;
  }

  const today = localDay(toIso(nowMs), settings.timezone);
  if (today !== ledger.day) {
    ledger.day = today;
    ledger.dayFocusMinutes = 0;
    ledger.dayCommitsCounted = 0;
    ledger.dayBondFromPetting = 0;
  }
  settleStreak(state, today, toIso(nowMs));
}

/** Starts or stops the hunger clock when satiety crosses the threshold. */
function trackHunger(state: PetState, before: number, fromMs: number, toMsValue: number): void {
  const { ledger } = state;
  const after = state.stats.satiety;
  const threshold = CONFIG.hunger.threshold;
  if (after >= threshold) {
    ledger.hungrySince = null;
    ledger.hungerPenaltiesApplied = 0;
  } else if (ledger.hungrySince === null) {
    // Estimate when satiety crossed the threshold (linear within this window).
    const fraction = before > threshold ? (before - threshold) / (before - after) : 0;
    ledger.hungrySince = toIso(Math.round(fromMs + (toMsValue - fromMs) * fraction));
  }
}

/** Health drops once hunger has lasted longer than the grace period, once per further day. */
function applyHungerDamage(state: PetState, untilMs: number): void {
  const { ledger, stats } = state;
  if (ledger.hungrySince === null) return;
  const h = CONFIG.hunger;
  const hungryHours = (untilMs - toMs(ledger.hungrySince)) / MS.hour;
  const due = hungryHours > h.graceHours ? Math.floor((hungryHours - h.graceHours) / 24) + 1 : 0;
  if (due > ledger.hungerPenaltiesApplied) {
    const penalty = h.healthPerDay * (due - ledger.hungerPenaltiesApplied);
    stats.health = Math.max(h.healthFloor, stats.health + penalty);
    ledger.hungerPenaltiesApplied = due;
  }
}

function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return 0;
  return Math.min(CONFIG.session.maxMinutes, Math.max(0, minutes));
}

function completeSession(state: PetState, minutesRaw: number, at: string): void {
  const s = CONFIG.session;
  const { stats, traits, ledger } = state;
  const minutes = clampMinutes(minutesRaw);
  state.activeSession = null;
  ledger.sessionDistractionPenalty = 0;
  if (minutes <= 0) return;

  const night = isNight(at, state.settings);
  stats.satiety = clampStat(stats.satiety + minutes * s.satietyPerMinute);
  stats.mood = clampStat(stats.mood + s.moodOnComplete);
  if (stats.health < CONFIG.conditions.sickBelowHealth) {
    stats.health = clampStat(stats.health + s.healthWhenSick);
  }
  stats.bond = clampStat(stats.bond + s.bondOnComplete);
  stats.energy = clampStat(stats.energy - minutes * s.energyCostPerMinute);
  state.xp = round1(state.xp + minutes * s.xpPerMinute);
  if (minutes >= s.deepMinutes) traits.depth += 1;
  if (minutes <= s.sprintMaxMinutes) traits.sprint += 1;
  if (night) {
    traits.night += 1;
    stats.energy = clampStat(stats.energy + CONFIG.overwork.lateSessionEnergy);
  }
  state.focusMinutesSinceBreak += minutes;
  ledger.dayFocusMinutes += minutes;
  ledger.sessionsCompleted += 1;
  ledger.totalFocusMinutes += minutes;
  ledger.lastSessionCompletedAt = at;
  ledger.careClockAt = at;
  if (stats.satiety >= CONFIG.hunger.threshold) {
    ledger.hungrySince = null;
    ledger.hungerPenaltiesApplied = 0;
  }
  state.reactions.push({ kind: 'happy', text: `Nom. ${Math.round(minutes)} focused minutes!` });

  if (state.focusMinutesSinceBreak > CONFIG.overwork.focusMinutesThreshold) {
    stats.energy = clampStat(stats.energy + CONFIG.overwork.energy);
    stats.mood = clampStat(stats.mood + CONFIG.overwork.mood);
    state.reactions.push({
      kind: 'yawn',
      text: '*yawn* That was a lot of focus. A real break would feel amazing.',
    });
    addJournal(state, {
      at,
      kind: 'overwork',
      text: `${state.name} yawned after ${Math.round(state.focusMinutesSinceBreak)} minutes without a real break.`,
    });
  }

  if (ledger.hibernating) wakeProgress(state, at);
  countStreakDay(state, ledger.day, at);
}

/** Two completed sessions within the wake window bring a pet out of hibernation. */
function wakeProgress(state: PetState, at: string): void {
  const { ledger, stats } = state;
  const nowMs = toMs(at);
  const windowMs = CONFIG.wake.windowHours * MS.hour;
  ledger.wakeSessions = [...ledger.wakeSessions, at].filter((t) => nowMs - toMs(t) <= windowMs);
  if (ledger.wakeSessions.length < CONFIG.wake.sessionsNeeded) return;
  ledger.hibernating = false;
  ledger.wakeSessions = [];
  stats.mood = clampStat(stats.mood + CONFIG.wake.mood);
  restartHunger(state, at);
  state.reactions.push({ kind: 'welcome-back', text: 'You came back! I kept your seat warm.' });
  addJournal(state, {
    at,
    kind: 'welcome-back',
    text: `Welcome back! ${state.name} stretched out of the cocoon, blinked twice, and did a little spin.`,
  });
}

function endSessionEarly(state: PetState, minutesDone: number, honest: boolean): void {
  if (!state.activeSession) return;
  const rule = honest ? CONFIG.honestStop : CONFIG.abandon;
  state.activeSession = null;
  state.ledger.sessionDistractionPenalty = 0;
  state.stats.mood = clampStat(state.stats.mood + rule.mood);
  state.xp = round1(state.xp + clampMinutes(minutesDone) * rule.xpPerMinute);
  state.reactions.push(
    honest
      ? {
          kind: 'happy',
          text: 'Thanks for telling me. Honest stops still count. Next one is ours.',
        }
      : { kind: 'sulk', text: 'Oh. The session just... stopped.' },
  );
}

function applyEvent(state: PetState, event: PetEvent, at: string): void {
  const { stats, ledger } = state;
  switch (event.type) {
    case 'PET_CREATED':
    case 'TICK':
      return;
    case 'SESSION_STARTED':
      state.activeSession = {
        startedAt: at,
        plannedMinutes: clampMinutes(event.plannedMinutes) || 25,
        ...(event.task ? { task: event.task.slice(0, 120) } : {}),
      };
      ledger.sessionDistractionPenalty = 0;
      return;
    case 'SESSION_COMPLETED':
      if (state.activeSession) completeSession(state, event.minutes, at);
      return;
    case 'SESSION_ABANDONED':
      endSessionEarly(state, event.minutesDone, false);
      return;
    case 'DISTRACTION_REPORTED':
      endSessionEarly(state, event.minutesDone, true);
      return;
    case 'DISTRACTION_DETECTED': {
      if (!state.activeSession || !(event.secondsAway > state.settings.graceSeconds)) return;
      const d = CONFIG.distraction;
      const delta = Math.max(
        d.moodPerDetection,
        d.maxMoodPenaltyPerSession - ledger.sessionDistractionPenalty,
      );
      if (delta >= 0) return;
      stats.mood = clampStat(stats.mood + delta);
      ledger.sessionDistractionPenalty += delta;
      return;
    }
    case 'BREAK_TAKEN':
      if (!(event.minutes >= CONFIG.breaks.minMinutes)) return;
      state.focusMinutesSinceBreak = 0;
      stats.energy = clampStat(stats.energy + CONFIG.breaks.energy);
      state.traits.balance += 1;
      state.reactions.push({ kind: 'happy', text: 'Stretch! Water! Sky! Good break.' });
      return;
    case 'COMMIT_MADE':
      if (!state.activeSession || ledger.dayCommitsCounted >= CONFIG.commits.maxCountedPerDay) {
        return;
      }
      ledger.dayCommitsCounted += 1;
      stats.satiety = clampStat(stats.satiety + CONFIG.commits.satiety);
      state.traits.craft += CONFIG.commits.craft;
      state.reactions.push({ kind: 'happy', text: 'A commit treat! Crunchy.' });
      return;
    case 'CI_PASSED':
      stats.mood = clampStat(stats.mood + CONFIG.ci.mood);
      state.traits.craft += CONFIG.ci.craft;
      ledger.victoryDanceUnlocked = true;
      state.reactions.push({ kind: 'victory-dance', text: 'Green build! Victory dance!' });
      return;
    case 'PET_PETTED': {
      const p = CONFIG.petting;
      const gain = Math.max(0, Math.min(p.bond, p.maxBondPerDay - ledger.dayBondFromPetting));
      stats.bond = clampStat(stats.bond + gain);
      ledger.dayBondFromPetting += gain;
      stats.mood = clampStat(stats.mood + p.mood);
      state.reactions.push({ kind: 'purr', text: 'prrrr…' });
      return;
    }
    case 'VACATION_SET':
      if (event.on === state.vacation) return;
      state.vacation = event.on;
      if (event.on) {
        addJournal(state, {
          at,
          kind: 'note',
          text: `Vacation mode on. ${state.name} is resting too; nothing decays while you are away.`,
        });
      } else {
        ledger.careClockAt = at;
        ledger.streakCheckedThrough = ledger.day;
        restartHunger(state, at);
        addJournal(state, { at, kind: 'note', text: `Vacation over. ${state.name} missed you!` });
      }
      return;
    case 'SETTINGS_CHANGED':
      state.settings = mergeSettings(state.settings, event.settings);
      if (event.name !== undefined) state.name = cleanName(event.name);
      return;
  }
}

/**
 * The pure reducer: returns the next state for one event. Time comes only from `event.at`; an
 * event older than the previous one is treated as happening at the same instant.
 */
export function reduce(state: PetState, event: PetEvent): PetState {
  if (event.type === 'PET_CREATED') return state;
  const next: PetState = structuredClone(state);
  const fromMs = toMs(state.lastEventAt);
  const eventMs = toMs(event.at);
  const nowMs = Number.isFinite(eventMs) ? Math.max(fromMs, eventMs) : fromMs;
  const at = toIso(nowMs);

  if (event.type !== 'TICK') next.reactions = [];
  const session = next.activeSession;
  if (session) {
    const expiresMs =
      toMs(session.startedAt) +
      (session.plannedMinutes + CONFIG.session.staleAfterPlannedMinutes) * MS.minute;
    if (nowMs > expiresMs) {
      // A forgotten session (e.g. the terminal was closed) quietly expires: no reward, no penalty.
      applyElapsed(next, fromMs, expiresMs);
      next.activeSession = null;
      next.lastEventAt = toIso(expiresMs);
      applyElapsed(next, expiresMs, nowMs);
    } else {
      applyElapsed(next, fromMs, nowMs);
    }
  } else {
    applyElapsed(next, fromMs, nowMs);
  }

  applyEvent(next, event, at);
  advanceStage(next, at);
  learnTricks(next, at);
  for (const key of Object.keys(next.stats) as Array<keyof typeof next.stats>) {
    next.stats[key] = round1(clampStat(next.stats[key]));
  }
  next.stats.health = Math.max(CONFIG.hunger.healthFloor, next.stats.health);
  next.condition = deriveCondition(next);
  next.lastEventAt = at;
  return next;
}

/**
 * Rebuilds a pet from its full event log. The first event must be `PET_CREATED`; later
 * `PET_CREATED` events are ignored.
 */
export function replay(events: readonly PetEvent[]): PetState {
  const [first, ...rest] = events;
  if (!first || first.type !== 'PET_CREATED') {
    throw new Error('Event log must start with PET_CREATED.');
  }
  return rest.reduce(reduce, createPet(first));
}
