import { formatClock, reduce } from '@daemonling/core';
import type { PetEvent, PetState } from '@daemonling/core';
import { asciiFrame, moodFor } from '@daemonling/sprites';
import type { Context } from './context.js';

/** Options for {@link runSession}. */
export interface SessionOptions {
  minutes: number;
  task?: string;
  /** Test hook: finish after this many real milliseconds instead of the planned time. */
  testDurationMs?: number;
}

/** How the session ended. */
export type SessionOutcome = 'completed' | 'honest' | 'abandoned';

/** Elapsed whole minutes since `startedAt`. */
export function minutesSince(startedAt: string, nowIso: string): number {
  return Math.max(0, Math.floor((Date.parse(nowIso) - Date.parse(startedAt)) / 60_000));
}

/** Interprets the answer to "Were you distracted?" — anything starting with y is honest. */
export function isHonestAnswer(answer: string): boolean {
  return /^\s*y/i.test(answer);
}

/** Prints the pet's reactions to the latest event. */
export function printReactions(ctx: Context, state: PetState): void {
  for (const r of state.reactions) ctx.out(`  ${ctx.colors.magenta('›')} ${r.text}\n`);
}

/**
 * Runs a focus session with a live countdown and an animated pet. Ctrl+C asks whether the user
 * got distracted (an honest answer earns more XP than a silent quit).
 */
export async function runSession(
  ctx: Context,
  state: PetState,
  options: SessionOptions,
): Promise<SessionOutcome> {
  const c = ctx.colors;
  let current = state;
  if (current.activeSession) {
    ctx.out(
      `Resuming the session that started at ${current.activeSession.startedAt.slice(11, 16)} UTC.\n`,
    );
  } else {
    const event: PetEvent = {
      type: 'SESSION_STARTED',
      at: ctx.now(),
      plannedMinutes: options.minutes,
      ...(options.task ? { task: options.task } : {}),
    };
    current = ctx.store.appendSync([event]);
  }
  const session = current.activeSession!;
  const endMs =
    options.testDurationMs !== undefined
      ? Date.parse(ctx.now()) + options.testDurationMs
      : Date.parse(session.startedAt) + session.plannedMinutes * 60_000;
  const taskText = session.task ? ` on ${c.bold(session.task)}` : '';
  ctx.out(
    `${c.bold(current.name)} is focusing with you for ${session.plannedMinutes} minutes${taskText}. ${c.dim('Ctrl+C to stop.')}\n`,
  );

  let interrupted = false;
  const unsubscribe = ctx.onInterrupt(() => {
    interrupted = true;
  });
  let frame = 0;
  let drawn = 0;
  try {
    while (!interrupted && Date.parse(ctx.now()) < endMs) {
      if (ctx.interactive) {
        const remaining = (endMs - Date.parse(ctx.now())) / 1000;
        const art = asciiFrame(current.species, moodFor(current, ctx.now()), frame);
        const lines = [...art, '', `   ${c.bold(formatClock(remaining))} left`];
        if (drawn > 0) ctx.out(`\u001b[${drawn}A`);
        ctx.out(lines.map((l) => `\u001b[2K${c.yellow(l)}`).join('\n') + '\n');
        drawn = lines.length;
        frame += 1;
      }
      await ctx.sleep(Math.min(500, Math.max(10, endMs - Date.parse(ctx.now()))));
    }
  } finally {
    unsubscribe();
  }

  const at = ctx.now();
  if (interrupted) {
    const done = minutesSince(session.startedAt, at);
    const answer = await ctx.ask(`\nWere you distracted? ${c.dim('(honest = more XP)')} [y/N] `);
    const honest = isHonestAnswer(answer);
    const next = ctx.store.appendSync([
      honest
        ? { type: 'DISTRACTION_REPORTED', at, minutesDone: done }
        : { type: 'SESSION_ABANDONED', at, minutesDone: done },
    ]);
    printReactions(ctx, next);
    return honest ? 'honest' : 'abandoned';
  }
  const next = ctx.store.appendSync([
    { type: 'SESSION_COMPLETED', at, minutes: session.plannedMinutes },
  ]);
  ctx.out(
    `${ctx.interactive ? '\u0007' : ''}${c.green('Session complete!')} +${session.plannedMinutes} xp\n`,
  );
  printReactions(ctx, next);
  return 'completed';
}

/** Current state advanced to "now" in memory (not persisted), for display. */
export function stateAtNow(state: PetState, nowIso: string): PetState {
  return reduce(state, { type: 'TICK', at: nowIso });
}
