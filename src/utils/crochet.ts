import type { PixelGrid } from '../types/pixel';
import { getPerceivedLuminance, getRgbSaturation, hexToRgb } from './color';

const CROCHET_SYMBOLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&*+=?'.split('');

export type CrochetLegendItem = {
  color: string;
  symbol: string;
  mark: string;
  colorName: string;
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
  markByColor: Map<string, string>;
  colorNameByColor: Map<string, string>;
};

const COLOR_NAME_PINYIN: Record<string, string> = {
  黑: 'HEI',
  白: 'BAI',
  灰: 'HUI',
  红: 'HONG',
  粉: 'FEN',
  橙: 'CHENG',
  黄: 'HUANG',
  绿: 'LV',
  青: 'QING',
  蓝: 'LAN',
  紫: 'ZI',
  棕: 'ZONG',
  米: 'MI',
  浅: 'QIAN',
  深: 'SHEN',
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

function getCrochetColorName(color: string): string {
  const rgb = hexToRgb(color);
  const luminance = getPerceivedLuminance(rgb);
  const saturation = getRgbSaturation(rgb);
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const delta = max - min;

  if (luminance <= 28) {
    return '黑';
  }

  if (luminance >= 242 && saturation <= 0.08) {
    return '白';
  }

  if (saturation <= 0.12 || delta <= 18) {
    if (luminance >= 210) {
      return '浅灰';
    }

    if (luminance <= 92) {
      return '深灰';
    }

    return '灰';
  }

  const hue = (() => {
    if (delta === 0) {
      return 0;
    }

    let value = 0;

    if (max === rgb.r) {
      value = ((rgb.g - rgb.b) / delta) % 6;
    } else if (max === rgb.g) {
      value = (rgb.b - rgb.r) / delta + 2;
    } else {
      value = (rgb.r - rgb.g) / delta + 4;
    }

    const degrees = value * 60;
    return degrees < 0 ? degrees + 360 : degrees;
  })();

  let baseName = '灰';

  if (hue < 15 || hue >= 345) {
    baseName = saturation < 0.45 && luminance > 170 ? '粉' : '红';
  } else if (hue < 38) {
    baseName = luminance < 150 ? '棕' : '橙';
  } else if (hue < 70) {
    baseName = saturation < 0.3 && luminance > 210 ? '米黄' : '黄';
  } else if (hue < 155) {
    baseName = '绿';
  } else if (hue < 195) {
    baseName = '青';
  } else if (hue < 255) {
    baseName = '蓝';
  } else if (hue < 320) {
    baseName = '紫';
  } else {
    baseName = '粉';
  }

  if (baseName === '白' || baseName === '黑' || baseName === '灰') {
    return baseName;
  }

  if (baseName === '米黄') {
    return baseName;
  }

  if (luminance >= 214) {
    return `浅${baseName}`;
  }

  return baseName;
}

function toPinyinKey(colorName: string): string {
  return colorName
    .split('')
    .map((char) => COLOR_NAME_PINYIN[char] ?? 'X')
    .join('');
}

function buildMarkMap(colorNames: string[]): Map<string, string> {
  const markByName = new Map<string, string>();
  const usedMarks = new Set<string>();

  for (const colorName of colorNames) {
    const pinyin = toPinyinKey(colorName);
    let mark = '';
    const candidates = new Set<string>();

    const initials = colorName
      .split('')
      .map((char) => (COLOR_NAME_PINYIN[char] ?? 'X')[0])
      .join('');

    if (initials.length > 0) {
      candidates.add(initials.slice(0, 3));
    }

    for (let length = 1; length <= Math.min(3, pinyin.length); length += 1) {
      candidates.add(pinyin.slice(0, length));
    }

    for (const candidate of candidates) {
      if (!usedMarks.has(candidate)) {
        mark = candidate;
        break;
      }
    }

    if (!mark) {
      let suffix = 2;
      while (!mark) {
        const base = pinyin.slice(0, 2) || pinyin.slice(0, 1) || 'X';
        const candidate = `${base}${suffix}`.slice(0, 3);
        if (!usedMarks.has(candidate)) {
          mark = candidate;
        }
        suffix += 1;
      }
    }

    usedMarks.add(mark);
    markByName.set(colorName, mark);
  }

  return markByName;
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
  const colorNameByColor = new Map(
    orderedColors.map((color) => [color, getCrochetColorName(color)]),
  );
  const groupedLegend = new Map<
    string,
    {
      color: string;
      count: number;
    }
  >();

  for (const color of orderedColors) {
    const colorName = colorNameByColor.get(color) ?? '灰';
    const count = grid.cells.filter((cell) => cell.color === color).length;
    const existing = groupedLegend.get(colorName);

    if (existing) {
      existing.count += count;
      continue;
    }

    groupedLegend.set(colorName, {
      color,
      count,
    });
  }

  const uniqueColorNames = [...groupedLegend.keys()];
  const markByName = buildMarkMap(uniqueColorNames);
  const legend = uniqueColorNames.map((colorName, index) => {
    const item = groupedLegend.get(colorName) as { color: string; count: number };

    return {
      color: item.color,
      symbol: CROCHET_SYMBOLS[index] ?? `C${index + 1}`,
      mark: markByName.get(colorName) ?? `C${index + 1}`,
      colorName,
      count: item.count,
    };
  });
  const symbolByColor = new Map(
    orderedColors.map((color) => {
      const colorName = colorNameByColor.get(color) ?? '灰';
      const legendItem = legend.find((item) => item.colorName === colorName);
      return [color, legendItem?.symbol ?? '?'] as const;
    }),
  );
  const markByColor = new Map(
    orderedColors.map((color) => {
      const colorName = colorNameByColor.get(color) ?? '灰';
      return [color, markByName.get(colorName) ?? '?'] as const;
    }),
  );
  const rows = Array.from({ length: grid.height }, (_, index) => {
    const y = grid.height - 1 - index;
    const rowCells = grid.cells.filter((cell) => cell.y === y && cell.color);
    const symbols = rowCells.map((cell) => markByColor.get(cell.color as string) ?? '?');

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
    markByColor,
    colorNameByColor,
  };
}
