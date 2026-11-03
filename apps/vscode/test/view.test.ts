import { describe, expect, it } from 'vitest';
import { createPet, reduce } from '@daemonling/core';
import type { PetEvent } from '@daemonling/core';
import { denHtml, menuItems, statusBarView } from '../src/view.js';

const T0 = '2026-11-02T09:00:00.000Z';
const pet = (...events: PetEvent[]) =>
  events.reduce(
    reduce,
    createPet({
      type: 'PET_CREATED',
      at: T0,
      id: 'p',
      name: 'Bit <3',
      settings: { timezone: 'UTC' },
    }),
  );

describe('status bar', () => {
  it('invites hatching when there is no pet', () => {
    expect(statusBarView(null, T0).text).toContain('Daemonling');
    expect(menuItems(null)[0]?.command).toBe('daemonling.init');
  });

  it('shows face, condition and remaining session time', () => {
    expect(statusBarView(pet(), T0).text).toBe('(  ) content');
    const focusing = pet({ type: 'SESSION_STARTED', at: T0, plannedMinutes: 25 });
    expect(statusBarView(focusing, '2026-11-02T09:05:00.000Z').text).toBe('(  ) 20:00');
    expect(statusBarView(focusing, T0).tooltip).toContain('Bit <3');
  });

  it('offers start options or an honest stop', () => {
    expect(
      menuItems(pet())
        .filter((i) => i.command === 'daemonling.start')
        .map((i) => i.args),
    ).toEqual([[25], [50], [90]]);
    const focusing = pet({ type: 'SESSION_STARTED', at: T0, plannedMinutes: 25 });
    expect(menuItems(focusing)[0]?.command).toBe('daemonling.distracted');
  });
});

describe('den webview', () => {
  it('renders the SVG pet with a strict CSP and escaped name', () => {
    const html = denHtml(pet(), T0, 'abc', 'vscode-resource:');
    expect(html).toContain("script-src 'nonce-abc'");
    expect(html).toContain('<svg');
    expect(html).toContain('Bit &lt;3');
    expect(html).toContain('data-cmd="start"');
    const focusing = denHtml(
      pet({ type: 'SESSION_STARTED', at: T0, plannedMinutes: 25 }),
      T0,
      'n',
      's',
    );
    expect(focusing).toContain('data-cmd="distracted"');
    expect(focusing).toContain('25:00');
    expect(denHtml(null, T0, 'n', 's')).toContain('dmn init');
  });
});
