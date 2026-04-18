import type { PixelGrid } from '../types/pixel';

export type BeadPrintOrientation = 'portrait' | 'landscape';

export type BeadPrintLayout = {
  orientation: BeadPrintOrientation;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  rulerThickness: number;
  chart: {
    x: number;
    y: number;
    width: number;
    height: number;
    cellSize: number;
  };
  footer: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

const PAGE_SIZES: Record<BeadPrintOrientation, { width: number; height: number }> = {
  portrait: { width: 1240, height: 1754 },
  landscape: { width: 1754, height: 1240 },
};

const MM_TO_PX = PAGE_SIZES.portrait.width / 210;
const SAFE_MARGIN_MM = 10;

function buildLayoutForOrientation(
  grid: PixelGrid,
  orientation: BeadPrintOrientation,
): BeadPrintLayout {
  const page = PAGE_SIZES[orientation];
  const margin = Math.round(SAFE_MARGIN_MM * MM_TO_PX);
  const rulerThickness = orientation === 'landscape' ? 34 : 36;
  const headerGap = 0;
  const footerGap = 28;
  const footerHeight = orientation === 'landscape' ? 190 : 260;
  const availableWidth = page.width - margin * 2 - rulerThickness * 2;
  const availableHeight =
    page.height - margin * 2 - rulerThickness * 2 - headerGap - footerGap - footerHeight;
  const cellSize = Math.floor(
    Math.min(availableWidth / grid.width, availableHeight / grid.height),
  );
  const chartWidth = cellSize * grid.width;
  const chartHeight = cellSize * grid.height;
  const x = margin + rulerThickness;
  const y = margin + headerGap + rulerThickness;
  const footerY = y + chartHeight + rulerThickness + footerGap;

  return {
    orientation,
    pageWidth: page.width,
    pageHeight: page.height,
    margin,
    rulerThickness,
    chart: {
      x,
      y,
      width: chartWidth,
      height: chartHeight,
      cellSize,
    },
    footer: {
      x: margin,
      y: footerY,
      width: page.width - margin * 2,
      height: page.height - footerY - margin,
    },
  };
}

export function buildBeadPrintLayout(grid: PixelGrid): BeadPrintLayout {
  const portrait = buildLayoutForOrientation(grid, 'portrait');
  const landscape = buildLayoutForOrientation(grid, 'landscape');

  return landscape.chart.cellSize > portrait.chart.cellSize ? landscape : portrait;
}
