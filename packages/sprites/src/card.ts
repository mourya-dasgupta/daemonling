import type { PetState } from '@daemonling/core';
import { moodFor, SPECIES_LABEL } from './mood.js';
import { escapeXml, renderPetSvg } from './svg.js';

/** Options for {@link renderCard}. */
export interface CardOptions {
  /** Instant used to decide the pet's mood (night = sleeping). Defaults to the last event. */
  nowIso?: string;
}

const CONDITION_LABEL: Record<PetState['condition'], string> = {
  thriving: 'Thriving',
  content: 'Content',
  sad: 'A bit sad',
  sick: 'Under the weather',
  hibernating: 'Hibernating',
};

function bar(x: number, y: number, label: string, value: number): string {
  const width = Math.round((Math.max(0, Math.min(100, value)) / 100) * 120);
  return (
    `<text class="muted" x="${x}" y="${y + 8}" font-size="11">${label}</text>` +
    `<rect class="track" x="${x + 52}" y="${y}" width="120" height="9" rx="4.5"/>` +
    `<rect class="fill" x="${x + 52}" y="${y}" width="${width}" height="9" rx="4.5"/>`
  );
}

/**
 * Renders a self-contained README card (SVG, 495×170): the pet, its name, species, stage, streak
 * and condition, with light/dark themes via `prefers-color-scheme`. No external assets.
 */
export function renderCard(state: PetState, options: CardOptions = {}): string {
  const mood = moodFor(state, options.nowIso ?? state.lastEventAt);
  const name = escapeXml(state.name);
  const species = SPECIES_LABEL[state.species];
  const pet = renderPetSvg({
    species: state.species,
    mood,
    size: 130,
    idPrefix: 'card-pet',
  }).replace('<svg ', '<svg x="18" y="20" ');
  const streak = state.streak.current === 1 ? '1-day streak' : `${state.streak.current}-day streak`;
  const css =
    ':root{color-scheme:light dark}' +
    '.bg{fill:#fff8ef;stroke:#ead9c4}.title{fill:#3b2a20}.muted{fill:#7a6352}.track{fill:#f0e2d0}' +
    '.fill{fill:#e0793f}.chip{fill:#ffe9d2}.chip-text{fill:#9a4a1c}' +
    '@media (prefers-color-scheme: dark){.bg{fill:#1f1a24;stroke:#3a3142}.title{fill:#f6ece1}' +
    '.muted{fill:#b9a99a}.track{fill:#3a3142}.fill{fill:#f3a26b}.chip{fill:#3d2b25}.chip-text{fill:#ffcfa8}}' +
    'text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="170" viewBox="0 0 495 170" ` +
    `role="img" aria-labelledby="card-title">` +
    `<title id="card-title">${name}, a ${escapeXml(species)} daemonling (${state.stage}). ` +
    `${escapeXml(streak)}. ${CONDITION_LABEL[state.condition]}.</title>` +
    `<style>${css}</style>` +
    `<rect class="bg" x="0.5" y="0.5" width="494" height="169" rx="14"/>` +
    pet +
    `<text class="title" x="170" y="44" font-size="22" font-weight="700">${name}</text>` +
    `<text class="muted" x="170" y="66" font-size="13">${escapeXml(species)} · ${state.stage} · ${Math.floor(state.xp)} xp</text>` +
    `<rect class="chip" x="170" y="76" width="${CONDITION_LABEL[state.condition].length * 7 + 20}" height="20" rx="10"/>` +
    `<text class="chip-text" x="180" y="90" font-size="12" font-weight="600">${CONDITION_LABEL[state.condition]}</text>` +
    `<text class="title" x="${CONDITION_LABEL[state.condition].length * 7 + 200}" y="90" font-size="13" font-weight="600">${escapeXml(streak)}</text>` +
    bar(170, 108, 'Satiety', state.stats.satiety) +
    bar(170, 124, 'Mood', state.stats.mood) +
    `<text class="muted" x="170" y="156" font-size="11">fed by focus · daemonling</text>` +
    `</svg>`
  );
}
