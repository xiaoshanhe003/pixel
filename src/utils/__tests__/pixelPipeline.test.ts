import { describe, expect, it } from 'vitest';
import { nearestPaletteColor } from '../color';
import { resizeImageDataNearest } from '../image';
import { buildPixelGrid, cleanupIsolatedPixels } from '../pixelPipeline';

function createImageData(width: number, height: number, rgba: [number, number, number, number][]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  rgba.forEach(([r, g, b, a], index) => {
    const offset = index * 4;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  });

  return {
    data,
    width,
    height,
  } as ImageData;
}

describe('nearestPaletteColor', () => {
  it('maps a source color to the nearest palette entry', () => {
    const palette = ['#000000', '#ffffff', '#ff0000'];

    expect(nearestPaletteColor({ r: 240, g: 16, b: 32 }, palette)).toBe('#ff0000');
  });
});

describe('resizeImageDataNearest', () => {
  it('keeps hard edges when a source image is resampled', () => {
    const imageData = createImageData(2, 1, [
      [255, 0, 0, 255],
      [0, 0, 255, 255],
    ]);

    const resized = resizeImageDataNearest(imageData, 4, 1);

    expect(Array.from(resized.data.slice(0, 16))).toEqual([
      255, 0, 0, 255,
      255, 0, 0, 255,
      0, 0, 255, 255,
      0, 0, 255, 255,
    ]);
  });
});

describe('cleanupIsolatedPixels', () => {
  it('removes a single stray pixel surrounded by a dominant color', () => {
    const input = [
      ['#111111', '#111111', '#111111'],
      ['#111111', '#ff0000', '#111111'],
      ['#111111', '#111111', '#111111'],
    ];

    expect(cleanupIsolatedPixels(input)[1][1]).toBe('#111111');
  });
});

describe('buildPixelGrid', () => {
  it('returns a 16x16 editable grid and applies palette quantization', () => {
    const imageData = createImageData(1, 1, [[240, 20, 30, 255]]);

    const grid = buildPixelGrid(imageData, {
      gridSize: 16,
      paletteSize: 16,
      dithering: false,
      cleanupNoise: false,
      preserveSilhouette: true,
    });

    expect(grid.width).toBe(16);
    expect(grid.height).toBe(16);
    expect(grid.cells).toHaveLength(256);
    expect(grid.palette).toHaveLength(16);
    expect(new Set(grid.cells.map((cell) => cell.color)).size).toBe(1);
    expect(grid.cells[0].source).toEqual({ r: 240, g: 20, b: 30 });
    expect(grid.cells[0].color).toBe(nearestPaletteColor({ r: 240, g: 20, b: 30 }, grid.palette));
  });

  it('produces ordered dithering variation when enabled', () => {
    const imageData = createImageData(1, 1, [[110, 110, 110, 255]]);

    const flat = buildPixelGrid(imageData, {
      gridSize: 16,
      paletteSize: 16,
      dithering: false,
      cleanupNoise: false,
      preserveSilhouette: true,
    });

    const dithered = buildPixelGrid(imageData, {
      gridSize: 16,
      paletteSize: 16,
      dithering: true,
      cleanupNoise: false,
      preserveSilhouette: true,
    });

    expect(new Set(flat.cells.map((cell) => cell.color)).size).toBe(1);
    expect(new Set(dithered.cells.map((cell) => cell.color)).size).toBeGreaterThan(1);
  });

  it('does not wipe a narrow silhouette edge when preserveSilhouette is enabled', () => {
    const pixels: [number, number, number, number][] = [];

    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const isLine = x === 4 && y < 8;
        pixels.push(isLine ? [0, 0, 0, 255] : [255, 255, 255, 255]);
      }
    }

    const imageData = createImageData(16, 16, pixels);

    const grid = buildPixelGrid(imageData, {
      gridSize: 16,
      paletteSize: 16,
      dithering: false,
      cleanupNoise: true,
      preserveSilhouette: true,
    });

    const lineCells = grid.cells.filter((cell) => cell.x === 4 && cell.y < 8);
    expect(new Set(lineCells.map((cell) => cell.color)).size).toBe(1);
    expect(lineCells[0].color).not.toBe(grid.cells[0].color);
  });
});
