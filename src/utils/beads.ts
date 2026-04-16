import { BEAD_BRANDS, type BeadBrand, type BeadColor } from '../data/beadPalettes';
import type { PixelGrid } from '../types/pixel';
import { findNearestPaletteMatch } from './color';

export type BeadMappedColor = BeadColor & {
  count: number;
};

export function mapGridToBeadPalette(grid: PixelGrid, brand: BeadBrand): PixelGrid {
  const palette = BEAD_BRANDS[brand].colors.map((color) => color.hex);
  const cells = grid.cells.map((cell) => {
    if (!cell.color) {
      return cell;
    }

    const mappedHex = findNearestPaletteMatch(cell.source, palette).color;

    return {
      ...cell,
      color: mappedHex,
    };
  });

  return {
    ...grid,
    cells,
    palette: [...new Set(cells.map((cell) => cell.color).filter(Boolean))] as string[],
  };
}

export function countBeadUsage(
  grid: PixelGrid,
  brand: BeadBrand,
): BeadMappedColor[] {
  const counts = new Map<string, number>();

  for (const cell of grid.cells) {
    if (!cell.color) {
      continue;
    }

    counts.set(cell.color, (counts.get(cell.color) ?? 0) + 1);
  }

  return BEAD_BRANDS[brand].colors
    .filter((color) => counts.has(color.hex))
    .map((color) => ({
      ...color,
      count: counts.get(color.hex) ?? 0,
    }))
    .sort((left, right) => right.count - left.count);
}
