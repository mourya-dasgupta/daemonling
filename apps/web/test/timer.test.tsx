import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Focus } from '../src/components/screens';
import { minutesDone, timerView } from '../src/logic';
import { pet, T0, T0_MS } from './fixtures';

const running = () => pet({ type: 'SESSION_STARTED', at: T0, plannedMinutes: 25, task: 'tests' });

describe('timerView', () => {
  it('is idle without a session', () => {
    expect(timerView(pet(), T0_MS).phase).toBe('idle');
    expect(minutesDone(pet(), T0_MS)).toBe(0);
  });

  it('counts down and finishes', () => {
    const state = running();
    expect(timerView(state, T0_MS + 60_000)).toMatchObject({
      phase: 'running',
      remainingSeconds: 1440,
      task: 'tests',
    });
    expect(timerView(state, T0_MS + 25 * 60_000)).toMatchObject({
      phase: 'done',
      remainingSeconds: 0,
      progress: 1,
    });
    expect(minutesDone(state, T0_MS + 7.5 * 60_000)).toBe(7);
  });
});

describe('<Focus>', () => {
  it('starts a session with the chosen length and task', async () => {
    const onEvents = vi.fn(async () => undefined);
    render(<Focus state={pet()} events={[]} now={T0_MS} onEvents={onEvents} />);
    await userEvent.click(screen.getByRole('button', { name: '50 min' }));
    expect(screen.getByRole('button', { name: '50 min' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.type(screen.getByLabelText(/working on/), 'parser');
    await userEvent.click(screen.getByRole('button', { name: 'Start 50-minute session' }));
    expect(onEvents).toHaveBeenCalledWith({
      type: 'SESSION_STARTED',
      at: T0,
      plannedMinutes: 50,
      task: 'parser',
    });
  });

  it('shows the countdown and stops honestly', async () => {
    const onEvents = vi.fn(async () => undefined);
    render(<Focus state={running()} events={[]} now={T0_MS + 10 * 60_000} onEvents={onEvents} />);
    expect(screen.getByRole('timer')).toHaveTextContent('15:00');
    expect(screen.getByRole('heading')).toHaveTextContent('Focusing: tests');
    await userEvent.click(screen.getByRole('button', { name: 'I got distracted' }));
    expect(onEvents).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DISTRACTION_REPORTED', minutesDone: 10 }),
    );
  });

  it('completes the session when the timer reaches zero', () => {
    const onEvents = vi.fn(async () => undefined);
    render(<Focus state={running()} events={[]} now={T0_MS + 25 * 60_000} onEvents={onEvents} />);
    expect(onEvents).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SESSION_COMPLETED', minutes: 25 }),
    );
  });

  it('logs a break from the idle screen', async () => {
    const onEvents = vi.fn(async () => undefined);
    render(<Focus state={pet()} events={[]} now={T0_MS} onEvents={onEvents} />);
    await userEvent.click(screen.getByRole('button', { name: /10-minute break/ }));
    expect(onEvents).toHaveBeenCalledWith({ type: 'BREAK_TAKEN', at: T0, minutes: 10 });
  });
});

describe('timerView clamping', () => {
  it('never shows more than the planned time', () => {
    const state = pet({ type: 'SESSION_STARTED', at: T0, plannedMinutes: 25 });
    expect(timerView(state, T0_MS - 900).remainingSeconds).toBe(1500);
  });
});
