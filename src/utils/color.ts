import type { RGB } from '../types/pixel';

const SHORT_HEX_COLOR = /^#?[0-9a-fA-F]{3}$/;
const LONG_HEX_COLOR = /^#?[0-9a-fA-F]{6}$/;

export type PaletteMatch = {
  color: string;
  index: number;
  distance: number;
  rgb: RGB;
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
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;

  return Math.sqrt(dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114);
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
