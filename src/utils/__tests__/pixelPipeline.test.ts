import { describe, expect, it } from 'vitest';
import { nearestPaletteColor } from '../color';
import {
  createSubjectFocusImageData,
  estimateEdgeBackgroundColor,
  fitImageDataCover,
  fitImageDataContain,
  resizeImageDataNearest,
  trimSolidBackgroundBounds,
  trimTransparentBounds,
} from '../image';
import {
  buildPixelGrid,
  cleanupAnimeLineArtifacts,
  cleanupIsolatedPixels,
  simplifyShapeClusters,
} from '../pixelPipeline';

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

describe('trimTransparentBounds', () => {
  it('crops away transparent margins before conversion', () => {
    const imageData = createImageData(4, 4, [
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
      [0, 0, 0, 0], [255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 0, 0],
      [0, 0, 0, 0], [0, 0, 255, 255], [255, 255, 0, 255], [0, 0, 0, 0],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
    ]);

    const trimmed = trimTransparentBounds(imageData);

    expect(trimmed.width).toBe(2);
    expect(trimmed.height).toBe(2);
  });
});

describe('fitImageDataContain', () => {
  it('keeps a trimmed subject centered instead of stretching the whole source frame', () => {
    const imageData = createImageData(2, 4, [
      [255, 0, 0, 255], [255, 0, 0, 255],
      [255, 0, 0, 255], [255, 0, 0, 255],
      [255, 0, 0, 255], [255, 0, 0, 255],
      [255, 0, 0, 255], [255, 0, 0, 255],
    ]);

    const fitted = fitImageDataContain(imageData, 8, 8, 1);

    expect(fitted.width).toBe(8);
    expect(fitted.height).toBe(8);
    expect(fitted.data[(4 * 8 + 4) * 4 + 3]).toBeGreaterThan(0);
    expect(fitted.data[3]).toBe(0);
  });
});

describe('trimSolidBackgroundBounds', () => {
  it('crops a white background image down to the subject bounds', () => {
    const imageData = createImageData(5, 5, [
      [255, 255, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255],
      [255, 255, 255, 255], [255, 240, 0, 255], [255, 240, 0, 255], [255, 255, 255, 255], [255, 255, 255, 255],
      [255, 255, 255, 255], [255, 240, 0, 255], [0, 0, 0, 255], [255, 255, 255, 255], [255, 255, 255, 255],
      [255, 255, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255],
      [255, 255, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255],
    ]);

    const trimmed = trimSolidBackgroundBounds(
      imageData,
      estimateEdgeBackgroundColor(imageData),
    );

    expect(trimmed.width).toBe(2);
    expect(trimmed.height).toBe(2);
  });
});

describe('fitImageDataCover', () => {
  it('expands the subject to fill more of the target frame', () => {
    const imageData = createImageData(2, 4, [
      [255, 0, 0, 255], [255, 0, 0, 255],
      [255, 0, 0, 255], [255, 0, 0, 255],
      [255, 0, 0, 255], [255, 0, 0, 255],
      [255, 0, 0, 255], [255, 0, 0, 255],
    ]);

    const fitted = fitImageDataCover(imageData, 8, 8, 0);

    expect(fitted.data[3]).toBeGreaterThan(0);
    expect(fitted.data[(7 * 8 + 7) * 4 + 3]).toBeGreaterThan(0);
  });
});

describe('createSubjectFocusImageData', () => {
  it('uses the subject bounds to keep context instead of collapsing to a tight transparent crop', () => {
    const pixels: [number, number, number, number][] = [];

    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 12; x += 1) {
        const isSubject = x >= 7 && x <= 8 && y >= 3 && y <= 8;
        pixels.push(isSubject ? [255, 220, 80, 255] : [0, 0, 0, 0]);
      }
    }

    const imageData = createImageData(12, 12, pixels);
    const focused = createSubjectFocusImageData(imageData, 1, false);

    expect(focused.width).toBeGreaterThan(2);
    expect(focused.height).toBeGreaterThan(6);
    expect(focused.width).toBeLessThan(12);
    expect(focused.height).toBeLessThan(12);
  });

  it('keeps the original frame when the subject already fills most of it', () => {
    const pixels: [number, number, number, number][] = [];

    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const isSubject = x >= 1 && x <= 6 && y >= 1 && y <= 6;
        pixels.push(isSubject ? [255, 220, 80, 255] : [0, 0, 0, 0]);
      }
    }

    const imageData = createImageData(8, 8, pixels);
    const focused = createSubjectFocusImageData(imageData, 1, false);

    expect(focused.width).toBe(8);
    expect(focused.height).toBe(8);
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

  it('keeps transparent cells transparent during cleanup', () => {
    const input = [
      [null, '#111111', '#111111'],
      ['#111111', null, '#111111'],
      ['#111111', '#111111', '#111111'],
    ];

    expect(cleanupIsolatedPixels(input)[1][1]).toBeNull();
  });
});

describe('simplifyShapeClusters', () => {
  it('merges tiny low-contrast fragments back into surrounding shapes', () => {
    const input = [
      ['#eeeecc', '#eeeecc', '#eeeecc', '#eeeecc'],
      ['#eeeecc', '#ebe8c8', '#eeeecc', '#eeeecc'],
      ['#eeeecc', '#eeeecc', '#eeeecc', '#eeeecc'],
      ['#eeeecc', '#eeeecc', '#eeeecc', '#eeeecc'],
    ];

    const simplified = simplifyShapeClusters(input, {
      gridSize: 16,
      preserveSilhouette: true,
      animeMode: false,
    });

    expect(simplified[1][1]).toBe('#eeeecc');
  });

  it('preserves small high-contrast central feature dots', () => {
    const input = [
      ['#f0e8c0', '#f0e8c0', '#f0e8c0', '#f0e8c0', '#f0e8c0'],
      ['#f0e8c0', '#f0e8c0', '#f0e8c0', '#f0e8c0', '#f0e8c0'],
      ['#f0e8c0', '#f0e8c0', '#1b1408', '#f0e8c0', '#f0e8c0'],
      ['#f0e8c0', '#f0e8c0', '#f0e8c0', '#f0e8c0', '#f0e8c0'],
      ['#f0e8c0', '#f0e8c0', '#f0e8c0', '#f0e8c0', '#f0e8c0'],
    ];

    const simplified = simplifyShapeClusters(input, {
      gridSize: 16,
      preserveSilhouette: true,
      animeMode: false,
    });

    expect(simplified[2][2]).toBe('#1b1408');
  });

  it('preserves chest detail clusters when source feature weights are strong', () => {
    const input = [
      ['#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6'],
      ['#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6'],
      ['#f3ebc6', '#9a6d45', '#9a6d45', '#f3ebc6', '#f3ebc6'],
      ['#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6'],
      ['#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6'],
    ];
    const featureWeights = [
      [0, 0, 0, 0, 0],
      [0, 0.01, 0.01, 0, 0],
      [0, 0.065, 0.07, 0.01, 0],
      [0, 0.01, 0.01, 0, 0],
      [0, 0, 0, 0, 0],
    ];

    const simplified = simplifyShapeClusters(
      input,
      {
        gridSize: 16,
        preserveSilhouette: true,
        animeMode: false,
      },
      featureWeights,
    );

    expect(simplified[2][1]).toBe('#9a6d45');
    expect(simplified[2][2]).toBe('#9a6d45');
  });

  it('preserves lower-body separation marks that keep the feet apart', () => {
    const input = [
      ['#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6'],
      ['#f3ebc6', '#b98a60', '#b98a60', '#b98a60', '#f3ebc6'],
      ['#f3ebc6', '#b98a60', '#b98a60', '#b98a60', '#f3ebc6'],
      ['#f3ebc6', '#b98a60', '#70442c', '#b98a60', '#f3ebc6'],
      ['#f3ebc6', '#b98a60', '#70442c', '#b98a60', '#f3ebc6'],
    ];

    const simplified = simplifyShapeClusters(input, {
      gridSize: 16,
      preserveSilhouette: true,
      animeMode: false,
    });

    expect(simplified[3][2]).toBe('#70442c');
    expect(simplified[4][2]).toBe('#70442c');
  });

  it('merges tiny dark edge outline artifacts even when silhouette preservation is enabled', () => {
    const input = [
      [null, null, null, null, null, null, null, null],
      [null, '#111111', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', null, null],
      [null, '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', null, null],
      [null, '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', null, null],
      [null, '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', null, null],
      [null, '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ];

    const simplified = simplifyShapeClusters(input, {
      gridSize: 16,
      preserveSilhouette: true,
      animeMode: false,
    });

    expect(simplified[1][1]).toBe('#f3ebc6');
  });
});

describe('cleanupAnimeLineArtifacts', () => {
  it('removes tiny dark clusters outside the face region in anime mode', () => {
    const input = [
      [null, null, null, null, null, null, null, null],
      [null, '#111111', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', null, null],
      [null, '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', null, null],
      [null, '#f3ebc6', '#f3ebc6', '#111111', '#f3ebc6', '#f3ebc6', null, null],
      [null, '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', '#f3ebc6', null, null],
      [null, null, null, null, null, null, null, null],
    ];

    const cleaned = cleanupAnimeLineArtifacts(input, {
      gridSize: 16,
      animeMode: true,
    });

    expect(cleaned[1][1]).toBe('#f3ebc6');
    expect(cleaned[3][3]).toBe('#111111');
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
      simplifyShapes: true,
      animeMode: true,
      fillFrame: false,
    });

    expect(grid.width).toBe(16);
    expect(grid.height).toBe(16);
    expect(grid.cells).toHaveLength(256);
    expect(grid.palette.length).toBeLessThanOrEqual(16);
    const opaqueCells = grid.cells.filter((cell) => cell.color !== null);
    expect(new Set(opaqueCells.map((cell) => cell.color)).size).toBe(1);
    expect(opaqueCells.length).toBeGreaterThan(0);
    const centerCell = grid.cells.find((cell) => cell.x === 8 && cell.y === 8);
    expect(centerCell?.source).toEqual({ r: 240, g: 20, b: 30 });
    expect(centerCell?.alpha).toBe(255);
    expect(centerCell?.color).toBe(nearestPaletteColor({ r: 240, g: 20, b: 30 }, grid.palette));
  });

  it('keeps palette-constrained output valid when ordered dithering is enabled', () => {
    const imageData = createImageData(2, 1, [
      [110, 110, 110, 255],
      [140, 140, 140, 255],
    ]);

    const flat = buildPixelGrid(imageData, {
      gridSize: 16,
      paletteSize: 16,
      dithering: false,
      cleanupNoise: false,
      preserveSilhouette: true,
      simplifyShapes: true,
      animeMode: true,
      fillFrame: false,
    });

    const dithered = buildPixelGrid(imageData, {
      gridSize: 16,
      paletteSize: 16,
      dithering: true,
      cleanupNoise: false,
      preserveSilhouette: true,
      simplifyShapes: true,
      animeMode: true,
      fillFrame: false,
    });

    expect(new Set(flat.cells.map((cell) => cell.color)).size).toBeGreaterThan(0);
    expect(new Set(dithered.cells.map((cell) => cell.color)).size).toBeGreaterThan(0);
    expect(dithered.palette.length).toBeLessThanOrEqual(16);
    const ditheredOpaqueCell = dithered.cells.find((cell) => cell.color !== null);
    expect(ditheredOpaqueCell).toBeDefined();
    expect(ditheredOpaqueCell?.color).toBe(
      nearestPaletteColor(ditheredOpaqueCell?.source ?? { r: 0, g: 0, b: 0 }, dithered.palette),
    );
  });

  it('extracts a source-adaptive palette instead of falling back to the fixed defaults', () => {
    const imageData = createImageData(2, 1, [
      [250, 235, 190, 255],
      [90, 160, 70, 255],
    ]);

    const grid = buildPixelGrid(imageData, {
      gridSize: 16,
      paletteSize: 16,
      dithering: false,
      cleanupNoise: false,
      preserveSilhouette: true,
      simplifyShapes: true,
      animeMode: true,
      fillFrame: false,
    });

    expect(grid.palette.length).toBeLessThanOrEqual(16);
    expect(grid.palette).not.toContain('#0f172a');
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
      simplifyShapes: true,
      animeMode: true,
      fillFrame: false,
    });

    const opaqueCells = grid.cells.filter((cell) => cell.color !== null);
    const darkLineCells = opaqueCells.filter(
      (cell) => cell.source.r < 48 && cell.source.g < 48 && cell.source.b < 48,
    );
    const occupiedColumns = new Set(darkLineCells.map((cell) => cell.x));
    const occupiedRows = new Set(darkLineCells.map((cell) => cell.y));

    expect(darkLineCells.length).toBeGreaterThan(0);
    expect(occupiedColumns.size).toBeLessThanOrEqual(2);
    expect(occupiedRows.size).toBeGreaterThan(occupiedColumns.size);
    expect(new Set(darkLineCells.map((cell) => cell.color)).size).toBe(1);
  });

  it('preserves transparent source pixels and excludes them from the palette', () => {
    const imageData = createImageData(2, 1, [
      [0, 0, 0, 0],
      [240, 20, 30, 255],
    ]);

    const grid = buildPixelGrid(imageData, {
      gridSize: 16,
      paletteSize: 16,
      dithering: false,
      cleanupNoise: false,
      preserveSilhouette: true,
      simplifyShapes: true,
      animeMode: true,
      fillFrame: false,
    });

    const transparentCells = grid.cells.filter((cell) => cell.color === null);
    expect(transparentCells.length).toBeGreaterThan(0);
    expect(transparentCells[0].alpha).toBeLessThan(24);
    expect(grid.palette.every((color) => typeof color === 'string')).toBe(true);
  });

  it('rescales a small centered subject instead of losing it inside transparent margins', () => {
    const pixels: [number, number, number, number][] = [];

    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 12; x += 1) {
        const isSubject = x >= 5 && x <= 6 && y >= 4 && y <= 7;
        pixels.push(isSubject ? [255, 220, 80, 255] : [0, 0, 0, 0]);
      }
    }

    const imageData = createImageData(12, 12, pixels);
    const grid = buildPixelGrid(imageData, {
      gridSize: 16,
      paletteSize: 16,
      dithering: false,
      cleanupNoise: false,
      preserveSilhouette: true,
      simplifyShapes: true,
      animeMode: true,
      fillFrame: false,
    });

    const opaqueCells = grid.cells.filter((cell) => cell.color !== null);
    expect(opaqueCells.length).toBeGreaterThan(20);
  });

  it('crops a white-background subject before scaling so it does not dissolve into the backdrop', () => {
    const pixels: [number, number, number, number][] = [];

    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 10; x += 1) {
        const isSubject = x >= 4 && x <= 5 && y >= 3 && y <= 6;
        pixels.push(isSubject ? [250, 220, 80, 255] : [255, 255, 255, 255]);
      }
    }

    const imageData = createImageData(10, 10, pixels);
    const grid = buildPixelGrid(imageData, {
      gridSize: 16,
      paletteSize: 16,
      dithering: false,
      cleanupNoise: false,
      preserveSilhouette: true,
      simplifyShapes: true,
      animeMode: true,
      fillFrame: false,
    });

    const opaqueCells = grid.cells.filter((cell) => cell.color !== null);
    expect(opaqueCells.length).toBeGreaterThan(20);
  });

  it('fills more of the grid when fillFrame is enabled', () => {
    const pixels: [number, number, number, number][] = [];

    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 12; x += 1) {
        const isSubject = x >= 5 && x <= 6 && y >= 4 && y <= 7;
        pixels.push(isSubject ? [255, 220, 80, 255] : [0, 0, 0, 0]);
      }
    }

    const imageData = createImageData(12, 12, pixels);
    const contained = buildPixelGrid(imageData, {
      gridSize: 16,
      paletteSize: 16,
      dithering: false,
      cleanupNoise: false,
      preserveSilhouette: true,
      simplifyShapes: true,
      animeMode: true,
      fillFrame: false,
    });
    const filled = buildPixelGrid(imageData, {
      gridSize: 16,
      paletteSize: 16,
      dithering: false,
      cleanupNoise: false,
      preserveSilhouette: true,
      simplifyShapes: true,
      animeMode: true,
      fillFrame: true,
    });

    const containedOpaque = contained.cells.filter((cell) => cell.color !== null).length;
    const filledOpaque = filled.cells.filter((cell) => cell.color !== null).length;
    expect(filledOpaque).toBeGreaterThan(containedOpaque);
  });
});
