import { DEFAULT_PALETTES } from '../data/defaultPalettes';
import type { ConversionOptions, PixelCell, PixelGrid, RGB } from '../types/pixel';
import {
  clampByte,
  findNearestPaletteMatch,
  hexToRgb,
  shiftRgb,
} from './color';
import { resizeImageDataNearest } from './image';

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

const DEFAULT_DITHER_STRENGTH = 64;

export type CleanupOptions = {
  preserveSilhouette?: boolean;
  minimumNeighborAgreement?: number;
};

type SampledCell = {
  source: RGB;
  color: string;
};

function getPaletteForOptions(options: Pick<ConversionOptions, 'paletteSize'>): readonly string[] {
  return DEFAULT_PALETTES[options.paletteSize];
}

function readRgbAt(imageData: ImageData, x: number, y: number): RGB {
  const index = (y * imageData.width + x) * 4;

  return {
    r: imageData.data[index] ?? 0,
    g: imageData.data[index + 1] ?? 0,
    b: imageData.data[index + 2] ?? 0,
  };
}

function sampleImageData(imageData: ImageData, gridSize: number): SampledCell[][] {
  const source =
    imageData.width === gridSize && imageData.height === gridSize
      ? imageData
      : resizeImageDataNearest(imageData, gridSize, gridSize);

  return Array.from({ length: gridSize }, (_, y) =>
    Array.from({ length: gridSize }, (_, x) => {
      const sourceRgb = readRgbAt(source, x, y);

      return {
        source: sourceRgb,
        color: '#000000',
      };
    })
  );
}

function getDitherBias(x: number, y: number): number {
  return (BAYER_4X4[y % 4][x % 4] + 0.5) / 16 - 0.5;
}

function quantizeSample(
  source: RGB,
  palette: readonly string[],
  x: number,
  y: number,
  dithering: boolean
): string {
  const ditheredSource = dithering
    ? shiftRgb(source, getDitherBias(x, y) * DEFAULT_DITHER_STRENGTH)
    : source;

  return findNearestPaletteMatch(ditheredSource, palette).color;
}

export function cleanupIsolatedPixels(grid: string[][], options: CleanupOptions = {}): string[][] {
  const preserveSilhouette = options.preserveSilhouette ?? true;
  const minimumNeighborAgreement = options.minimumNeighborAgreement ?? (preserveSilhouette ? 3 : 2);

  return grid.map((row, y) =>
    row.map((cell, x) => {
      const sameColorNeighbors = [
        grid[y - 1]?.[x],
        grid[y + 1]?.[x],
        row[x - 1],
        row[x + 1],
      ].filter((value) => value === cell);

      if (preserveSilhouette && sameColorNeighbors.length > 0) {
        return cell;
      }

      const neighbors = [
        grid[y - 1]?.[x],
        grid[y + 1]?.[x],
        row[x - 1],
        row[x + 1],
      ].filter((value): value is string => typeof value === 'string');

      if (neighbors.length < 4) {
        return cell;
      }

      const counts = new Map<string, number>();

      for (const neighbor of neighbors) {
        counts.set(neighbor, (counts.get(neighbor) ?? 0) + 1);
      }

      let dominantColor = cell;
      let dominantCount = 0;

      for (const [color, count] of counts) {
        if (count > dominantCount) {
          dominantColor = color;
          dominantCount = count;
        }
      }

      if (dominantColor === cell) {
        return cell;
      }

      if (dominantCount < minimumNeighborAgreement) {
        return cell;
      }

      return dominantColor;
    })
  );
}

export function buildPixelGrid(imageData: ImageData, options: ConversionOptions): PixelGrid {
  const palette = getPaletteForOptions(options);
  const sampledCells = sampleImageData(imageData, options.gridSize);
  const colorGrid = sampledCells.map((row, y) =>
    row.map((cell, x) => ({
      ...cell,
      color: quantizeSample(cell.source, palette, x, y, options.dithering),
    }))
  );
  const cleanedColorGrid = options.cleanupNoise
    ? cleanupIsolatedPixels(
        colorGrid.map((row) => row.map((cell) => cell.color)),
        { preserveSilhouette: options.preserveSilhouette }
      )
    : colorGrid.map((row) => row.map((cell) => cell.color));

  const cells: PixelCell[] = [];

  for (let y = 0; y < options.gridSize; y += 1) {
    for (let x = 0; x < options.gridSize; x += 1) {
      const sampledCell = colorGrid[y][x];

      cells.push({
        x,
        y,
        source: sampledCell.source,
        color: cleanedColorGrid[y][x],
      });
    }
  }

  return {
    width: options.gridSize,
    height: options.gridSize,
    cells,
    palette: [...palette],
  };
}

export function toSourceRgb(hex: string): RGB {
  return hexToRgb(hex);
}

export function normalizeAlpha(alpha: number): number {
  return clampByte(alpha);
}
