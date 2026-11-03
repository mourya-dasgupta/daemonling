/**
 * @daemonling/sprites — original Daemonling art: ASCII frames for terminals, an SVG renderer for
 * the editor and web, and a README card renderer.
 */
export { moodFor, faceFor, MOODS, SPECIES_LABEL } from './mood.js';
export type { Mood } from './mood.js';
export { asciiFrames, asciiFrame, ASCII_MAX_WIDTH } from './ascii.js';
export type { Frame } from './ascii.js';
export { renderPetSvg, PALETTES, PET_CSS, escapeXml } from './svg.js';
export type { Palette, PetSvgOptions } from './svg.js';
export { renderCard } from './card.js';
export type { CardOptions } from './card.js';

/** Package version, kept in sync with package.json. */
export const VERSION = '0.1.0';
