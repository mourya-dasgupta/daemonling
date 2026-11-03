import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { reduce } from '@daemonling/core';
import type { PetState } from '@daemonling/core';
import { Den } from '../src/components/screens';
import { denView, traitShares } from '../src/logic';
import { hatched, pet, T0, T0_MS } from './fixtures';

const tick = (state: PetState, stats: Partial<PetState['stats']>, at = T0) =>
  reduce({ ...state, reactions: [], stats: { ...state.stats, ...stats } }, { type: 'TICK', at });

describe('den state mapping', () => {
  it('maps every condition to a mood and label', () => {
    expect(denView(pet(), T0).mood).toBe('egg');
    expect(denView(tick(hatched(), { mood: 90, satiety: 90, energy: 90 }), T0)).toMatchObject({
      mood: 'happy',
      label: 'Happy',
    });
    expect(denView(tick(hatched(), { mood: 50 }), T0).mood).toBe('idle');
    expect(denView(tick(hatched(), { mood: 10 }), T0).mood).toBe('sad');
    expect(denView(tick(hatched(), { health: 20 }), T0).mood).toBe('sick');
    expect(denView(tick(hatched(), { mood: 50 }), '2026-11-02T23:30:00.000Z').mood).toBe(
      'sleeping',
    );
    const cocoon = reduce(hatched(), { type: 'TICK', at: '2026-11-12T09:00:00.000Z' });
    expect(denView(cocoon, '2026-11-12T09:00:00.000Z')).toMatchObject({
      mood: 'cocoon',
      label: 'Hibernating in a cocoon',
    });
    expect(denView(reduce(hatched(), { type: 'CI_PASSED', at: T0 }), T0).mood).toBe('dance');
  });

  it('ranks species by weighted traits', () => {
    const state = hatched();
    const shares = traitShares({
      ...state,
      traits: { depth: 1, sprint: 6, balance: 0, craft: 3, night: 0 },
    });
    expect(shares[0]?.species).toBe('sprintail');
    expect(shares[0]?.share).toBeCloseTo(4 / 6);
    expect(traitShares(pet()).every((s) => s.share === 0)).toBe(true);
  });
});

describe('<Den>', () => {
  it('renders the pet in the right mood with stats and petting', async () => {
    const onEvents = vi.fn(async () => undefined);
    const state = tick(hatched(), { mood: 10 });
    const { container } = render(<Den state={state} events={[]} now={T0_MS} onEvents={onEvents} />);
    expect(container.querySelector('.pet-svg')).toHaveAttribute('data-mood', 'sad');
    expect(container.querySelector('svg')).toHaveClass('dl-mood-sad');
    expect(screen.getByRole('heading', { name: 'Bit' })).toBeInTheDocument();
    expect(screen.getByText('A bit sad')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Mood' })).toHaveAttribute('aria-valuenow', '10');
    await userEvent.click(screen.getByRole('button', { name: 'Pet Bit' }));
    expect(onEvents).toHaveBeenCalledWith({ type: 'PET_PETTED', at: T0 });
  });
});
