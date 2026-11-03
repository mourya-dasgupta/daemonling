import type { Species } from '@daemonling/core';
import type { Mood } from './mood.js';

/** Colours for one species. Defined once; exposed to CSS as custom properties. */
export interface Palette {
  body: string;
  accent: string;
  glow: string;
  ink: string;
  cheek: string;
}

/** The single source of truth for pet colours. */
export const PALETTES: Record<Species, Palette> = {
  unhatched: {
    body: '#fff1d6',
    accent: '#f4b860',
    glow: '#ffe2a8',
    ink: '#5b3d1e',
    cheek: '#ffb3a1',
  },
  sprout: { body: '#bfe9cc', accent: '#3f9e6b', glow: '#c6f7d4', ink: '#22382b', cheek: '#ff9fa3' },
  owlbyte: {
    body: '#cfc8f3',
    accent: '#6c5ce7',
    glow: '#9fa8ff',
    ink: '#2a2350',
    cheek: '#f7a6c4',
  },
  sprintail: {
    body: '#ffd29e',
    accent: '#f0642d',
    glow: '#ffd6a0',
    ink: '#4a2511',
    cheek: '#ff8f8f',
  },
  zenpaca: {
    body: '#f6efe6',
    accent: '#b88d62',
    glow: '#f3e3c3',
    ink: '#4b3a2a',
    cheek: '#f5a9a0',
  },
  shipwyrm: {
    body: '#9fe0d6',
    accent: '#1b8a78',
    glow: '#a8f0e0',
    ink: '#163a35',
    cheek: '#ff9e9e',
  },
  nocturne: {
    body: '#3a4175',
    accent: '#ffe27a',
    glow: '#6b74c9',
    ink: '#f1f1ff',
    cheek: '#c58bd8',
  },
};

/** Options for {@link renderPetSvg}. */
export interface PetSvgOptions {
  species: Species;
  mood: Mood;
  /** Rendered width/height in px (the viewBox is always 120×120). Default 120. */
  size?: number;
  /** Prefix for element ids, so several pets can share a page. Default `dl`. */
  idPrefix?: string;
  /** Set false for a still image (e.g. thumbnails). Default true. */
  animated?: boolean;
  /** Accessible title. */
  title?: string;
}

/** Escapes text for safe inclusion in XML/HTML. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Shared CSS for pet SVGs: theming via custom properties, motion with a reduced-motion fallback. */
export const PET_CSS = `
.dl-svg .dl-body{fill:var(--dl-body)}
.dl-svg .dl-accent{fill:var(--dl-accent)}
.dl-svg .dl-ink{fill:var(--dl-ink)}
.dl-svg .dl-line{stroke:var(--dl-ink);stroke-width:3;stroke-linecap:round;fill:none}
.dl-svg .dl-stem{stroke:var(--dl-accent);stroke-width:3;stroke-linecap:round;fill:none}
.dl-svg .dl-cheek{fill:var(--dl-cheek);opacity:.7}
.dl-svg .dl-anim,.dl-svg .dl-tip{transform-box:fill-box;transform-origin:50% 100%}
@keyframes dl-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes dl-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.03,.97)}}
@keyframes dl-shiver{0%,100%{transform:translateX(0)}25%{transform:translateX(-1px)}75%{transform:translateX(1px)}}
@keyframes dl-dance{0%,100%{transform:rotate(-6deg) translateY(0)}50%{transform:rotate(6deg) translateY(-6px)}}
@keyframes dl-wobble{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes dl-glow{0%,100%{opacity:.55}50%{opacity:.9}}
@keyframes dl-float{0%{opacity:.5;transform:translateY(4px)}50%{opacity:1}100%{opacity:0;transform:translateY(-8px)}}
.dl-animated .dl-glow{animation:dl-glow 4s ease-in-out infinite}
.dl-animated.dl-mood-idle .dl-anim{animation:dl-bob 3s ease-in-out infinite}
.dl-animated.dl-mood-happy .dl-anim{animation:dl-bob 1.6s ease-in-out infinite}
.dl-animated.dl-mood-sad .dl-anim{animation:dl-breathe 5s ease-in-out infinite}
.dl-animated.dl-mood-sick .dl-anim{animation:dl-shiver .6s linear infinite}
.dl-animated.dl-mood-sleeping .dl-anim,.dl-animated.dl-mood-cocoon .dl-anim{animation:dl-breathe 4s ease-in-out infinite}
.dl-animated.dl-mood-dance .dl-anim{animation:dl-dance .8s ease-in-out infinite}
.dl-animated.dl-mood-egg .dl-anim{animation:dl-wobble 2.4s ease-in-out infinite}
.dl-animated .dl-z{animation:dl-float 3s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.dl-svg *{animation:none!important}}
`;

function eyes(mood: Mood, species: Species): string {
  const big = species === 'owlbyte';
  const r = big ? 8 : 5.5;
  switch (mood) {
    case 'happy':
    case 'dance':
      return '<path class="dl-line" d="M41 64 q6 -8 12 0 M67 64 q6 -8 12 0"/>';
    case 'sleeping':
      return '<path class="dl-line" d="M41 63 q6 5 12 0 M67 63 q6 5 12 0"/>';
    case 'sad':
      return (
        '<path class="dl-line" d="M40 58 l10 -5 M80 58 l-10 -5"/>' +
        '<circle class="dl-ink" cx="47" cy="65" r="4"/><circle class="dl-ink" cx="73" cy="65" r="4"/>'
      );
    case 'sick':
      // Dizzy, droopy eyes: unwell, never "dead".
      return (
        '<path class="dl-line" d="M41 66 q6 -6 12 0 M67 66 q6 -6 12 0"/>' +
        '<circle class="dl-ink" cx="47" cy="66" r="2.5"/><circle class="dl-ink" cx="73" cy="66" r="2.5"/>'
      );
    default:
      return (
        `<circle class="dl-ink" cx="47" cy="63" r="${r}"/><circle class="dl-ink" cx="73" cy="63" r="${r}"/>` +
        `<circle fill="#fff" cx="${49 + (big ? 2 : 0)}" cy="${61 - (big ? 2 : 0)}" r="${big ? 2.6 : 1.8}"/>` +
        `<circle fill="#fff" cx="${75 + (big ? 2 : 0)}" cy="${61 - (big ? 2 : 0)}" r="${big ? 2.6 : 1.8}"/>`
      );
  }
}

function mouth(mood: Mood): string {
  switch (mood) {
    case 'happy':
      return '<path class="dl-line" d="M52 76 q8 9 16 0"/>';
    case 'dance':
      return '<ellipse class="dl-ink" cx="60" cy="79" rx="5" ry="6"/>';
    case 'sad':
      return '<path class="dl-line" d="M53 82 q7 -7 14 0"/>';
    case 'sick':
      return '<path class="dl-line" d="M50 80 q3 -3 5 0 t5 0 t5 0 t5 0"/>';
    case 'sleeping':
      return '<circle class="dl-ink" cx="60" cy="79" r="2.5"/>';
    default:
      return '<path class="dl-line" d="M53 77 q3.5 4 7 0 q3.5 4 7 0"/>';
  }
}

function antennae(mood: Mood, species: Species): string {
  const droop = mood === 'sad' || mood === 'sick';
  const [lx, ly, rx, ry] = droop ? [30, 34, 90, 34] : [40, 14, 80, 14];
  const stems = `<path class="dl-stem" d="M48 40 Q${lx + 2} ${ly + 12} ${lx} ${ly} M72 40 Q${rx - 2} ${ry + 12} ${rx} ${ry}"/>`;
  let tips = `<circle class="dl-accent dl-tip" cx="${lx}" cy="${ly}" r="4.5"/><circle class="dl-accent dl-tip" cx="${rx}" cy="${ry}" r="4.5"/>`;
  if (species === 'sprout') {
    tips =
      `<ellipse class="dl-accent" cx="${lx}" cy="${ly}" rx="7" ry="3.5" transform="rotate(-30 ${lx} ${ly})"/>` +
      `<ellipse class="dl-accent" cx="${rx}" cy="${ry}" rx="7" ry="3.5" transform="rotate(30 ${rx} ${ry})"/>`;
  }
  return stems + tips;
}

function speciesBack(species: Species): string {
  switch (species) {
    case 'zenpaca':
      return [0, 40, 80, 120, 160, 200, 240, 280, 320]
        .map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return `<circle class="dl-body" cx="${(60 + Math.cos(rad) * 34).toFixed(1)}" cy="${(70 + Math.sin(rad) * 29).toFixed(1)}" r="11"/>`;
        })
        .join('');
    case 'sprintail':
      return (
        '<path class="dl-accent" d="M88 84 q22 4 26 -14 q-4 14 -22 20 z"/>' +
        '<path class="dl-stem" d="M98 96 h14 M94 102 h10" opacity=".7"/>'
      );
    case 'shipwyrm':
      return (
        '<path class="dl-accent" d="M26 62 l-16 -10 l6 20 z M94 62 l16 -10 l-6 20 z"/>' +
        '<path class="dl-accent" d="M44 42 l-4 -12 l10 8 z M76 42 l4 -12 l-10 8 z"/>'
      );
    case 'owlbyte':
      return '<path class="dl-accent" d="M34 46 l-4 -16 l14 10 z M86 46 l4 -16 l-14 10 z"/>';
    default:
      return '';
  }
}

function speciesFront(species: Species): string {
  switch (species) {
    case 'nocturne':
      return (
        '<circle class="dl-accent" cx="60" cy="47" r="7"/>' +
        '<circle class="dl-body" cx="63.5" cy="45" r="6"/>'
      );
    case 'shipwyrm':
      return (
        '<rect x="80" y="86" width="20" height="14" rx="2" fill="#a0612b"/>' +
        '<rect x="80" y="86" width="20" height="5" rx="2" fill="#f5c542"/>' +
        '<rect x="88" y="90" width="4" height="4" fill="#f5c542"/>'
      );
    default:
      return '';
  }
}

function extras(mood: Mood): string {
  switch (mood) {
    case 'sleeping':
      return '<text class="dl-ink dl-z" x="88" y="30" font-family="monospace" font-size="14">z</text>';
    case 'sick':
      return '<rect x="70" y="40" width="12" height="5" rx="2" fill="#fff" stroke="var(--dl-ink)" transform="rotate(-20 76 42)"/>';
    case 'dance':
      return '<path class="dl-line" d="M26 70 l-12 -12 M94 70 l12 -12"/>';
    default:
      return '';
  }
}

function eggBody(): string {
  return (
    '<g class="dl-anim"><ellipse class="dl-body" cx="60" cy="68" rx="30" ry="38" stroke="var(--dl-accent)" stroke-width="3"/>' +
    '<circle class="dl-accent" cx="48" cy="56" r="5"/><circle class="dl-accent" cx="70" cy="76" r="7"/>' +
    '<circle class="dl-accent" cx="56" cy="90" r="3.5"/></g>'
  );
}

function cocoonBody(): string {
  return (
    '<g class="dl-anim"><ellipse class="dl-body" cx="60" cy="68" rx="34" ry="40" stroke="var(--dl-accent)" stroke-width="3"/>' +
    '<path class="dl-stem" d="M30 52 q30 10 60 -4 M28 70 q32 10 64 -4 M32 88 q28 8 56 -4"/>' +
    '<text class="dl-ink dl-z" x="84" y="26" font-family="monospace" font-size="14">z</text></g>'
  );
}

/**
 * Renders the pet as a self-contained SVG string built from simple shapes. Colours come from
 * {@link PALETTES} via CSS custom properties (override `--dl-body` etc. to theme it).
 */
export function renderPetSvg(options: PetSvgOptions): string {
  const { species, mood, size = 120, idPrefix = 'dl', animated = true } = options;
  const palette = PALETTES[species];
  const id = idPrefix.replace(/[^a-zA-Z0-9_-]/g, '');
  const vars = `--dl-body:${palette.body};--dl-accent:${palette.accent};--dl-glow:${palette.glow};--dl-ink:${palette.ink};--dl-cheek:${palette.cheek}`;
  const title = escapeXml(options.title ?? `A ${species} daemonling, feeling ${mood}`);
  let figure: string;
  if (mood === 'egg' || species === 'unhatched') {
    figure = eggBody();
  } else if (mood === 'cocoon') {
    figure = cocoonBody();
  } else {
    const cheeks =
      mood === 'idle' || mood === 'happy' || mood === 'dance'
        ? '<ellipse class="dl-cheek" cx="38" cy="74" rx="6" ry="3.5"/><ellipse class="dl-cheek" cx="82" cy="74" rx="6" ry="3.5"/>'
        : '';
    figure =
      `<g class="dl-anim">${speciesBack(species)}${antennae(mood, species)}` +
      `<ellipse class="dl-body" cx="60" cy="70" rx="36" ry="31"/>` +
      `${speciesFront(species)}${eyes(mood, species)}${cheeks}${mouth(mood)}${extras(mood)}</g>`;
  }
  const classes = `dl-svg dl-mood-${mood} dl-species-${species}${animated ? ' dl-animated' : ''}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}" ` +
    `role="img" aria-labelledby="${id}-title" class="${classes}" style="${vars}">` +
    `<title id="${id}-title">${title}</title>` +
    `<defs><radialGradient id="${id}-glow"><stop offset="0" stop-color="${palette.glow}" stop-opacity=".9"/>` +
    `<stop offset="1" stop-color="${palette.glow}" stop-opacity="0"/></radialGradient></defs>` +
    `<style>${PET_CSS}</style>` +
    `<ellipse class="dl-glow" cx="60" cy="70" rx="56" ry="50" fill="url(#${id}-glow)"/>` +
    `<ellipse cx="60" cy="110" rx="26" ry="4" fill="#000" opacity=".12"/>` +
    figure +
    `</svg>`
  );
}
