import type { ConversionOptions } from '../types/pixel';

export type DetailPreset = 'clean' | 'balanced' | 'detailed';

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
