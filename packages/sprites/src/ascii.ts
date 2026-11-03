import type { Species } from '@daemonling/core';
import type { Mood } from './mood.js';

/** One ASCII frame: 6 lines, at most 20 columns. */
export type Frame = readonly string[];

/** Maximum width of any frame, in columns. */
export const ASCII_MAX_WIDTH = 20;

interface FaceParts {
  tips: string;
  stems: string;
  eyes: string;
  mouth: string;
  /** Characters around the face lines (arms when dancing). */
  left?: string;
  right?: string;
}

const HEAD = '   .-\'"""\'-.';
const FEET = "   '-.___.-'";

/** Two to four face variants per mood, animated in order. */
const FACE_FRAMES: Record<Exclude<Mood, 'egg' | 'cocoon'>, FaceParts[]> = {
  idle: [
    { tips: '    o     o', stems: '     \\   /', eyes: '  o   o  ', mouth: '    w    ' },
    { tips: '     o   o', stems: '     \\   /', eyes: '  -   -  ', mouth: '    w    ' },
    { tips: '    o     o', stems: '     \\   /', eyes: '  o   o  ', mouth: '    w    ' },
  ],
  happy: [
    { tips: '    *     *', stems: '     \\   /', eyes: '  ^   ^  ', mouth: '   \\_/   ' },
    { tips: '   *       *', stems: '     \\   /', eyes: '  ^   ^  ', mouth: '   \\_/   ' },
  ],
  sad: [
    { tips: '', stems: '    _/   \\_', eyes: '  .   .  ', mouth: '    n    ' },
    { tips: '', stems: '    _/   \\_', eyes: '  ;   .  ', mouth: '    n    ' },
  ],
  sick: [
    { tips: '      +', stems: '    _/   \\_', eyes: '  @   @  ', mouth: '    ~    ' },
    { tips: '     +', stems: '    _/   \\_', eyes: '  @   @  ', mouth: '   ~~~   ' },
  ],
  sleeping: [
    { tips: '             z', stems: '     \\   /', eyes: '  -   -  ', mouth: '    o    ' },
    { tips: '            Z z', stems: '     \\   /', eyes: '  -   -  ', mouth: '    .    ' },
    { tips: '           z Z z', stems: '     \\   /', eyes: '  -   -  ', mouth: '    o    ' },
  ],
  dance: [
    {
      tips: '    *     *',
      stems: '     \\   /',
      eyes: '  ^   ^  ',
      mouth: '    o    ',
      left: '\\',
      right: ' ',
    },
    {
      tips: '   *       *',
      stems: '     \\   /',
      eyes: '  ^   ^  ',
      mouth: '   \\_/   ',
      left: ' ',
      right: '/',
    },
    {
      tips: '    *     *',
      stems: '     \\   /',
      eyes: '  >   <  ',
      mouth: '    o    ',
      left: '\\',
      right: '/',
    },
  ],
};

const EGG: Frame[] = [
  ['     .--.', '    /    \\', '   |  ..  |', '   |      |', '    \\    /', "     '--'"],
  ['      .--.', '     /    \\', '    |  ..  |', '    |      |', '     \\    /', "      '--'"],
];

const COCOON: Frame[] = [
  ['     .--.', '   ./~~~~\\.', '  |~~~~~~~~|', '  |~~ zz ~~|', "   '.~~~~.'", "     '--'"],
  ['     .--.', '   ./~~~~\\.', '  |~~~~~~~~|', '  |~~ Zz ~~|', "   '.~~~~.'", "     '--'"],
];

function baseFrame(parts: FaceParts): string[] {
  const l = parts.left ?? ' ';
  const r = parts.right ?? '';
  return [parts.tips, parts.stems, HEAD, ` ${l}(${parts.eyes})${r}`, `  (${parts.mouth})`, FEET];
}

/** Species accents applied on top of the base blob. */
function accent(lines: string[], species: Species): string[] {
  const out = [...lines];
  const set = (i: number, value: string): void => {
    out[i] = value;
  };
  switch (species) {
    case 'owlbyte':
      // Ear tufts and big calm eyes.
      if (out[0] === '' || /o|\*/.test(out[0] ?? '')) set(0, '    /\\     /\\');
      set(3, (out[3] ?? '').replace(/(\(\s\s)o(\s{3})o/, '$1O$2O'));
      break;
    case 'sprintail':
      set(5, `${FEET}~~>`);
      break;
    case 'zenpaca':
      set(2, "   .~'~~~'~.");
      set(3, (out[3] ?? '').replace('(', '{').replace(/\)(?=[^)]*$)/, '}'));
      set(4, (out[4] ?? '').replace('(', '{').replace(/\)(?=[^)]*$)/, '}'));
      break;
    case 'shipwyrm':
      if (out[0] === '' || /o|\*/.test(out[0] ?? '')) set(0, '    ^     ^');
      set(5, `${FEET} [#]`);
      break;
    case 'nocturne':
      set(2, '   .-\'"C"\'-.');
      break;
    case 'sprout':
      if (/o/.test(out[0] ?? '')) set(0, (out[0] ?? '').replace(/o/g, '%'));
      break;
    default:
      break;
  }
  return out.map((line) => line.replace(/\s+$/, ''));
}

/**
 * ASCII animation frames (2–4) for a species and mood. Every frame is 6 lines tall and at most
 * 20 columns wide. Original art.
 */
export function asciiFrames(species: Species, mood: Mood): Frame[] {
  if (mood === 'egg' || species === 'unhatched') return EGG;
  if (mood === 'cocoon') return COCOON;
  return FACE_FRAMES[mood].map((parts) => accent(baseFrame(parts), species));
}

/** A single frame chosen by index (wraps around). */
export function asciiFrame(species: Species, mood: Mood, index = 0): Frame {
  const frames = asciiFrames(species, mood);
  return frames[((index % frames.length) + frames.length) % frames.length]!;
}
