import type { ConversionOptions } from '../types/pixel';

export type DetailPreset = 'clean' | 'balanced' | 'detailed';
export type ImageKindPreset = 'general' | 'line-art-character';
export type FramingPreset = 'full-composition' | 'subject-focus';

export function applyDetailPreset(
  options: ConversionOptions,
  preset: DetailPreset,
): ConversionOptions {
  if (preset === 'clean') {
    return {
      ...options,
      dithering: false,
      cleanupNoise: true,
      preserveSilhouette: true,
      simplifyShapes: true,
    };
  }

  if (preset === 'detailed') {
    return {
      ...options,
      dithering: true,
      cleanupNoise: false,
      preserveSilhouette: true,
      simplifyShapes: false,
    };
  }

  return {
    ...options,
    dithering: false,
    cleanupNoise: true,
    preserveSilhouette: true,
    simplifyShapes: false,
  };
}

export function inferDetailPreset(options: ConversionOptions): DetailPreset {
  if (!options.dithering && options.cleanupNoise && options.simplifyShapes) {
    return 'clean';
  }

  if (options.dithering && !options.cleanupNoise && !options.simplifyShapes) {
    return 'detailed';
  }

  return 'balanced';
}

export function applyImageKindPreset(
  options: ConversionOptions,
  preset: ImageKindPreset,
): ConversionOptions {
  return {
    ...options,
    animeMode: preset === 'line-art-character',
  };
}

export function inferImageKindPreset(
  options: ConversionOptions,
): ImageKindPreset {
  return options.animeMode ? 'line-art-character' : 'general';
}

export function applyFramingPreset(
  options: ConversionOptions,
  preset: FramingPreset,
): ConversionOptions {
  return {
    ...options,
    fillFrame: preset === 'subject-focus',
  };
}

export function inferFramingPreset(options: ConversionOptions): FramingPreset {
  return options.fillFrame ? 'subject-focus' : 'full-composition';
}
