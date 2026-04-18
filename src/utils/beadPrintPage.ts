import { type BeadBrand, BEAD_BRANDS } from '../data/beadPalettes';
import type { PixelGrid } from '../types/pixel';
import { findBeadColorByHex, type BeadMappedColor } from './beads';
import { getPerceivedLuminance, hexToRgb } from './color';
import { buildBeadPrintLayout } from './beadPrintLayout';
import { buildScenarioExportDocument } from './scenarioExport';

type BeadPrintPageParams = {
  grid: PixelGrid;
  beadBrand: BeadBrand;
  beadUsage: BeadMappedColor[];
};

type GridLabelMap = Map<string, string>;
const PRINT_FONT_FAMILY = '"Cascadia Code", "Cascadia Mono", Consolas, monospace';

function buildGridLabelMap(grid: PixelGrid, beadBrand: BeadBrand): GridLabelMap {
  const labels = new Map<string, string>();

  for (const cell of grid.cells) {
    if (!cell.color) {
      continue;
    }

    const bead = findBeadColorByHex(cell.color, beadBrand);
    if (bead) {
      labels.set(`${cell.x}-${cell.y}`, bead.id);
    }
  }

  return labels;
}

function getCellTextColor(color: string) {
  return getPerceivedLuminance(hexToRgb(color)) < 110 ? '#ffffff' : '#101010';
}

function drawRulers(
  context: CanvasRenderingContext2D,
  layout: ReturnType<typeof buildBeadPrintLayout>,
  grid: PixelGrid,
) {
  const { chart, rulerThickness } = layout;
  const top = chart.y - rulerThickness;
  const left = chart.x - rulerThickness;
  const right = chart.x + chart.width;
  const bottom = chart.y + chart.height;

  context.strokeStyle = '#a7a29a';
  context.lineWidth = 1;
  context.strokeRect(left, top, chart.width + rulerThickness * 2, chart.height + rulerThickness * 2);

  for (let column = 0; column <= grid.width; column += 1) {
    const x = chart.x + column * chart.cellSize;
    context.beginPath();
    context.setLineDash([]);
    context.lineWidth = 0.8;
    context.strokeStyle = '#d5d0c9';
    context.moveTo(x, top);
    context.lineTo(x, chart.y);
    context.stroke();
    context.beginPath();
    context.moveTo(x, bottom);
    context.lineTo(x, bottom + rulerThickness);
    context.stroke();
  }

  for (let row = 0; row <= grid.height; row += 1) {
    const y = chart.y + row * chart.cellSize;
    context.beginPath();
    context.setLineDash([]);
    context.lineWidth = 0.8;
    context.strokeStyle = '#d5d0c9';
    context.moveTo(left, y);
    context.lineTo(chart.x, y);
    context.stroke();
    context.beginPath();
    context.moveTo(right, y);
    context.lineTo(right + rulerThickness, y);
    context.stroke();
  }

  context.fillStyle = '#43403a';
  context.font = `${Math.max(12, chart.cellSize * 0.42)}px ${PRINT_FONT_FAMILY}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  for (let column = 0; column < grid.width; column += 1) {
    const x = chart.x + column * chart.cellSize + chart.cellSize / 2;
    const label = String(column + 1);
    context.fillText(label, x, top + rulerThickness / 2);
    context.fillText(label, x, bottom + rulerThickness / 2);
  }

  context.textAlign = 'center';
  for (let row = 0; row < grid.height; row += 1) {
    const y = chart.y + row * chart.cellSize + chart.cellSize / 2;
    const label = String(row + 1);
    context.fillText(label, left + rulerThickness / 2, y);
    context.fillText(label, right + rulerThickness / 2, y);
  }
}

function drawGrid(
  context: CanvasRenderingContext2D,
  layout: ReturnType<typeof buildBeadPrintLayout>,
  grid: PixelGrid,
  labelMap: GridLabelMap,
) {
  const { chart } = layout;

  context.fillStyle = '#ffffff';
  context.fillRect(chart.x, chart.y, chart.width, chart.height);

  for (const cell of grid.cells) {
    const x = chart.x + cell.x * chart.cellSize;
    const y = chart.y + cell.y * chart.cellSize;
    const fill = cell.color ?? '#ffffff';

    context.fillStyle = fill;
    context.fillRect(x, y, chart.cellSize, chart.cellSize);

    if (!cell.color) {
      continue;
    }

    const label = labelMap.get(`${cell.x}-${cell.y}`);
    if (!label) {
      continue;
    }

    context.fillStyle = getCellTextColor(fill);
    context.font = `bold ${Math.max(10, chart.cellSize * 0.38)}px ${PRINT_FONT_FAMILY}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, x + chart.cellSize / 2, y + chart.cellSize / 2 + 0.5);
  }

  context.lineCap = 'square';

  for (let column = 0; column <= grid.width; column += 1) {
    const x = chart.x + column * chart.cellSize;
    const isTen = column % 10 === 0;
    const isFive = column % 5 === 0;

    context.beginPath();
    context.setLineDash(isTen ? [] : isFive ? [8, 6] : []);
    context.lineWidth = isTen ? 2.2 : isFive ? 1.2 : 0.6;
    context.strokeStyle = isTen ? '#3c3935' : isFive ? '#6f6b63' : '#bbb7b1';
    context.moveTo(x, chart.y);
    context.lineTo(x, chart.y + chart.height);
    context.stroke();
  }

  for (let row = 0; row <= grid.height; row += 1) {
    const y = chart.y + row * chart.cellSize;
    const isTen = row % 10 === 0;
    const isFive = row % 5 === 0;

    context.beginPath();
    context.setLineDash(isTen ? [] : isFive ? [8, 6] : []);
    context.lineWidth = isTen ? 2.2 : isFive ? 1.2 : 0.6;
    context.strokeStyle = isTen ? '#3c3935' : isFive ? '#6f6b63' : '#bbb7b1';
    context.moveTo(chart.x, y);
    context.lineTo(chart.x + chart.width, y);
    context.stroke();
  }

  context.setLineDash([]);
  context.strokeStyle = '#3c3935';
  context.lineWidth = 2.4;
  context.strokeRect(chart.x, chart.y, chart.width, chart.height);
}

function drawLegend(
  context: CanvasRenderingContext2D,
  layout: ReturnType<typeof buildBeadPrintLayout>,
  beadBrand: BeadBrand,
  beadUsage: BeadMappedColor[],
  grid: PixelGrid,
) {
  const exportDocument = buildScenarioExportDocument({
    scenario: 'beads',
    grid,
    beadBrand,
    beadUsage,
    exportMode: 'bead-chart',
  });

  if (exportDocument.kind !== 'beads') {
    return;
  }

  const { footer } = layout;
  const groups = exportDocument.beadUsageGroups.flatMap((group) => group.items);
  const tileGap = 12;
  const countGap = 8;
  const columns = Math.max(1, Math.floor((footer.width + tileGap) / (88 + tileGap)));
  const tileWidth = Math.floor((footer.width - tileGap * (columns - 1)) / columns);
  const tileHeight = 54;
  const countHeight = 18;
  const rowBlockHeight = tileHeight + countGap + countHeight;
  const rows = Math.ceil(groups.length / columns);
  const summaryY = footer.y + rows * (rowBlockHeight + tileGap) + 16;

  context.fillStyle = '#6e685f';
  context.font = `22px ${PRINT_FONT_FAMILY}`;
  context.textAlign = 'left';
  context.textBaseline = 'top';

  groups.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = footer.x + column * (tileWidth + tileGap);
    const y = footer.y + row * (rowBlockHeight + tileGap);

    context.fillStyle = item.hex;
    context.strokeStyle = '#3f3a34';
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(x, y, tileWidth, tileHeight, 12);
    context.fill();
    context.stroke();

    context.fillStyle = getCellTextColor(item.hex);
    context.font = `bold 24px ${PRINT_FONT_FAMILY}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(item.id, x + tileWidth / 2, y + tileHeight / 2);

    context.fillStyle = '#403c37';
    context.font = `20px ${PRINT_FONT_FAMILY}`;
    context.fillText(String(item.count), x + tileWidth / 2, y + tileHeight + countGap + countHeight / 2);
  });

  context.fillStyle = '#403c37';
  context.font = `20px ${PRINT_FONT_FAMILY}`;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText(`所需豆子数量：${exportDocument.beadSummary.totalCount} 颗`, footer.x, summaryY);
  context.fillText(
    `所需最小的行和列：${exportDocument.beadSummary.occupiedSize.rows} x ${exportDocument.beadSummary.occupiedSize.columns}`,
    footer.x,
    summaryY + 30,
  );
  context.fillText(`色板：${BEAD_BRANDS[beadBrand].label}`, footer.x, summaryY + 60);
}

export function renderBeadPrintPage({
  grid,
  beadBrand,
  beadUsage,
}: BeadPrintPageParams): HTMLCanvasElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const layout = buildBeadPrintLayout(grid);
  const canvas = document.createElement('canvas');
  canvas.width = layout.pageWidth;
  canvas.height = layout.pageHeight;

  let context: CanvasRenderingContext2D | null = null;

  try {
    context = canvas.getContext('2d');
  } catch {
    return null;
  }

  if (!context) {
    return null;
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const labelMap = buildGridLabelMap(grid, beadBrand);
  drawRulers(context, layout, grid);
  drawGrid(context, layout, grid, labelMap);
  drawLegend(context, layout, beadBrand, beadUsage, grid);

  return canvas;
}

export function renderBeadPrintPageDataUrl(params: BeadPrintPageParams): string | null {
  const canvas = renderBeadPrintPage(params);
  return canvas ? canvas.toDataURL('image/png') : null;
}
