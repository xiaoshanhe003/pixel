import type { PixelGrid } from '../types/pixel';
import { getPerceivedLuminance, hexToRgb } from './color';
import { buildBeadPrintLayout } from './beadPrintLayout';
import { buildScenarioExportDocument } from './scenarioExport';
import type { CrochetPatternAnalysis } from './crochet';

type CrochetPrintPageParams = {
  grid: PixelGrid;
  crochetAnalysis?: CrochetPatternAnalysis | null;
};

const PRINT_FONT_FAMILY = '"Cascadia Code", "Cascadia Mono", Consolas, monospace';
const FOOTER_TEXT_FONT_SIZE = 20;
const FOOTER_TEXT_LINE_HEIGHT = 28;

function getCellTextColor(color: string) {
  return getPerceivedLuminance(hexToRgb(color)) < 110 ? '#ffffff' : '#101010';
}

function getCrochetColumnLabel(column: number, width: number) {
  return String(width - column);
}

function getCrochetRowLabel(row: number, height: number) {
  return String(height - row);
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
  context.font = `${Math.max(10, chart.cellSize * 0.36)}px ${PRINT_FONT_FAMILY}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  for (let column = 0; column < grid.width; column += 1) {
    const x = chart.x + column * chart.cellSize + chart.cellSize / 2;
    const label = getCrochetColumnLabel(column, grid.width);
    context.fillText(label, x, top + rulerThickness / 2);
    context.fillText(label, x, bottom + rulerThickness / 2);
  }

  for (let row = 0; row < grid.height; row += 1) {
    const y = chart.y + row * chart.cellSize + chart.cellSize / 2;
    const label = getCrochetRowLabel(row, grid.height);
    context.fillText(label, left + rulerThickness / 2, y);
    context.fillText(label, right + rulerThickness / 2, y);
  }
}

function drawGrid(
  context: CanvasRenderingContext2D,
  layout: ReturnType<typeof buildBeadPrintLayout>,
  grid: PixelGrid,
  markByColor: Map<string, string>,
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

    const mark = markByColor.get(cell.color);
    if (!mark) {
      continue;
    }

    context.fillStyle = getCellTextColor(fill);
    context.font = `bold ${Math.max(9, chart.cellSize * (mark.length >= 3 ? 0.24 : 0.34))}px ${PRINT_FONT_FAMILY}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(mark, x + chart.cellSize / 2, y + chart.cellSize / 2 + 0.5);
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
  grid: PixelGrid,
  crochetAnalysis?: CrochetPatternAnalysis | null,
) {
  const exportDocument = buildScenarioExportDocument({
    scenario: 'crochet',
    grid,
    crochetAnalysis: crochetAnalysis ?? undefined,
    exportMode: 'crochet-chart',
  });

  if (exportDocument.kind !== 'crochet-chart') {
    return;
  }

  const { footer } = layout;
  const tileGap = 14;
  const textGap = 8;
  const columns = Math.max(1, Math.floor((footer.width + tileGap) / (160 + tileGap)));
  const tileWidth = Math.floor((footer.width - tileGap * (columns - 1)) / columns);
  const swatchHeight = 56;
  const textHeight = 22;
  const rowBlockHeight = swatchHeight + textGap + textHeight;
  const rows = Math.ceil(exportDocument.legend.length / columns);
  const summaryY = footer.y + rows * (rowBlockHeight + tileGap) + 20;
  const rowNotes = crochetAnalysis?.rows.filter((row) => row.stitchCount > 0) ?? [];

  exportDocument.legend.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = footer.x + column * (tileWidth + tileGap);
    const y = footer.y + row * (rowBlockHeight + tileGap);

    context.fillStyle = item.color;
    context.strokeStyle = '#3f3a34';
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(x, y, tileWidth, swatchHeight, 12);
    context.fill();
    context.stroke();

    context.fillStyle = getCellTextColor(item.color);
    context.font = `bold ${item.mark.length >= 3 ? 22 : 26}px ${PRINT_FONT_FAMILY}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(item.mark, x + tileWidth / 2, y + swatchHeight / 2);

    context.fillStyle = '#403c37';
    context.font = `${FOOTER_TEXT_FONT_SIZE}px ${PRINT_FONT_FAMILY}`;
    context.fillText(`${item.mark}  ${item.colorName}`, x + tileWidth / 2, y + swatchHeight + textGap + textHeight / 2);
  });

  context.fillStyle = '#403c37';
  context.font = `${FOOTER_TEXT_FONT_SIZE}px ${PRINT_FONT_FAMILY}`;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText(
    `图纸最小行列范围：${exportDocument.occupiedSize.rows} x ${exportDocument.occupiedSize.columns}`,
    footer.x,
    summaryY,
  );

  if (rowNotes.length === 0) {
    return;
  }

  const notesTitleY = summaryY + 40;
  const notesBodyY = notesTitleY + FOOTER_TEXT_LINE_HEIGHT;
  const availableHeight = footer.y + footer.height - notesBodyY;
  const rowsPerColumn = Math.max(1, Math.floor(availableHeight / FOOTER_TEXT_LINE_HEIGHT));
  const maxColumns = Math.max(1, Math.floor((footer.width + tileGap) / (340 + tileGap)));
  const requiredColumns = Math.ceil(rowNotes.length / rowsPerColumn);
  const columnCount = Math.max(1, Math.min(maxColumns, requiredColumns));
  const columnWidth = Math.floor((footer.width - tileGap * (columnCount - 1)) / columnCount);
  const maxVisibleRows = rowsPerColumn * columnCount;
  const overflowCount = Math.max(0, rowNotes.length - maxVisibleRows);
  const visibleRows =
    overflowCount > 0
      ? rowNotes.slice(0, Math.max(0, maxVisibleRows - 1))
      : rowNotes.slice(0, maxVisibleRows);

  context.fillStyle = '#403c37';
  context.font = `bold ${FOOTER_TEXT_FONT_SIZE}px ${PRINT_FONT_FAMILY}`;
  context.fillText('行列说明', footer.x, notesTitleY);

  context.font = `${FOOTER_TEXT_FONT_SIZE}px ${PRINT_FONT_FAMILY}`;
  visibleRows.forEach((row, index) => {
    const column = Math.floor(index / rowsPerColumn);
    const rowIndex = index % rowsPerColumn;
    const x = footer.x + column * (columnWidth + tileGap);
    const y = notesBodyY + rowIndex * FOOTER_TEXT_LINE_HEIGHT;

    context.fillText(
      `R${row.rowNumber}  ${row.instructions.join(' / ')}  ${row.stitchCount}针`,
      x,
      y,
    );
  });

  if (overflowCount > 0 && maxVisibleRows > 0) {
    const overflowIndex = maxVisibleRows - 1;
    const overflowColumn = Math.floor(overflowIndex / rowsPerColumn);
    const overflowRow = overflowIndex % rowsPerColumn;
    const overflowX = footer.x + overflowColumn * (columnWidth + tileGap);
    const overflowY = notesBodyY + overflowRow * FOOTER_TEXT_LINE_HEIGHT;

    context.fillText(`其余 ${overflowCount} 行未在本页展开`, overflowX, overflowY);
  }
}

export function renderCrochetPrintPage({
  grid,
  crochetAnalysis,
}: CrochetPrintPageParams): HTMLCanvasElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const exportDocument = buildScenarioExportDocument({
    scenario: 'crochet',
    grid,
    crochetAnalysis: crochetAnalysis ?? undefined,
    exportMode: 'crochet-chart',
  });

  if (exportDocument.kind !== 'crochet-chart') {
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

  drawRulers(context, layout, grid);
  drawGrid(context, layout, grid, exportDocument.markByColor);
  drawLegend(context, layout, grid, crochetAnalysis);

  return canvas;
}

export function renderCrochetPrintPageDataUrl(params: CrochetPrintPageParams): string | null {
  const canvas = renderCrochetPrintPage(params);
  return canvas ? canvas.toDataURL('image/png') : null;
}
