import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbStore } from '@daemonling/store';
import { App } from '../src/App';
import { T0_MS } from './fixtures';

describe('<App>', () => {
  it('hatches a pet, focuses, and visits every screen', async () => {
    const store = new IndexedDbStore({ factory: new IDBFactory() });
    let now = T0_MS;
    render(<App store={store} clock={() => now} newId={() => 'id-1'} />);

    await userEvent.clear(await screen.findByLabelText('Name your egg'));
    await userEvent.type(screen.getByLabelText('Name your egg'), 'Mochi');
    await userEvent.click(screen.getByRole('button', { name: 'Hatch my daemon' }));
    expect(await screen.findByRole('heading', { name: 'Mochi' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Focus' }));
    await userEvent.click(screen.getByRole('button', { name: 'Start 25-minute session' }));
    expect(await screen.findByRole('timer')).toBeInTheDocument();
    expect((await store.load()).state?.activeSession?.plannedMinutes).toBe(25);

    await userEvent.click(screen.getByRole('button', { name: 'I got distracted' }));
    await screen.findByRole('button', { name: /Start/ });

    await userEvent.click(screen.getByRole('tab', { name: 'Stats' }));
    expect(screen.getByRole('heading', { name: 'This week' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Focus minutes per day/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Journal' }));
    expect(screen.getByRole('heading', { name: "Mochi's journal" })).toBeInTheDocument();
    expect(screen.getByText(/An egg appeared/)).toBeInTheDocument();

    // Keyboard navigation between tabs.
    screen.getByRole('tab', { name: 'Journal' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');

    await userEvent.clear(screen.getByLabelText('Daily goal (minutes)'));
    await userEvent.type(screen.getByLabelText('Daily goal (minutes)'), '60');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(async () =>
      expect((await store.load()).state?.settings.dailyGoalMinutes).toBe(60),
    );

    await userEvent.clear(screen.getByLabelText('Time zone'));
    await userEvent.type(screen.getByLabelText('Time zone'), 'Mars/Base');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(screen.getByRole('status')).toHaveTextContent('not a time zone');

    await userEvent.click(screen.getByRole('checkbox'));
    await waitFor(async () => expect((await store.load()).state?.vacation).toBe(true));

    await userEvent.click(screen.getByRole('button', { name: 'dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(await screen.findByRole('button', { name: 'Hatch my daemon' })).toBeInTheDocument();
    now += 1;
  });
});
