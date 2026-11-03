import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { colorEnabled } from '../src/context.js';
import { makeColors, stripAnsi } from '../src/color.js';
import { addBlock, HOOK_START, removeBlock } from '../src/hook.js';
import { bar, sideBySide } from '../src/render.js';
import { isHonestAnswer, minutesSince } from '../src/session.js';
import { harness } from './harness.js';

describe('dmn end to end', () => {
  it('init → start → status → badge', async () => {
    const h = harness();
    const init = await h.run('init', '--name', 'Pixel', '--timezone', 'UTC', '--goal', '25');
    expect(init.code).toBe(0);
    expect(init.out).toContain('Its name is Pixel');

    const start = await h.run('start', '25', '--task', 'write tests', '--test-duration-ms', '50');
    expect(start.code).toBe(0);
    expect(start.out).toContain('focusing with you for 25 minutes on write tests');
    expect(start.out).toContain('Session complete! +25 xp');

    const status = await h.run('status');
    expect(status.code).toBe(0);
    expect(status.out).toContain('Pixel the egg (egg)');
    expect(status.out).toMatch(/XP\s+25/);
    expect(status.out).toMatch(/Streak\s+1 day/);
    expect(status.out).toContain('Satiety');

    const badge = await h.run('badge', '--out', 'card.svg');
    expect(badge.code).toBe(0);
    const svg = readFileSync(join(h.cwd, 'card.svg'), 'utf8');
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('Pixel');
  });

  it('hatches after three sessions and shows stats, journal and prompt', async () => {
    const h = harness();
    await h.run('init', '--timezone', 'UTC');
    for (let i = 0; i < 3; i++) await h.run('start', '30', '--test-duration-ms', '10');
    const status = await h.run('status');
    expect(status.out).toContain('the sprout (hatchling)');
    const stats = await h.run('stats', '--week');
    expect(stats.out).toContain('Sessions      3');
    expect(stats.out).toContain('Mon 11-02');
    expect(stats.out).toMatch(/90m ✓/);
    const journal = await h.run('journal');
    expect(journal.out).toContain('week of 2026-11-02');
    expect(journal.out).toContain('3 focus sessions');
    expect((await h.run('journal', '--week', 'nope')).code).toBe(1);
    const prompt = await h.run('prompt');
    expect(prompt.out).toMatch(/^\S+ Bit (thriving|content)( 1d)?\n$/);
  });

  it('Ctrl+C asks for honesty, and honesty pays', async () => {
    const h = harness();
    await h.run('init', '--timezone', 'UTC');
    const sleep = h.ctx.sleep;
    let slept = 0;
    h.ctx.sleep = async (ms) => {
      await sleep(ms);
      slept += ms;
      if (slept >= 10 * 60_000) h.interrupt();
    };
    h.answers.push('y');
    const honest = await h.run('start', '25');
    expect(honest.out).toContain('Thanks for telling me');
    const xpHonest = h.ctx.store.loadSync().state!.xp;
    expect(xpHonest).toBe(5);

    slept = 0;
    h.answers.push('n');
    await h.run('start', '25');
    expect(h.ctx.store.loadSync().state!.xp).toBe(7);
  });

  it('pet, break, distracted, vacation and settings', async () => {
    const h = harness();
    expect((await h.run('pet')).err).toContain('dmn init');
    await h.run('init', '--timezone', 'UTC');
    expect((await h.run('pet')).out).toContain('prrrr');
    expect((await h.run('break', '15')).out).toContain('Good break');
    expect((await h.run('break', '5')).out).toContain('10+ minutes');
    expect((await h.run('distracted')).err).toContain('No session');
    h.ctx.store.appendSync([{ type: 'SESSION_STARTED', at: h.ctx.now(), plannedMinutes: 25 }]);
    h.clock.now += 12 * 60_000;
    expect((await h.run('distracted')).out).toContain('Thanks for telling me');
    expect(h.ctx.store.loadSync().state!.xp).toBe(6);
    expect((await h.run('vacation', 'on')).out).toContain('Vacation mode is on');
    expect((await h.run('status')).out).toContain('On vacation');
    expect((await h.run('vacation', 'off')).out).toContain('Welcome back');
    expect((await h.run('vacation', 'maybe')).code).toBe(1);
    const settings = await h.run(
      'settings',
      '--goal',
      '90',
      '--name',
      'Nyx',
      '--timezone',
      'Asia/Kolkata',
    );
    expect(settings.out).toContain('goal       90 minutes/day');
    expect(settings.out).toContain('Asia/Kolkata');
    expect(settings.out).toContain('Nyx');
    expect((await h.run('settings', '--goal', '5')).code).not.toBe(0);
  });

  it('refuses a second init and shows help for no pet', async () => {
    const h = harness();
    const empty = await h.run();
    expect(empty.out).toContain('dmn init');
    expect(empty.out).toContain('Usage: dmn');
    await h.run('init');
    expect((await h.run('init')).err).toContain('already have a daemon named Bit');
    expect((await h.run()).out).toContain('Bit the egg');
    expect((await h.run('--version')).out).toContain('0.1.0');
    expect((await h.run('nope')).code).not.toBe(0);
  });

  it('resumes a session already running', async () => {
    const h = harness();
    await h.run('init', '--timezone', 'UTC');
    h.ctx.store.appendSync([{ type: 'SESSION_STARTED', at: h.ctx.now(), plannedMinutes: 25 }]);
    h.clock.now += 20 * 60_000;
    const run = await h.run('start');
    expect(run.out).toContain('Resuming');
    expect(run.out).toContain('Session complete!');
    expect(h.ctx.store.loadSync().state!.xp).toBe(25);
    expect((await h.run('prompt')).out).toMatch(/Bit/);
  });

  it('records commits only during a session; ci-passed always', async () => {
    const h = harness();
    expect((await h.run('event', 'commit')).code).toBe(0);
    await h.run('init', '--timezone', 'UTC');
    await h.run('event', 'commit', '--sha', 'abc');
    expect(h.ctx.store.loadSync().state!.traits.craft).toBe(0);
    h.ctx.store.appendSync([{ type: 'SESSION_STARTED', at: h.ctx.now(), plannedMinutes: 25 }]);
    await h.run('event', 'commit', '--sha', 'abc');
    expect(h.ctx.store.loadSync().state!.traits.craft).toBe(1);
    await h.run('event', 'ci-passed');
    expect(h.ctx.store.loadSync().state!.traits.craft).toBe(3);
    expect((await h.run('event', 'deploy')).code).toBe(1);
    expect((await h.run('prompt')).out).toMatch(/Bit 25m/);
  });

  it('exports and imports', async () => {
    const a = harness();
    await a.run('init', '--name', 'Export', '--timezone', 'UTC');
    await a.run('start', '25', '--test-duration-ms', '10');
    const json = (await a.run('export')).out;
    expect(JSON.parse(json).format).toBe('daemonling-export');
    expect((await a.run('export', '--out', 'backup.json')).out).toContain('Exported 3 events');

    const b = harness();
    writeFileSync(join(b.cwd, 'in.json'), json);
    expect((await b.run('import', 'in.json')).out).toContain('Say hi to Export');
    expect(b.ctx.store.loadSync().state!.xp).toBe(25);
    b.answers.push('n');
    expect((await b.run('import', 'in.json')).out).toContain('cancelled');
    expect((await b.run('import', 'in.json', '--yes')).code).toBe(0);
    writeFileSync(join(b.cwd, 'bad.json'), '{"nope":1}');
    expect((await b.run('import', 'bad.json')).err).toContain('does not look like');
    expect((await b.run('import', 'missing.json')).err).toContain('Cannot read');
    expect((await harness().run('export')).code).toBe(1);
  });

  it('rubber duck asks questions and summarises', async () => {
    const h = harness();
    await h.run('init');
    h.lines.push('my test fails with an error', 'it works locally', 'bye');
    const duck = await h.run('duck');
    expect(duck.out).toContain('Bit> What did you expect to happen instead?');
    expect(duck.out).toContain('What you said:');
    expect(duck.out).toContain('You started with: "my test fails with an error"');
  });

  it('installs and uninstalls the git hook', async () => {
    const h = harness();
    execFileSync('git', ['init', '-q'], { cwd: h.cwd });
    const install = await h.run('hook', 'install');
    expect(install.code).toBe(0);
    const path = join(h.cwd, '.git', 'hooks', 'post-commit');
    expect(readFileSync(path, 'utf8')).toContain('dmn event commit');
    await h.run('hook', 'install');
    expect(readFileSync(path, 'utf8').split(HOOK_START)).toHaveLength(2);
    expect((await h.run('hook', 'uninstall')).out).toContain('Removed');
    expect(existsSync(path)).toBe(false);
    expect((await h.run('hook', 'uninstall')).out).toContain('No Daemonling hook');
    writeFileSync(path, '#!/bin/sh\necho mine\n');
    expect((await h.run('hook', 'uninstall')).out).toContain('No Daemonling hook');
    const notRepo = harness();
    expect((await notRepo.run('hook', 'install')).err).toContain('not inside a git repository');
  });
});

describe('helpers', () => {
  it('hook blocks preserve existing scripts', () => {
    const mine = '#!/bin/sh\necho mine\n';
    const added = addBlock(mine);
    expect(added).toContain('echo mine');
    expect(addBlock(added)).toBe(added);
    expect(removeBlock(added)).toBe(mine);
    expect(removeBlock(addBlock(null))).toBeNull();
  });

  it('respects NO_COLOR and FORCE_COLOR', () => {
    expect(colorEnabled({ NO_COLOR: '1' }, true)).toBe(false);
    expect(colorEnabled({ FORCE_COLOR: '1' }, false)).toBe(true);
    expect(colorEnabled({}, true)).toBe(true);
    expect(colorEnabled({}, false)).toBe(false);
    expect(stripAnsi(makeColors(true).red('x'))).toBe('x');
    expect(makeColors(false).red('x')).toBe('x');
  });

  it('formats bars, layouts and answers', () => {
    expect(bar(50)).toBe('█████░░░░░');
    expect(sideBySide(['ab', 'c'], ['1', '2', '3'])).toEqual(['ab   1', 'c    2', '     3']);
    expect(isHonestAnswer(' Yes')).toBe(true);
    expect(isHonestAnswer('')).toBe(false);
    expect(minutesSince('2026-11-02T09:00:00Z', '2026-11-02T09:10:59Z')).toBe(10);
  });
});
