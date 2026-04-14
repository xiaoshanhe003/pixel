import type { RGB } from '../types/pixel';

const SHORT_HEX_COLOR = /^#?[0-9a-fA-F]{3}$/;
const LONG_HEX_COLOR = /^#?[0-9a-fA-F]{6}$/;

export type PaletteMatch = {
  color: string;
  index: number;
  distance: number;
  rgb: RGB;
};

type Oklab = {
  l: number;
  a: number;
  b: number;
};

export function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function normalizeHexColor(hex: string): string {
  const trimmed = hex.trim();

  if (SHORT_HEX_COLOR.test(trimmed)) {
    const value = trimmed.replace('#', '');
    return `#${value
      .split('')
      .map((character) => character + character)
      .join('')
      .toLowerCase()}`;
  }

  if (LONG_HEX_COLOR.test(trimmed)) {
    return `#${trimmed.replace('#', '').toLowerCase()}`;
  }

  throw new Error(`Invalid hex color: ${hex}`);
}

export function hexToRgb(hex: string): RGB {
  const normalized = normalizeHexColor(hex).slice(1);

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHex(rgb: RGB): string {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((channel) => clampByte(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function colorDistance(a: RGB, b: RGB): number {
  const left = rgbToOklab(a);
  const right = rgbToOklab(b);
  const dl = left.l - right.l;
  const da = left.a - right.a;
  const db = left.b - right.b;

  return Math.sqrt(dl * dl * 2 + da * da + db * db);
}

export function mixRgb(a: RGB, b: RGB, weight: number): RGB {
  const normalizedWeight = Math.max(0, Math.min(1, weight));

  return {
    r: clampByte(a.r + (b.r - a.r) * normalizedWeight),
    g: clampByte(a.g + (b.g - a.g) * normalizedWeight),
    b: clampByte(a.b + (b.b - a.b) * normalizedWeight),
  };
}

export function shiftRgb(source: RGB, delta: number): RGB {
  return {
    r: clampByte(source.r + delta),
    g: clampByte(source.g + delta),
    b: clampByte(source.b + delta),
  };
}

export function getPerceivedLuminance(source: RGB): number {
  return 0.2126 * source.r + 0.7152 * source.g + 0.0722 * source.b;
}

export function getRgbSaturation(source: RGB): number {
  const max = Math.max(source.r, source.g, source.b);
  const min = Math.min(source.r, source.g, source.b);

  if (max === 0) {
    return 0;
  }

  return (max - min) / max;
}

function srgbChannelToLinear(channel: number): number {
  const normalized = clampByte(channel) / 255;

  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }

  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function rgbToOklab(source: RGB): Oklab {
  const r = srgbChannelToLinear(source.r);
  const g = srgbChannelToLinear(source.g);
  const b = srgbChannelToLinear(source.b);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

export function findNearestPaletteMatch(source: RGB, palette: readonly string[]): PaletteMatch {
  if (palette.length === 0) {
    throw new Error('Cannot match a color without at least one palette entry.');
  }

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestRgb = hexToRgb(palette[0]);

  for (let index = 0; index < palette.length; index += 1) {
    const candidate = palette[index];
    const candidateRgb = hexToRgb(candidate);
    const distance = colorDistance(source, candidateRgb);

    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
      bestRgb = candidateRgb;
    }
  }

  return {
    color: palette[bestIndex],
    index: bestIndex,
    distance: bestDistance,
    rgb: bestRgb,
  };
}

export function nearestPaletteColor(source: RGB, palette: readonly string[]): string {
  return findNearestPaletteMatch(source, palette).color;
}
