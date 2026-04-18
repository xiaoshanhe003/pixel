import { describe, expect, it } from 'vitest';
import type { ConversionOptions } from '../../types/pixel';
import {
  applyDetailPreset,
  applyFramingPreset,
  applyImageKindPreset,
  inferDetailPreset,
  inferFramingPreset,
  inferImageKindPreset,
} from '../conversionPresets';

const baseOptions: ConversionOptions = {
  gridSize: 16,
  paletteSize: 16,
  dithering: false,
  cleanupNoise: true,
  preserveSilhouette: true,
  simplifyShapes: true,
  animeMode: true,
  fillFrame: false,
};

describe('conversionPresets', () => {
  it('maps clean detail preset to the most simplified cleanup pipeline', () => {
    expect(applyDetailPreset(baseOptions, 'clean')).toMatchObject({
      dithering: false,
      cleanupNoise: true,
      preserveSilhouette: true,
      simplifyShapes: true,
    });
  });

  it('maps balanced detail preset to a middle-ground cleanup pipeline', () => {
    expect(applyDetailPreset(baseOptions, 'balanced')).toMatchObject({
      dithering: false,
      cleanupNoise: true,
      preserveSilhouette: true,
      simplifyShapes: false,
    });
  });

  it('maps detailed detail preset to a more faithful conversion pipeline', () => {
    expect(applyDetailPreset(baseOptions, 'detailed')).toMatchObject({
      dithering: true,
      cleanupNoise: false,
      preserveSilhouette: true,
      simplifyShapes: false,
    });
  });

  it('infers detail preset labels from option combinations', () => {
    expect(inferDetailPreset(applyDetailPreset(baseOptions, 'clean'))).toBe('clean');
    expect(inferDetailPreset(applyDetailPreset(baseOptions, 'balanced'))).toBe('balanced');
    expect(inferDetailPreset(applyDetailPreset(baseOptions, 'detailed'))).toBe('detailed');
  });

  it('maps image type preset to anime mode', () => {
    expect(applyImageKindPreset(baseOptions, 'general').animeMode).toBe(false);
    expect(applyImageKindPreset(baseOptions, 'line-art-character').animeMode).toBe(true);
    expect(inferImageKindPreset({ ...baseOptions, animeMode: false })).toBe('general');
    expect(inferImageKindPreset(baseOptions)).toBe('line-art-character');
  });

  it('maps framing preset to fill-frame mode', () => {
    expect(applyFramingPreset(baseOptions, 'full-composition').fillFrame).toBe(false);
    expect(applyFramingPreset(baseOptions, 'subject-focus').fillFrame).toBe(true);
    expect(inferFramingPreset({ ...baseOptions, fillFrame: false })).toBe('full-composition');
    expect(inferFramingPreset({ ...baseOptions, fillFrame: true })).toBe('subject-focus');
  });
});
