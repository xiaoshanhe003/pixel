import { BEAD_BRANDS, type BeadBrand, type BeadColor } from '../data/beadPalettes';
import type { PixelGrid } from '../types/pixel';
import { findNearestPaletteMatch, hexToRgb } from './color';

export type BeadMappedColor = BeadColor & {
  count: number;
};

export type BeadColorGroup = {
  id: string;
  label: string;
  description?: string;
  colors: BeadColor[];
};

export type BeadNoiseCleanupReplacement = {
  x: number;
  y: number;
  from: string;
  to: string;
};

const EDITOR_SWATCH_MIN_DISTANCE = 72;
const BEAD_SERIES_DESCRIPTIONS: Partial<Record<BeadBrand, Record<string, string>>> = {
  mard: {
    A: '黄橙亮色',
    B: '绿色系',
    C: '蓝青色系',
    D: '蓝紫色系',
    E: '粉紫色系',
    F: '红色系',
    G: '肤色与棕色',
    H: '黑白灰中性色',
    P: '柔和扩展色',
    Q: '荧光亮色',
    R: '高饱和扩展色',
    T: '纯白',
    Y: '糖果色',
    ZG: '雾调中性色',
  },
};

function getRgbDistance(left: string, right: string): number {
  const leftRgb = hexToRgb(left);
  const rightRgb = hexToRgb(right);

  return Math.sqrt(
    (leftRgb.r - rightRgb.r) ** 2 +
      (leftRgb.g - rightRgb.g) ** 2 +
      (leftRgb.b - rightRgb.b) ** 2,
  );
}

export function findBeadColorByHex(color: string, brand: BeadBrand): BeadColor | undefined {
  const normalized = color.trim().toLowerCase();
  return BEAD_BRANDS[brand].colors.find((entry) => entry.hex.toLowerCase() === normalized);
}

function getBeadSeriesId(id: string) {
  const match = id.match(/^[A-Z]+/i);
  return match?.[0]?.toUpperCase() ?? id.toUpperCase();
}

export function groupBeadPaletteBySeries(brand: BeadBrand): BeadColorGroup[] {
  const descriptions = BEAD_SERIES_DESCRIPTIONS[brand] ?? {};
  const groups = new Map<string, BeadColorGroup>();

  for (const color of BEAD_BRANDS[brand].colors) {
    const seriesId = getBeadSeriesId(color.id);

    if (!groups.has(seriesId)) {
      groups.set(seriesId, {
        id: seriesId,
        label: `${seriesId} 系列`,
        description: descriptions[seriesId],
        colors: [],
      });
    }

    groups.get(seriesId)?.colors.push(color);
  }

  return Array.from(groups.values());
}

export function buildBeadEditorPalette(
  brand: BeadBrand,
  seedPalette: readonly string[],
  size: number,
  activeColor?: string,
): string[] {
  const uniqueColors: string[] = [];
  const seen = new Set<string>();

  function pushColor(color: string, allowNearDuplicate = false) {
    const normalized = color.trim().toLowerCase();

    if (seen.has(normalized)) {
      return;
    }

    if (
      !allowNearDuplicate &&
      uniqueColors.some((existing) => getRgbDistance(existing, normalized) < EDITOR_SWATCH_MIN_DISTANCE)
    ) {
      return;
    }

    seen.add(normalized);
    uniqueColors.push(normalized);
  }

  for (const color of seedPalette) {
    pushColor(mapColorToBeadPalette(color, brand));
  }

  for (const beadColor of BEAD_BRANDS[brand].colors) {
    pushColor(beadColor.hex);

    if (uniqueColors.length >= size) {
      break;
    }
  }

  const palette = uniqueColors.slice(0, size);

  if (!activeColor) {
    return palette;
  }

  const mappedActiveColor = mapColorToBeadPalette(activeColor, brand);
  const hasActiveColor = palette.some(
    (color) => color.trim().toLowerCase() === mappedActiveColor.trim().toLowerCase(),
  );

  if (hasActiveColor) {
    return palette;
  }

  const hasNearActiveColor = palette.some(
    (color) => getRgbDistance(color, mappedActiveColor) < EDITOR_SWATCH_MIN_DISTANCE,
  );

  if (hasNearActiveColor) {
    return palette.map((color, index) => {
      if (getRgbDistance(color, mappedActiveColor) >= EDITOR_SWATCH_MIN_DISTANCE) {
        return color;
      }

      return index === 0 ||
        !palette
          .slice(0, index)
          .some((existing) => getRgbDistance(existing, mappedActiveColor) < EDITOR_SWATCH_MIN_DISTANCE)
        ? mappedActiveColor.trim().toLowerCase()
        : color;
    });
  }

  if (palette.length < size) {
    return [...palette, mappedActiveColor.trim().toLowerCase()];
  }

  return [...palette.slice(0, -1), mappedActiveColor.trim().toLowerCase()];
}

export function mapColorToBeadPalette(color: string, brand: BeadBrand): string {
  const palette = BEAD_BRANDS[brand].colors.map((entry) => entry.hex);
  return findNearestPaletteMatch(hexToRgb(color), palette).color;
}

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

export function buildBeadNoiseCleanupMap(
  grid: PixelGrid,
  maxCount = 3,
): Map<string, string> {
  const replacements = buildBeadNoiseCleanupPlan(grid, maxCount);
  const replacementByColor = new Map<string, string>();

  for (const replacement of replacements) {
    const existing = replacementByColor.get(replacement.from);

    if (existing && existing !== replacement.to) {
      continue;
    }

    replacementByColor.set(replacement.from, replacement.to);
  }

  return replacementByColor;
}

export function buildBeadNoiseCleanupPlan(
  grid: PixelGrid,
  maxComponentSize = 3,
): BeadNoiseCleanupReplacement[] {
  const colorByPoint = new Map<string, string>();

  for (const cell of grid.cells) {
    if (!cell.color) {
      continue;
    }

    colorByPoint.set(`${cell.x}:${cell.y}`, cell.color.trim().toLowerCase());
  }

  const visited = new Set<string>();
  const replacements: BeadNoiseCleanupReplacement[] = [];

  for (const cell of grid.cells) {
    if (!cell.color) {
      continue;
    }

    const startKey = `${cell.x}:${cell.y}`;

    if (visited.has(startKey)) {
      continue;
    }

    const componentColor = cell.color.trim().toLowerCase();
    const queue = [{ x: cell.x, y: cell.y }];
    const component: Array<{ x: number; y: number }> = [];
    const neighborCounts = new Map<string, number>();

    while (queue.length > 0) {
      const current = queue.shift() as { x: number; y: number };
      const key = `${current.x}:${current.y}`;

      if (visited.has(key)) {
        continue;
      }

      visited.add(key);

      if (colorByPoint.get(key) !== componentColor) {
        continue;
      }

      component.push(current);

      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
      ];

      for (const neighbor of neighbors) {
        if (
          neighbor.x < 0 ||
          neighbor.y < 0 ||
          neighbor.x >= grid.width ||
          neighbor.y >= grid.height
        ) {
          continue;
        }

        const neighborKey = `${neighbor.x}:${neighbor.y}`;
        const neighborColor = colorByPoint.get(neighborKey);

        if (neighborColor === componentColor) {
          if (!visited.has(neighborKey)) {
            queue.push(neighbor);
          }
          continue;
        }

        if (!neighborColor) {
          continue;
        }

        neighborCounts.set(neighborColor, (neighborCounts.get(neighborColor) ?? 0) + 1);
      }
    }

    if (component.length === 0 || component.length > maxComponentSize || neighborCounts.size === 0) {
      continue;
    }

    const candidatePalette = [...neighborCounts.keys()];
    const candidate = candidatePalette.sort((left, right) => {
      const countDelta = (neighborCounts.get(right) ?? 0) - (neighborCounts.get(left) ?? 0);

      if (countDelta !== 0) {
        return countDelta;
      }

      return getRgbDistance(componentColor, left) - getRgbDistance(componentColor, right);
    })[0];

    if (!candidate || candidate === componentColor) {
      continue;
    }

    for (const point of component) {
      replacements.push({
        x: point.x,
        y: point.y,
        from: componentColor,
        to: candidate,
      });
    }
  }

  return replacements;
}
