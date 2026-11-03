import { CONFIG, formatClock, summarize, weekdayName } from '@daemonling/core';
import type { PetState, WeekStats } from '@daemonling/core';
import { asciiFrame, moodFor, SPECIES_LABEL } from '@daemonling/sprites';
import type { Colors } from './color.js';
import { stripAnsi } from './color.js';

/** A horizontal bar for a 0–100 value, e.g. `███████░░░`. */
export function bar(value: number, width = 10): string {
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** Places two blocks of lines side by side. */
export function sideBySide(left: readonly string[], right: readonly string[], gap = 3): string[] {
  const width = Math.max(...left.map((l) => stripAnsi(l).length), 0);
  const rows = Math.max(left.length, right.length);
  const out: string[] = [];
  for (let i = 0; i < rows; i++) {
    const l = left[i] ?? '';
    out.push(`${l}${' '.repeat(width - stripAnsi(l).length + gap)}${right[i] ?? ''}`.trimEnd());
  }
  return out;
}

const CONDITION_COLOR: Record<PetState['condition'], keyof Colors> = {
  thriving: 'green',
  content: 'cyan',
  sad: 'blue',
  sick: 'yellow',
  hibernating: 'magenta',
};

/** Colours a condition word. */
export function conditionText(state: PetState, c: Colors): string {
  const fn = c[CONDITION_COLOR[state.condition]] as (s: string) => string;
  return fn(state.condition);
}

/** The next life-stage goal, in words. */
export function nextStageHint(state: PetState): string {
  const s = CONFIG.stages;
  switch (state.stage) {
    case 'egg':
      return `hatches after ${s.hatchAfterSessions - state.ledger.sessionsCompleted} more session(s)`;
    case 'hatchling':
      return `juvenile at ${s.juvenileXp} xp`;
    case 'juvenile':
      return `adult at ${s.adultXp} xp and ${s.adultMinAgeDays} days old`;
    case 'adult':
      return `elder at ${s.elderMinAgeDays} days old`;
    default:
      return 'fully grown';
  }
}

/** Full `dmn status` view. */
export function statusView(state: PetState, nowIso: string, c: Colors, frameIndex = 0): string {
  const s = summarize(state, nowIso);
  const art = asciiFrame(state.species, moodFor(state, nowIso), frameIndex).map((l) => c.yellow(l));
  const title = `${c.bold(state.name)} the ${SPECIES_LABEL[state.species]} ${c.dim(`(${state.stage})`)}`;
  const info = [title, conditionText(state, c), '', c.dim(`"${s.says}"`)];
  const lines = sideBySide(art, info);
  const statRows: Array<[string, number]> = [
    ['Satiety', s.stats.satiety],
    ['Mood', s.stats.mood],
    ['Health', s.stats.health],
    ['Energy', s.stats.energy],
    ['Bond', s.stats.bond],
  ];
  lines.push('');
  for (const [label, value] of statRows) {
    lines.push(`  ${label.padEnd(8)} ${c.green(bar(value))} ${String(value).padStart(3)}`);
  }
  lines.push('');
  lines.push(`  XP       ${s.xp} ${c.dim(`· ${nextStageHint(state)}`)}`);
  const streak = s.streak === 1 ? '1 day' : `${s.streak} days`;
  lines.push(
    `  Streak   ${streak} ${c.dim(`(best ${s.bestStreak}, ${s.freezes} freeze${s.freezes === 1 ? '' : 's'} banked)`)}`,
  );
  const today = Math.round(state.ledger.dayFocusMinutes);
  lines.push(`  Today    ${today}/${state.settings.dailyGoalMinutes} focus minutes`);
  if (s.sessionRemainingSeconds !== null) {
    const task = s.sessionTask ? ` — ${s.sessionTask}` : '';
    lines.push(`  Session  ${c.bold(formatClock(s.sessionRemainingSeconds))} left${task}`);
  }
  if (state.vacation) lines.push(`  ${c.magenta('On vacation')} — nothing decays.`);
  if (s.tricks.length > 0) lines.push(`  Tricks   ${s.tricks.join(', ')}`);
  return `${lines.join('\n')}\n`;
}

/** Bars for a week of focus minutes, one row per day. */
export function weekChart(week: WeekStats, goal: number, c: Colors): string[] {
  const max = Math.max(goal, ...week.days.map((d) => d.minutes), 1);
  return week.days.map((d) => {
    const width = Math.round((d.minutes / max) * 24);
    const met = d.minutes >= goal;
    const barText = '█'.repeat(width) || '·';
    return `  ${weekdayName(d.day).slice(0, 3)} ${d.day.slice(5)}  ${met ? c.green(barText) : c.yellow(barText)} ${Math.round(d.minutes)}m${met ? ' ✓' : ''}`;
  });
}
