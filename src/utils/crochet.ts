import type { PixelGrid } from '../types/pixel';

const CROCHET_SYMBOLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&*+=?'.split('');

export type CrochetLegendItem = {
  color: string;
  symbol: string;
  count: number;
};

export type CrochetRowSummary = {
  rowNumber: number;
  stitchCount: number;
  instructions: string[];
};

export type CrochetPatternAnalysis = {
  legend: CrochetLegendItem[];
  rows: CrochetRowSummary[];
  totalStitches: number;
  filledRowCount: number;
  symbolByColor: Map<string, string>;
};

function buildInstructions(symbols: string[]): string[] {
  if (symbols.length === 0) {
    return [];
  }

  const instructions: string[] = [];
  let current = symbols[0];
  let count = 1;

  for (let index = 1; index < symbols.length; index += 1) {
    const next = symbols[index];

    if (next === current) {
      count += 1;
      continue;
    }

    instructions.push(`${current} x ${count}`);
    current = next;
    count = 1;
  }

  instructions.push(`${current} x ${count}`);

  return instructions;
}

export function analyzeCrochetPattern(grid: PixelGrid): CrochetPatternAnalysis {
  const orderedColors = Array.from(
    new Set(
      Array.from({ length: grid.height }, (_, index) => grid.height - 1 - index).flatMap((y) =>
        grid.cells
          .filter((cell) => cell.y === y && cell.color)
          .map((cell) => cell.color as string),
      ),
    ),
  );
  const legend = orderedColors.map((color, index) => ({
    color,
    symbol: CROCHET_SYMBOLS[index] ?? `C${index + 1}`,
    count: grid.cells.filter((cell) => cell.color === color).length,
  }));
  const symbolByColor = new Map(legend.map((item) => [item.color, item.symbol]));
  const rows = Array.from({ length: grid.height }, (_, index) => {
    const y = grid.height - 1 - index;
    const rowCells = grid.cells.filter((cell) => cell.y === y && cell.color);
    const symbols = rowCells.map((cell) => symbolByColor.get(cell.color as string) ?? '?');

    return {
      rowNumber: index + 1,
      stitchCount: rowCells.length,
      instructions: buildInstructions(symbols),
    };
  });
  const totalStitches = legend.reduce((sum, item) => sum + item.count, 0);
  const filledRowCount = rows.filter((row) => row.stitchCount > 0).length;

  return {
    legend,
    rows,
    totalStitches,
    filledRowCount,
    symbolByColor,
  };
}
