import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command, CommanderError, InvalidArgumentError, Option } from 'commander';
import {
  buildHistory,
  buildWeeklyJournal,
  duckQuestion,
  duckSummary,
  localDay,
  mondayOf,
  replay,
  weekStats,
} from '@daemonling/core';
import type { PetEvent, PetState, Settings } from '@daemonling/core';
import { asciiFrame, renderCard, SPECIES_LABEL } from '@daemonling/sprites';
import { ImportError, makeExport, NoPetError, parseExport } from '@daemonling/store';
import type { Context } from './context.js';
import { promptLineFor } from './fast-prompt.js';
import { installHook, uninstallHook } from './hook.js';
import { statusView, weekChart } from './render.js';
import { minutesSince, printReactions, runSession, stateAtNow } from './session.js';

export const VERSION = '0.1.0';

/** A user-facing error: printed without a stack trace. */
export class UserError extends Error {
  override name = 'UserError';
}

function intArg(name: string, min: number, max: number) {
  return (value: string): number => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) {
      throw new InvalidArgumentError(`${name} must be a whole number from ${min} to ${max}.`);
    }
    return n;
  };
}

/** Loads the pet or throws a friendly error. */
function requirePet(ctx: Context): PetState {
  const { state } = ctx.store.loadSync();
  if (!state) throw new NoPetError();
  return state;
}

function append(ctx: Context, ...events: PetEvent[]): PetState {
  return ctx.store.appendSync(events);
}

function settingsFromOptions(opts: Record<string, unknown>): Partial<Settings> {
  const settings: Partial<Settings> = {};
  if (typeof opts.goal === 'number') settings.dailyGoalMinutes = opts.goal;
  if (typeof opts.bedtime === 'number') settings.bedtimeHour = opts.bedtime;
  if (typeof opts.wake === 'number') settings.wakeHour = opts.wake;
  if (typeof opts.grace === 'number') settings.graceSeconds = opts.grace;
  if (typeof opts.timezone === 'string') settings.timezone = opts.timezone;
  return settings;
}

function addSettingOptions(cmd: Command): Command {
  return cmd
    .option('--goal <minutes>', 'daily focus goal in minutes', intArg('goal', 10, 480))
    .option(
      '--bedtime <hour>',
      'local hour your pet goes to sleep (0-23)',
      intArg('bedtime', 0, 23),
    )
    .option('--wake <hour>', 'local hour your pet wakes up (0-23)', intArg('wake', 0, 23))
    .option(
      '--grace <seconds>',
      'seconds away from the editor that are forgiven',
      intArg('grace', 10, 3600),
    )
    .option('--timezone <zone>', 'IANA time zone, e.g. Asia/Kolkata');
}

/** Builds the `dmn` command tree bound to a context. */
export function buildProgram(ctx: Context): Command {
  const c = ctx.colors;
  const program = new Command()
    .name('dmn')
    .description('A tiny daemon that lives on your focus.')
    .version(VERSION, '-v, --version')
    .showHelpAfterError('(run with --help for usage)')
    .configureOutput({ writeOut: (s) => ctx.out(s), writeErr: (s) => ctx.err(s) })
    .exitOverride();

  addSettingOptions(
    program
      .command('init')
      .description('hatch a new daemon (an egg)')
      .option('-n, --name <name>', 'what to call it', 'Bit'),
  ).action((opts: Record<string, unknown>) => {
    const existing = ctx.store.loadSync().state;
    if (existing) {
      throw new UserError(
        `You already have a daemon named ${existing.name}. See it with \`dmn status\`.`,
      );
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const state = append(ctx, {
      type: 'PET_CREATED',
      at: ctx.now(),
      id: randomUUID(),
      name: String(opts.name),
      settings: { timezone, ...settingsFromOptions(opts) },
    });
    ctx.out(
      `${asciiFrame('unhatched', 'egg')
        .map((l) => c.yellow(l))
        .join('\n')}\n\n`,
    );
    ctx.out(`An egg appeared! Its name is ${c.bold(state.name)}.\n`);
    ctx.out(`Complete 3 focus sessions to hatch it: ${c.cyan('dmn start')}\n`);
    ctx.out(c.dim(`Data lives in ${ctx.store.home} (local only, never uploaded).\n`));
  });

  program
    .command('start')
    .description('start a focus session with a live countdown')
    .argument('[minutes]', 'session length in minutes', intArg('minutes', 1, 240), 25)
    .option('-t, --task <text>', 'what you are working on (stays on your machine)')
    .addOption(
      new Option('--test-duration-ms <ms>', 'finish after N real ms').argParser(Number).hideHelp(),
    )
    .action(async (minutes: number, opts: { task?: string; testDurationMs?: number }) => {
      const state = stateAtNow(requirePet(ctx), ctx.now());
      await runSession(ctx, state, {
        minutes,
        ...(opts.task ? { task: opts.task } : {}),
        ...(opts.testDurationMs !== undefined ? { testDurationMs: opts.testDurationMs } : {}),
      });
    });

  program
    .command('status')
    .description('show your daemon, its stats and what it has to say')
    .action(() => {
      ctx.out(statusView(stateAtNow(requirePet(ctx), ctx.now()), ctx.now(), c));
    });

  program
    .command('pet')
    .description('give your daemon a gentle pat')
    .action(() => {
      const state = append(ctx, { type: 'PET_PETTED', at: ctx.now() });
      ctx.out(
        `${asciiFrame(state.species, 'happy')
          .map((l) => c.yellow(l))
          .join('\n')}\n`,
      );
      printReactions(ctx, state);
    });

  program
    .command('break')
    .description('log a break (10+ minutes restores energy and resets the burnout guardian)')
    .argument('[minutes]', 'break length in minutes', intArg('minutes', 1, 240), 10)
    .action((minutes: number) => {
      const state = append(ctx, { type: 'BREAK_TAKEN', at: ctx.now(), minutes });
      if (minutes >= 10) printReactions(ctx, state);
      else ctx.out('Short breaks are nice, but 10+ minutes is what really recharges us.\n');
    });

  program
    .command('distracted')
    .description('honestly end the current session (earns more XP than quitting silently)')
    .action(() => {
      const state = requirePet(ctx);
      if (!state.activeSession) throw new UserError('No session is running right now.');
      const at = ctx.now();
      const next = append(ctx, {
        type: 'DISTRACTION_REPORTED',
        at,
        minutesDone: minutesSince(state.activeSession.startedAt, at),
      });
      printReactions(ctx, next);
    });

  program
    .command('vacation')
    .description('pause everything while you are away (no decay, streak safe)')
    .argument('<on|off>', 'turn vacation mode on or off')
    .action((value: string) => {
      if (value !== 'on' && value !== 'off')
        throw new UserError('Use `dmn vacation on` or `dmn vacation off`.');
      const state = append(ctx, { type: 'VACATION_SET', at: ctx.now(), on: value === 'on' });
      ctx.out(
        state.vacation
          ? `Vacation mode is on. ${state.name} will rest too. Enjoy!\n`
          : `Welcome back! ${state.name} missed you.\n`,
      );
    });

  addSettingOptions(
    program
      .command('settings')
      .description('show or change settings')
      .option('-n, --name <name>', 'rename your daemon'),
  ).action((opts: Record<string, unknown>) => {
    let state = requirePet(ctx);
    const settings = settingsFromOptions(opts);
    if (Object.keys(settings).length > 0 || typeof opts.name === 'string') {
      state = append(ctx, {
        type: 'SETTINGS_CHANGED',
        at: ctx.now(),
        settings,
        ...(typeof opts.name === 'string' ? { name: opts.name } : {}),
      });
    }
    const s = state.settings;
    ctx.out(
      [
        `name       ${state.name}`,
        `goal       ${s.dailyGoalMinutes} minutes/day`,
        `bedtime    ${s.bedtimeHour}:00`,
        `wake       ${s.wakeHour}:00`,
        `grace      ${s.graceSeconds} seconds`,
        `timezone   ${s.timezone}`,
        `data       ${ctx.store.home}`,
      ].join('\n') + '\n',
    );
  });

  program
    .command('stats')
    .description('totals, traits and species progress')
    .option('-w, --week', 'show this week day by day')
    .action((opts: { week?: boolean }) => {
      const { events } = ctx.store.loadSync();
      if (events.length === 0) throw new NoPetError();
      const now = ctx.now();
      const history = buildHistory([...events, { type: 'TICK', at: now }]);
      const state = history.state;
      const l = state.ledger;
      ctx.out(
        [
          `${c.bold(state.name)} · ${SPECIES_LABEL[state.species]} · ${state.stage}`,
          `  Sessions      ${l.sessionsCompleted}`,
          `  Focus time    ${Math.round(l.totalFocusMinutes)} minutes`,
          `  Best streak   ${state.streak.best} days`,
          `  Traits        ${Object.entries(state.traits)
            .map(([k, v]) => `${k} ${v}`)
            .join(' · ')}`,
          '',
        ].join('\n'),
      );
      if (opts.week) {
        const week = weekStats(history.days, mondayOf(localDay(now, state.settings.timezone)));
        ctx.out(`This week (goal ${state.settings.dailyGoalMinutes}m/day):\n`);
        ctx.out(`${weekChart(week, state.settings.dailyGoalMinutes, c).join('\n')}\n`);
        ctx.out(
          `  ${week.sessions} sessions · ${week.minutes} minutes · ${week.breaks} breaks · ${week.commits} commits\n`,
        );
      }
    });

  program
    .command('journal')
    .description("this week's journal, written by your daemon")
    .option('--week <YYYY-MM-DD>', 'any day in the week to show')
    .action((opts: { week?: string }) => {
      const { events, state } = ctx.store.loadSync();
      if (!state) throw new NoPetError();
      const day = opts.week ?? localDay(ctx.now(), state.settings.timezone);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new UserError('Use a date like 2026-11-02.');
      const weekStart = mondayOf(day);
      const lines = buildWeeklyJournal([...events, { type: 'TICK', at: ctx.now() }], weekStart);
      ctx.out(`${c.bold(`${state.name}'s journal — week of ${weekStart}`)}\n\n`);
      ctx.out(`${lines.map((line) => `  ${line}`).join('\n')}\n\n`);
      const recent = state.journal.slice(-5);
      ctx.out(`${c.dim('Recent moments:')}\n`);
      for (const entry of recent) ctx.out(c.dim(`  ${entry.at.slice(0, 10)}  ${entry.text}\n`));
    });

  program
    .command('duck')
    .description('rubber-duck debugging: talk it through, your daemon asks questions')
    .action(async () => {
      const state = requirePet(ctx);
      const asked: string[] = [];
      const said: string[] = [];
      ctx.out(
        `${c.bold(state.name)} puts on its tiny duck costume and listens. ${c.dim('Describe the problem; empty line or "bye" to finish.')}\n`,
      );
      await ctx.readLines('you> ', (line) => {
        const text = line.trim();
        if (text === '' || /^(bye|quit|exit|done)$/i.test(text)) return false;
        said.push(text);
        const question = duckQuestion(text, asked);
        asked.push(question);
        ctx.out(`${c.yellow(`${state.name}>`)} ${question}\n`);
        return true;
      });
      ctx.out(
        `\n${c.bold('What you said:')}\n${duckSummary(said)
          .map((l) => `  ${l}`)
          .join('\n')}\n`,
      );
    });

  program
    .command('badge')
    .description('write an SVG card of your daemon for your README')
    .option('-o, --out <file>', 'output file', 'pet.svg')
    .option('--from <export.json>', 'render from an export file instead of your local pet (for CI)')
    .action((opts: { out: string; from?: string }) => {
      let state: PetState;
      let nowIso = ctx.now();
      if (opts.from) {
        let text: string;
        try {
          text = readFileSync(resolve(ctx.cwd, opts.from), 'utf8');
        } catch {
          throw new UserError(`Cannot read ${opts.from}.`);
        }
        const events = parseExport(text);
        // An exported pet is shown as of its last event, so the card does not decay in CI.
        state = replay(events);
        nowIso = state.lastEventAt;
      } else {
        state = stateAtNow(requirePet(ctx), nowIso);
      }
      const path = resolve(ctx.cwd, opts.out);
      writeFileSync(path, renderCard(state, { nowIso }));
      ctx.out(`Wrote ${path}\nEmbed it with: ![${state.name}](${opts.out})\n`);
    });

  const hook = program
    .command('hook')
    .description('git post-commit hook: commits during a session are treats');
  hook
    .command('install')
    .description('install the hook in the current repository')
    .action(() => {
      const path = installHook(ctx.cwd);
      ctx.out(
        `Installed ${path}\nCommits made during a focus session now feed ${c.bold('your daemon')}.\n`,
      );
    });
  hook
    .command('uninstall')
    .description('remove the hook from the current repository')
    .action(() => {
      ctx.out(
        uninstallHook(ctx.cwd) ? 'Removed the Daemonling hook.\n' : 'No Daemonling hook found.\n',
      );
    });

  program
    .command('event')
    .description('record an external event (used by hooks and CI scripts)')
    .argument('<kind>', 'commit | ci-passed')
    .option('--sha <sha>', 'commit hash')
    .action((kind: string, opts: { sha?: string }) => {
      if (!ctx.store.exists()) return; // Hooks must never fail or nag.
      const at = ctx.now();
      if (kind === 'commit') {
        append(ctx, {
          type: 'COMMIT_MADE',
          at,
          ...(opts.sha ? { sha: opts.sha.slice(0, 40) } : {}),
        });
      } else if (kind === 'ci-passed') {
        append(ctx, { type: 'CI_PASSED', at });
      } else {
        throw new UserError('Unknown event. Use `commit` or `ci-passed`.');
      }
    });

  program
    .command('prompt')
    .description('one-line status for your shell prompt (fast; prints nothing if no pet)')
    .action(() => {
      ctx.out(promptLine(ctx));
    });

  program
    .command('export')
    .description('export your full event log as JSON (for backup or the web app)')
    .option('-o, --out <file>', 'write to a file instead of stdout')
    .action((opts: { out?: string }) => {
      const { events } = ctx.store.loadSync();
      if (events.length === 0) throw new NoPetError();
      const json = `${JSON.stringify(makeExport(events, ctx.now()), null, 2)}\n`;
      if (opts.out) {
        writeFileSync(resolve(ctx.cwd, opts.out), json);
        ctx.out(`Exported ${events.length} events to ${opts.out}\n`);
      } else {
        ctx.out(json);
      }
    });

  program
    .command('import')
    .description('replace your pet with one from an export file (the old log is backed up)')
    .argument('<file>', 'a file made by `dmn export` or the web app')
    .option('-y, --yes', 'do not ask for confirmation')
    .action(async (file: string, opts: { yes?: boolean }) => {
      let text: string;
      try {
        text = readFileSync(resolve(ctx.cwd, file), 'utf8');
      } catch {
        throw new UserError(`Cannot read ${file}.`);
      }
      const events = parseExport(text);
      const existing = ctx.store.loadSync().state;
      if (existing && !opts.yes) {
        const answer = await ctx.ask(
          `Replace ${existing.name} with the imported pet? The current log is backed up. [y/N] `,
        );
        if (!/^\s*y/i.test(answer)) {
          ctx.out('Import cancelled.\n');
          return;
        }
      }
      const state = ctx.store.replaceAllSync(events);
      ctx.out(`Imported ${events.length} events. Say hi to ${c.bold(state.name)}!\n`);
    });

  return program;
}

/** The `dmn prompt` line, read from the cached snapshot only. */
export function promptLine(ctx: Context): string {
  return promptLineFor(ctx.store.readSnapshot()?.state ?? null, ctx.now());
}

/** Runs the CLI with `argv` (without node/script). Returns the exit code. */
export async function runCli(argv: string[], ctx: Context): Promise<number> {
  const program = buildProgram(ctx);
  if (argv.length === 0) {
    const { state } = ctx.store.loadSync();
    if (state) {
      ctx.out(statusView(stateAtNow(state, ctx.now()), ctx.now(), ctx.colors));
      return 0;
    }
    ctx.out(`${petSaysWelcome()}\n\n`);
    program.outputHelp();
    return 0;
  }
  try {
    await program.parseAsync(argv, { from: 'user' });
    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }
    if (error instanceof UserError || error instanceof NoPetError || error instanceof ImportError) {
      ctx.err(`${ctx.colors.yellow('!')} ${error.message}\n`);
      return 1;
    }
    const message = error instanceof Error ? error.message : String(error);
    ctx.err(`${ctx.colors.red('Something went wrong:')} ${message}\n`);
    return 1;
  }
}

function petSaysWelcome(): string {
  return 'Welcome to Daemonling: a tiny daemon that lives on your focus.\nStart with `dmn init --name <name>`.';
}
