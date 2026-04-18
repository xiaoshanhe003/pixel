import { BEAD_BRANDS, type BeadBrand } from '../data/beadPalettes';
import type { PixelGrid } from '../types/pixel';
import type { CrochetLegendItem, CrochetPatternAnalysis, CrochetRowSummary } from './crochet';
import type { BeadMappedColor } from './beads';

export type ScenarioExportParams = {
  scenario: 'beads' | 'crochet';
  grid: PixelGrid;
  beadBrand?: BeadBrand;
  beadUsage?: BeadMappedColor[];
  crochetAnalysis?: CrochetPatternAnalysis;
  exportMode: string;
};

export type BeadUsageGroup = {
  id: string;
  items: BeadMappedColor[];
};

export type OccupiedGridSize = {
  rows: number;
  columns: number;
};

export type ScenarioExportDocument =
  | {
      kind: 'beads';
      title: string;
      subtitle?: string;
      filename: string;
      grid: PixelGrid;
      beadBrandLabel: string;
      beadSummary: {
        totalCount: number;
        occupiedSize: OccupiedGridSize;
      };
      beadUsageGroups: BeadUsageGroup[];
    }
  | {
      kind: 'crochet-chart';
      title: string;
      subtitle?: string;
      filename: string;
      grid: PixelGrid;
      showSymbols: true;
      symbolByColor: Map<string, string>;
      legend: CrochetLegendItem[];
    }
  | {
      kind: 'crochet-rows';
      title: string;
      subtitle?: string;
      filename: string;
      grid: PixelGrid;
      rows: CrochetRowSummary[];
      filledRowCount: number;
    };

function getBeadUsageGroupId(id: string) {
  const match = id.match(/^[A-Z]+/i);
  return match?.[0]?.toUpperCase() ?? id.toUpperCase();
}

function getBeadUsageNumericId(id: string) {
  const match = id.match(/(\d+)$/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function compareBeadUsageCodes(left: string, right: string) {
  const leftGroup = getBeadUsageGroupId(left);
  const rightGroup = getBeadUsageGroupId(right);

  if (leftGroup !== rightGroup) {
    return leftGroup.localeCompare(rightGroup, 'en');
  }

  const leftNumber = getBeadUsageNumericId(left);
  const rightNumber = getBeadUsageNumericId(right);

  if (leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right, 'en');
}

export function groupBeadUsageByCode(beadUsage: BeadMappedColor[]): BeadUsageGroup[] {
  const groups = new Map<string, BeadMappedColor[]>();

  for (const item of beadUsage) {
    const groupId = getBeadUsageGroupId(item.id);
    const existing = groups.get(groupId);

    if (existing) {
      existing.push(item);
    } else {
      groups.set(groupId, [item]);
    }
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([id, items]) => ({
      id,
      items: [...items].sort((left, right) => compareBeadUsageCodes(left.id, right.id)),
    }));
}

export function measureOccupiedGridSize(grid: PixelGrid): OccupiedGridSize {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const cell of grid.cells) {
    if (!cell.color) {
      continue;
    }

    minX = Math.min(minX, cell.x);
    minY = Math.min(minY, cell.y);
    maxX = Math.max(maxX, cell.x);
    maxY = Math.max(maxY, cell.y);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { rows: 0, columns: 0 };
  }

  return {
    rows: maxY - minY + 1,
    columns: maxX - minX + 1,
  };
}

export function buildScenarioExportDocument({
  scenario,
  grid,
  beadBrand = 'mard',
  beadUsage = [],
  crochetAnalysis,
  exportMode,
}: ScenarioExportParams): ScenarioExportDocument {
  if (scenario === 'beads') {
    return {
      kind: 'beads',
      title: '拼豆打印图纸',
      subtitle: undefined,
      filename: 'pixel-forge-beads-pattern',
      grid,
      beadBrandLabel: BEAD_BRANDS[beadBrand].label,
      beadSummary: {
        totalCount: beadUsage.reduce((sum, item) => sum + item.count, 0),
        occupiedSize: measureOccupiedGridSize(grid),
      },
      beadUsageGroups: groupBeadUsageByCode(beadUsage),
    };
  }

  if (exportMode === 'crochet-rows') {
    return {
      kind: 'crochet-rows',
      title: '钩织行列说明',
      subtitle: crochetAnalysis ? `${crochetAnalysis.filledRowCount} 行可打印` : undefined,
      filename: 'pixel-forge-crochet-rows',
      grid,
      rows: crochetAnalysis?.rows.filter((row) => row.stitchCount > 0) ?? [],
      filledRowCount: crochetAnalysis?.filledRowCount ?? 0,
    };
  }

  return {
    kind: 'crochet-chart',
    title: '钩织 PDF 图纸',
    subtitle: crochetAnalysis ? `${crochetAnalysis.totalStitches} 针` : undefined,
    filename: 'pixel-forge-crochet-chart',
    grid,
    showSymbols: true,
    symbolByColor: crochetAnalysis?.symbolByColor ?? new Map<string, string>(),
    legend: crochetAnalysis?.legend ?? [],
  };
}
