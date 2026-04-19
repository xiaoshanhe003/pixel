import type { GridSize, PixelCell, PixelGrid } from '../types/pixel';
import type { BeadBrand } from '../data/beadPalettes';
import type {
  EditorSelection,
  ScenarioId,
  StudioDocument,
  StudioFrame,
  StudioLayer,
} from '../types/studio';
import { clampByte, hexToRgb, rgbToHex } from './color';
import { mapColorToBeadPalette } from './beads';

export type LayerContentBounds = EditorSelection;
export type BrushPoint = {
  x: number;
  y: number;
  alignX?: 'before' | 'after';
  alignY?: 'before' | 'after';
};

let nextStudioId = 0;

function createStudioId(prefix: string): string {
  nextStudioId += 1;
  return `${prefix}-${nextStudioId}`;
}

function buildPalette(cells: PixelCell[]): string[] {
  return [...new Set(cells.map((cell) => cell.color).filter(Boolean))] as string[];
}

function buildCellColorPatch(color: string | null) {
  return color
    ? {
        color,
        source: hexToRgb(color),
        alpha: 255,
      }
    : {
        color: null,
        alpha: 0,
      };
}

export function createBlankGrid(width: GridSize, height = width): PixelGrid {
  const cells: PixelCell[] = Array.from({ length: width * height }, (_, index) => ({
    x: index % width,
    y: Math.floor(index / width),
    color: null,
    source: { r: 255, g: 255, b: 255 },
    alpha: 0,
  }));

  return {
    width,
    height,
    cells,
    palette: [],
  };
}

export function createBlankLayer(width: GridSize, height = width, name = '图层 1'): StudioLayer {
  return {
    id: createStudioId('layer'),
    name,
    visible: true,
    locked: false,
    opacity: 1,
    cells: createBlankGrid(width, height).cells,
  };
}

export function createBlankFrame(width: GridSize, height = width, name = '第 1 帧'): StudioFrame {
  const layer = createBlankLayer(width, height, '图层 1');

  return {
    id: createStudioId('frame'),
    name,
    layers: [layer],
    activeLayerId: layer.id,
  };
}

export function createStudioDocument(
  scenario: ScenarioId,
  width: GridSize,
  height = width,
): StudioDocument {
  const frame = createBlankFrame(width, height);

  return {
    scenario,
    width,
    height,
    frames: [frame],
    activeFrameId: frame.id,
  };
}

export function cloneGrid(grid: PixelGrid): PixelGrid {
  return {
    ...grid,
    palette: [...grid.palette],
    cells: grid.cells.map((cell) => ({
      ...cell,
      source: { ...cell.source },
    })),
  };
}

export function cloneLayer(layer: StudioLayer): StudioLayer {
  return {
    ...layer,
    id: createStudioId('layer'),
    cells: layer.cells.map((cell) => ({
      ...cell,
      source: { ...cell.source },
    })),
  };
}

export function cloneFrame(frame: StudioFrame): StudioFrame {
  const layers = frame.layers.map((layer) => cloneLayer(layer));
  const activeLayer = layers.find((layer, index) =>
    frame.layers[index]?.id === frame.activeLayerId,
  );

  return {
    ...frame,
    id: createStudioId('frame'),
    name: `${frame.name} 副本`,
    layers,
    activeLayerId: activeLayer?.id ?? layers[0]?.id ?? '',
  };
}

export function createDocumentFromGrid(
  scenario: ScenarioId,
  grid: PixelGrid,
): StudioDocument {
  const layer: StudioLayer = {
    id: createStudioId('layer'),
    name: '转绘底稿',
    visible: true,
    locked: false,
    opacity: 1,
    cells: grid.cells.map((cell) => ({
      ...cell,
      source: { ...cell.source },
    })),
  };
  const frame: StudioFrame = {
    id: createStudioId('frame'),
    name: '第 1 帧',
    layers: [layer],
    activeLayerId: layer.id,
  };

  return {
    scenario,
    width: grid.width,
    height: grid.height,
    frames: [frame],
    activeFrameId: frame.id,
  };
}

export function composeFrame(
  frame: StudioFrame,
  width: number,
  height: number,
): PixelGrid {
  const cellCount = width * height;
  const base = createBlankGrid(width, height);
  const cells = base.cells.map((cell, index) => {
    let compositeRed = 255;
    let compositeGreen = 255;
    let compositeBlue = 255;
    let compositeAlpha = 0;
    let topSource = cell.source;

    for (const layer of [...frame.layers].reverse()) {
      if (!layer.visible || layer.opacity <= 0) {
        continue;
      }

      const candidate = layer.cells[index];

      if (!candidate?.color) {
        continue;
      }

      const candidateAlpha = (candidate.alpha / 255) * layer.opacity;

      if (candidateAlpha <= 0) {
        continue;
      }

      const candidateRgb = hexToRgb(candidate.color);
      const nextAlpha = candidateAlpha + compositeAlpha * (1 - candidateAlpha);

      if (nextAlpha <= 0) {
        continue;
      }

      compositeRed = clampByte(
        (candidateRgb.r * candidateAlpha + compositeRed * compositeAlpha * (1 - candidateAlpha)) /
          nextAlpha,
      );
      compositeGreen = clampByte(
        (candidateRgb.g * candidateAlpha + compositeGreen * compositeAlpha * (1 - candidateAlpha)) /
          nextAlpha,
      );
      compositeBlue = clampByte(
        (candidateRgb.b * candidateAlpha + compositeBlue * compositeAlpha * (1 - candidateAlpha)) /
          nextAlpha,
      );
      compositeAlpha = nextAlpha;
      topSource = { ...candidate.source };
    }

    if (compositeAlpha <= 0) {
      return cell;
    }

    return {
      ...cell,
      color: rgbToHex({
        r: compositeRed,
        g: compositeGreen,
        b: compositeBlue,
      }),
      source: topSource,
      alpha: clampByte(compositeAlpha * 255),
    };
  });

  return {
    width,
    height,
    cells: cells.slice(0, cellCount),
    palette: buildPalette(cells),
  };
}

export function replaceCellColor(
  grid: PixelGrid,
  x: number,
  y: number,
  color: string | null,
): PixelGrid {
  const cells = grid.cells.map((cell) =>
    cell.x === x && cell.y === y
      ? {
          ...cell,
          ...buildCellColorPatch(color),
        }
      : cell,
  );

  return {
    ...grid,
    cells,
    palette: buildPalette(cells),
  };
}

function getCellIndex(width: number, x: number, y: number): number {
  return y * width + x;
}

export function measureLayerContentBounds(
  cells: PixelCell[],
  width: number,
  height: number,
): LayerContentBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (const cell of cells) {
    if (!cell.color || cell.alpha <= 0) {
      continue;
    }

    minX = Math.min(minX, cell.x);
    minY = Math.min(minY, cell.y);
    maxX = Math.max(maxX, cell.x);
    maxY = Math.max(maxY, cell.y);
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function clearCellsInBounds(
  cells: PixelCell[],
  gridWidth: number,
  bounds: LayerContentBounds,
) {
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const index = getCellIndex(gridWidth, x, y);
      const currentCell = cells[index];

      if (!currentCell) {
        continue;
      }

      cells[index] = {
        ...currentCell,
        color: null,
        alpha: 0,
      };
    }
  }
}

function createClampedBounds(
  grid: PixelGrid,
  minX: number,
  minY: number,
  width: number,
  height: number,
): LayerContentBounds {
  const nextMinX = Math.max(0, Math.min(grid.width - 1, minX));
  const nextMinY = Math.max(0, Math.min(grid.height - 1, minY));
  const nextWidth = Math.max(1, Math.min(width, grid.width - nextMinX));
  const nextHeight = Math.max(1, Math.min(height, grid.height - nextMinY));

  return {
    minX: nextMinX,
    minY: nextMinY,
    maxX: nextMinX + nextWidth - 1,
    maxY: nextMinY + nextHeight - 1,
    width: nextWidth,
    height: nextHeight,
  };
}

function moveGridSelection(
  grid: PixelGrid,
  bounds: LayerContentBounds,
  offsetX: number,
  offsetY: number,
): PixelGrid {
  if (offsetX === 0 && offsetY === 0) {
    return grid;
  }

  const nextCells = grid.cells.map((cell) => ({
    ...cell,
    source: { ...cell.source },
  }));
  const nextBounds = createClampedBounds(
    grid,
    bounds.minX + offsetX,
    bounds.minY + offsetY,
    bounds.width,
    bounds.height,
  );
  const unionBounds = {
    minX: Math.min(bounds.minX, nextBounds.minX),
    minY: Math.min(bounds.minY, nextBounds.minY),
    maxX: Math.max(bounds.maxX, nextBounds.maxX),
    maxY: Math.max(bounds.maxY, nextBounds.maxY),
    width: 0,
    height: 0,
  };
  unionBounds.width = unionBounds.maxX - unionBounds.minX + 1;
  unionBounds.height = unionBounds.maxY - unionBounds.minY + 1;

  clearCellsInBounds(nextCells, grid.width, unionBounds);

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const sourceCell = grid.cells[getCellIndex(grid.width, x, y)];

      if (!sourceCell || !sourceCell.color || sourceCell.alpha <= 0) {
        continue;
      }

      const targetX = x + offsetX;
      const targetY = y + offsetY;

      if (
        targetX < 0 ||
        targetX >= grid.width ||
        targetY < 0 ||
        targetY >= grid.height
      ) {
        continue;
      }

      const targetIndex = getCellIndex(grid.width, targetX, targetY);
      nextCells[targetIndex] = {
        ...nextCells[targetIndex],
        color: sourceCell.color,
        source: { ...sourceCell.source },
        alpha: sourceCell.alpha,
      };
    }
  }

  return {
    ...grid,
    cells: nextCells,
    palette: buildPalette(nextCells),
  };
}

function scaleGridSelection(
  grid: PixelGrid,
  bounds: LayerContentBounds,
  targetWidth: number,
  targetHeight: number,
): PixelGrid {
  const nextCells = grid.cells.map((cell) => ({
    ...cell,
    source: { ...cell.source },
  }));
  const nextBounds: LayerContentBounds = {
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: Math.min(grid.width - 1, bounds.minX + targetWidth - 1),
    maxY: Math.min(grid.height - 1, bounds.minY + targetHeight - 1),
    width: Math.min(targetWidth, grid.width - bounds.minX),
    height: Math.min(targetHeight, grid.height - bounds.minY),
  };
  const unionBounds: LayerContentBounds = {
    minX: Math.min(bounds.minX, nextBounds.minX),
    minY: Math.min(bounds.minY, nextBounds.minY),
    maxX: Math.max(bounds.maxX, nextBounds.maxX),
    maxY: Math.max(bounds.maxY, nextBounds.maxY),
    width: 0,
    height: 0,
  };
  unionBounds.width = unionBounds.maxX - unionBounds.minX + 1;
  unionBounds.height = unionBounds.maxY - unionBounds.minY + 1;

  clearCellsInBounds(nextCells, grid.width, unionBounds);

  for (let y = 0; y < nextBounds.height; y += 1) {
    for (let x = 0; x < nextBounds.width; x += 1) {
      const sourceX = bounds.minX + Math.min(
        bounds.width - 1,
        Math.floor((x * bounds.width) / nextBounds.width),
      );
      const sourceY = bounds.minY + Math.min(
        bounds.height - 1,
        Math.floor((y * bounds.height) / nextBounds.height),
      );
      const sourceCell = grid.cells[getCellIndex(grid.width, sourceX, sourceY)];

      if (!sourceCell || !sourceCell.color || sourceCell.alpha <= 0) {
        continue;
      }

      const targetX = bounds.minX + x;
      const targetY = bounds.minY + y;
      const targetIndex = getCellIndex(grid.width, targetX, targetY);

      nextCells[targetIndex] = {
        ...nextCells[targetIndex],
        color: sourceCell.color,
        source: { ...sourceCell.source },
        alpha: sourceCell.alpha,
      };
    }
  }

  return {
    ...grid,
    cells: nextCells,
    palette: buildPalette(nextCells),
  };
}

export function fillCellArea(
  grid: PixelGrid,
  x: number,
  y: number,
  color: string | null,
): PixelGrid {
  const startIndex = getCellIndex(grid.width, x, y);
  const startCell = grid.cells[startIndex];

  if (!startCell) {
    return grid;
  }

  const targetColor = startCell.color;

  if (targetColor === color) {
    return grid;
  }

  const nextCells = grid.cells.map((cell) => ({
    ...cell,
    source: { ...cell.source },
  }));
  const queue: Array<{ x: number; y: number }> = [{ x, y }];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    const currentIndex = getCellIndex(grid.width, current.x, current.y);

    if (visited.has(currentIndex)) {
      continue;
    }

    visited.add(currentIndex);

    const currentCell = nextCells[currentIndex];

    if (!currentCell || currentCell.color !== targetColor) {
      continue;
    }

    nextCells[currentIndex] = {
      ...currentCell,
      ...buildCellColorPatch(color),
    };

    if (current.x > 0) {
      queue.push({ x: current.x - 1, y: current.y });
    }

    if (current.x < grid.width - 1) {
      queue.push({ x: current.x + 1, y: current.y });
    }

    if (current.y > 0) {
      queue.push({ x: current.x, y: current.y - 1 });
    }

    if (current.y < grid.height - 1) {
      queue.push({ x: current.x, y: current.y + 1 });
    }
  }

  return {
    ...grid,
    cells: nextCells,
    palette: buildPalette(nextCells),
  };
}

function buildPointKey(x: number, y: number): string {
  return `${x}:${y}`;
}

export function buildBrushFootprint(
  x: number,
  y: number,
  size: 1 | 2 | 3 | 4,
  anchor: Pick<BrushPoint, 'alignX' | 'alignY'> = {},
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const startOffsetX =
    size % 2 === 0
      ? anchor.alignX === 'before'
        ? -(size / 2)
        : -(size / 2) + 1
      : -Math.floor(size / 2);
  const startOffsetY =
    size % 2 === 0
      ? anchor.alignY === 'before'
        ? -(size / 2)
        : -(size / 2) + 1
      : -Math.floor(size / 2);

  for (let offsetY = startOffsetY; offsetY < startOffsetY + size; offsetY += 1) {
    for (let offsetX = startOffsetX; offsetX < startOffsetX + size; offsetX += 1) {
      points.push({ x: x + offsetX, y: y + offsetY });
    }
  }

  return points;
}

function applyColorAtPoints(
  grid: PixelGrid,
  points: BrushPoint[],
  color: string | null,
): PixelGrid {
  if (points.length === 0) {
    return grid;
  }

  const nextCells = grid.cells.map((cell) => ({
    ...cell,
    source: { ...cell.source },
  }));
  const seen = new Set<string>();

  for (const point of points) {
    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x >= grid.width ||
      point.y >= grid.height
    ) {
      continue;
    }

    const pointKey = buildPointKey(point.x, point.y);

    if (seen.has(pointKey)) {
      continue;
    }

    seen.add(pointKey);
    const index = getCellIndex(grid.width, point.x, point.y);
    const currentCell = nextCells[index];

    if (!currentCell) {
      continue;
    }

    nextCells[index] = {
      ...currentCell,
      ...buildCellColorPatch(color),
    };
  }

  return {
    ...grid,
    cells: nextCells,
    palette: buildPalette(nextCells),
  };
}

export function applyBrushStroke(
  grid: PixelGrid,
  x: number,
  y: number,
  size: 1 | 2 | 3 | 4,
  color: string | null,
  anchor?: Pick<BrushPoint, 'alignX' | 'alignY'>,
): PixelGrid {
  return applyColorAtPoints(grid, buildBrushFootprint(x, y, size, anchor), color);
}

export function applyBrushStrokePath(
  grid: PixelGrid,
  points: BrushPoint[],
  size: 1 | 2 | 3 | 4,
  color: string | null,
): PixelGrid {
  return applyColorAtPoints(
    grid,
    points.flatMap((point) =>
      buildBrushFootprint(point.x, point.y, size, {
        alignX: point.alignX,
        alignY: point.alignY,
      }),
    ),
    color,
  );
}

export function buildLinePoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  let currentX = startX;
  let currentY = startY;
  const deltaX = Math.abs(endX - startX);
  const deltaY = Math.abs(endY - startY);
  const stepX = startX < endX ? 1 : -1;
  const stepY = startY < endY ? 1 : -1;
  let error = deltaX - deltaY;

  while (true) {
    points.push({ x: currentX, y: currentY });

    if (currentX === endX && currentY === endY) {
      break;
    }

    const doubledError = error * 2;

    if (doubledError > -deltaY) {
      error -= deltaY;
      currentX += stepX;
    }

    if (doubledError < deltaX) {
      error += deltaX;
      currentY += stepY;
    }
  }

  return points;
}

export function drawLine(
  grid: PixelGrid,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string | null,
): PixelGrid {
  return applyColorAtPoints(grid, buildLinePoints(startX, startY, endX, endY), color);
}

export function buildRectanglePoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): Array<{ x: number; y: number }> {
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);
  const points: Array<{ x: number; y: number }> = [];

  for (let x = minX; x <= maxX; x += 1) {
    points.push({ x, y: minY });
    points.push({ x, y: maxY });
  }

  for (let y = minY; y <= maxY; y += 1) {
    points.push({ x: minX, y });
    points.push({ x: maxX, y });
  }

  return points;
}

export function drawRectangle(
  grid: PixelGrid,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string | null,
): PixelGrid {
  return applyColorAtPoints(
    grid,
    buildRectanglePoints(startX, startY, endX, endY),
    color,
  );
}

function updateFrame(
  document: StudioDocument,
  frameId: string,
  updater: (frame: StudioFrame) => StudioFrame,
): StudioDocument {
  return {
    ...document,
    frames: document.frames.map((frame) =>
      frame.id === frameId ? updater(frame) : frame,
    ),
  };
}

export function replaceActiveLayerCell(
  document: StudioDocument,
  x: number,
  y: number,
  color: string | null,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) => {
      if (layer.id !== frame.activeLayerId || layer.locked) {
        return layer;
      }

      return {
        ...layer,
        cells: replaceCellColor(
          {
            width: document.width,
            height: document.height,
            cells: layer.cells,
            palette: [],
          },
          x,
          y,
          color,
        ).cells,
      };
    }),
  }));
}

export function remapActiveLayerBeadColors(
  document: StudioDocument,
  brand: BeadBrand,
  replacements: ReadonlyMap<string, string>,
): StudioDocument {
  if (replacements.size === 0) {
    return document;
  }

  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) => {
      if (!layer.visible || layer.locked) {
        return layer;
      }

      let didChange = false;
      const cells = layer.cells.map((cell) => {
        if (!cell.color) {
          return cell;
        }

        const mappedColor = mapColorToBeadPalette(cell.color, brand).trim().toLowerCase();
        const replacement = replacements.get(mappedColor);

        if (!replacement || replacement === mappedColor) {
          return cell;
        }

        didChange = true;
        return {
          ...cell,
          ...buildCellColorPatch(replacement),
        };
      });

      return didChange ? { ...layer, cells } : layer;
    }),
  }));
}

export function cleanupActiveLayerBeadNoise(
  document: StudioDocument,
  brand: BeadBrand,
  replacements: ReadonlyArray<{ x: number; y: number; from: string; to: string }>,
): StudioDocument {
  if (replacements.length === 0) {
    return document;
  }

  const replacementByPoint = new Map(
    replacements.map((replacement) => [
      `${replacement.x}:${replacement.y}`,
      { from: replacement.from.trim().toLowerCase(), to: replacement.to.trim().toLowerCase() },
    ]),
  );

  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) => {
      if (!layer.visible || layer.locked) {
        return layer;
      }

      let didChange = false;
      const cells = layer.cells.map((cell) => {
        if (!cell.color) {
          return cell;
        }

        const replacement = replacementByPoint.get(`${cell.x}:${cell.y}`);

        if (!replacement) {
          return cell;
        }

        const mappedColor = mapColorToBeadPalette(cell.color, brand).trim().toLowerCase();

        if (mappedColor !== replacement.from || replacement.to === replacement.from) {
          return cell;
        }

        didChange = true;
        return {
          ...cell,
          ...buildCellColorPatch(replacement.to),
        };
      });

      return didChange ? { ...layer, cells } : layer;
    }),
  }));
}

export function applyBrushStrokeOnActiveLayer(
  document: StudioDocument,
  x: number,
  y: number,
  size: 1 | 2 | 3 | 4,
  color: string | null,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) => {
      if (layer.id !== frame.activeLayerId || layer.locked) {
        return layer;
      }

      return {
        ...layer,
        cells: applyBrushStroke(
          {
            width: document.width,
            height: document.height,
            cells: layer.cells,
            palette: [],
          },
          x,
          y,
          size,
          color,
        ).cells,
      };
    }),
  }));
}

export function applyBrushStrokePathOnActiveLayer(
  document: StudioDocument,
  points: Array<{ x: number; y: number }>,
  size: 1 | 2 | 3 | 4,
  color: string | null,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) => {
      if (layer.id !== frame.activeLayerId || layer.locked) {
        return layer;
      }

      return {
        ...layer,
        cells: applyBrushStrokePath(
          {
            width: document.width,
            height: document.height,
            cells: layer.cells,
            palette: [],
          },
          points,
          size,
          color,
        ).cells,
      };
    }),
  }));
}

export function fillActiveLayerArea(
  document: StudioDocument,
  x: number,
  y: number,
  color: string | null,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) => {
      if (layer.id !== frame.activeLayerId || layer.locked) {
        return layer;
      }

      return {
        ...layer,
        cells: fillCellArea(
          {
            width: document.width,
            height: document.height,
            cells: layer.cells,
            palette: [],
          },
          x,
          y,
          color,
        ).cells,
      };
    }),
  }));
}

export function drawLineOnActiveLayer(
  document: StudioDocument,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string | null,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) => {
      if (layer.id !== frame.activeLayerId || layer.locked) {
        return layer;
      }

      return {
        ...layer,
        cells: drawLine(
          {
            width: document.width,
            height: document.height,
            cells: layer.cells,
            palette: [],
          },
          startX,
          startY,
          endX,
          endY,
          color,
        ).cells,
      };
    }),
  }));
}

export function drawRectangleOnActiveLayer(
  document: StudioDocument,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string | null,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) => {
      if (layer.id !== frame.activeLayerId || layer.locked) {
        return layer;
      }

      return {
        ...layer,
        cells: drawRectangle(
          {
            width: document.width,
            height: document.height,
            cells: layer.cells,
            palette: [],
          },
          startX,
          startY,
          endX,
          endY,
          color,
        ).cells,
      };
    }),
  }));
}

export function scaleActiveLayerSelection(
  document: StudioDocument,
  bounds: LayerContentBounds,
  targetWidth: number,
  targetHeight: number,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) => {
      if (layer.id !== frame.activeLayerId || layer.locked) {
        return layer;
      }

      return {
        ...layer,
        cells: scaleGridSelection(
          {
            width: document.width,
            height: document.height,
            cells: layer.cells,
            palette: [],
          },
          bounds,
          Math.max(1, targetWidth),
          Math.max(1, targetHeight),
        ).cells,
      };
    }),
  }));
}

export function moveActiveLayerSelection(
  document: StudioDocument,
  bounds: LayerContentBounds,
  offsetX: number,
  offsetY: number,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) => {
      if (layer.id !== frame.activeLayerId || layer.locked) {
        return layer;
      }

      return {
        ...layer,
        cells: moveGridSelection(
          {
            width: document.width,
            height: document.height,
            cells: layer.cells,
            palette: [],
          },
          bounds,
          offsetX,
          offsetY,
        ).cells,
      };
    }),
  }));
}

export function addLayerToActiveFrame(document: StudioDocument): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => {
    const nextLayer = createBlankLayer(
      document.width,
      document.height,
      `图层 ${frame.layers.length + 1}`,
    );

    return {
      ...frame,
      layers: [nextLayer, ...frame.layers],
      activeLayerId: nextLayer.id,
    };
  });
}

export function duplicateActiveLayer(
  document: StudioDocument,
  layerId = document.frames.find((frame) => frame.id === document.activeFrameId)?.activeLayerId,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => {
    const source = frame.layers.find((layer) => layer.id === layerId);

    if (!source) {
      return frame;
    }

    const duplicate = {
      ...cloneLayer(source),
      name: `${source.name} 副本`,
    };
    const sourceIndex = frame.layers.findIndex((layer) => layer.id === source.id);
    const nextLayers = [...frame.layers];
    nextLayers.splice(sourceIndex, 0, duplicate);

    return {
      ...frame,
      layers: nextLayers,
      activeLayerId: duplicate.id,
    };
  });
}

export function deleteActiveLayer(
  document: StudioDocument,
  layerId = document.frames.find((frame) => frame.id === document.activeFrameId)?.activeLayerId,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => {
    if (frame.layers.length <= 1) {
      return frame;
    }

    const activeIndex = frame.layers.findIndex((layer) => layer.id === layerId);

    if (activeIndex === -1) {
      return frame;
    }

    const nextLayers = frame.layers.filter(
      (layer) => layer.id !== layerId,
    );
    const nextActiveLayer =
      nextLayers[Math.min(activeIndex, nextLayers.length - 1)] ?? nextLayers[0];

    return {
      ...frame,
      layers: nextLayers,
      activeLayerId: nextActiveLayer.id,
    };
  });
}

export function mergeActiveLayerDown(
  document: StudioDocument,
  layerId = document.frames.find((frame) => frame.id === document.activeFrameId)?.activeLayerId,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => {
    const activeIndex = frame.layers.findIndex((layer) => layer.id === layerId);

    if (
      activeIndex === -1 ||
      activeIndex >= frame.layers.length - 1 ||
      frame.layers.length <= 1
    ) {
      return frame;
    }

    const topLayer = frame.layers[activeIndex];
    const lowerLayer = frame.layers[activeIndex + 1];

    if (topLayer.locked || lowerLayer.locked) {
      return frame;
    }

    const mergedCells = lowerLayer.cells.map((cell, index) => {
      const topCell = topLayer.cells[index];

      if (!topCell?.color) {
        return {
          ...cell,
          source: { ...cell.source },
        };
      }

      return {
        ...topCell,
        source: { ...topCell.source },
      };
    });

    const mergedLayer: StudioLayer = {
      ...lowerLayer,
      cells: mergedCells,
    };
    const nextLayers = [...frame.layers];
    nextLayers.splice(activeIndex, 2, mergedLayer);

    return {
      ...frame,
      layers: nextLayers,
      activeLayerId: mergedLayer.id,
    };
  });
}

export function renameLayer(
  document: StudioDocument,
  layerId: string,
  name: string,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) =>
      layer.id === layerId ? { ...layer, name } : layer,
    ),
  }));
}

export function toggleLayerVisibility(
  document: StudioDocument,
  layerId: string,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) =>
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer,
    ),
  }));
}

export function toggleLayerLock(
  document: StudioDocument,
  layerId: string,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) =>
      layer.id === layerId ? { ...layer, locked: !layer.locked } : layer,
    ),
  }));
}

export function clearActiveLayer(
  document: StudioDocument,
  layerId: string,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) =>
      layer.id === layerId && !layer.locked
        ? {
            ...layer,
            cells: layer.cells.map((cell) => ({
              ...cell,
              color: null,
              source: { ...cell.source },
            })),
          }
        : layer,
    ),
  }));
}

export function moveLayer(
  document: StudioDocument,
  layerId: string,
  direction: 'up' | 'down',
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => {
    const index = frame.layers.findIndex((layer) => layer.id === layerId);

    if (index === -1) {
      return frame;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= frame.layers.length) {
      return frame;
    }

    const nextLayers = [...frame.layers];
    const [layer] = nextLayers.splice(index, 1);
    nextLayers.splice(targetIndex, 0, layer);

    return {
      ...frame,
      layers: nextLayers,
    };
  });
}

export function moveLayerToIndex(
  document: StudioDocument,
  layerId: string,
  targetIndex: number,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => {
    const index = frame.layers.findIndex((layer) => layer.id === layerId);

    if (index === -1 || targetIndex < 0 || targetIndex >= frame.layers.length) {
      return frame;
    }

    if (index === targetIndex) {
      return frame;
    }

    const nextLayers = [...frame.layers];
    const [layer] = nextLayers.splice(index, 1);
    nextLayers.splice(targetIndex, 0, layer);

    return {
      ...frame,
      layers: nextLayers,
    };
  });
}

export function setActiveLayer(
  document: StudioDocument,
  layerId: string,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    activeLayerId: layerId,
  }));
}

export function setLayerOpacity(
  document: StudioDocument,
  layerId: string,
  opacity: number,
): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => ({
    ...frame,
    layers: frame.layers.map((layer) =>
      layer.id === layerId
        ? { ...layer, opacity: Math.max(0, Math.min(1, opacity)) }
        : layer,
    ),
  }));
}

export function addFrameToDocument(document: StudioDocument): StudioDocument {
  const nextFrame = createBlankFrame(
    document.width,
    document.height,
    `第 ${document.frames.length + 1} 帧`,
  );

  return {
    ...document,
    frames: [...document.frames, nextFrame],
    activeFrameId: nextFrame.id,
  };
}

export function duplicateActiveFrame(document: StudioDocument): StudioDocument {
  const source = document.frames.find((frame) => frame.id === document.activeFrameId);

  if (!source) {
    return document;
  }

  const duplicate = {
    ...cloneFrame(source),
    name: `第 ${document.frames.length + 1} 帧`,
  };

  return {
    ...document,
    frames: [...document.frames, duplicate],
    activeFrameId: duplicate.id,
  };
}

export function deleteActiveFrame(document: StudioDocument): StudioDocument {
  if (document.frames.length <= 1) {
    return document;
  }

  const activeIndex = document.frames.findIndex(
    (frame) => frame.id === document.activeFrameId,
  );
  const nextFrames = document.frames.filter(
    (frame) => frame.id !== document.activeFrameId,
  );
  const nextActive =
    nextFrames[Math.max(0, activeIndex - 1)] ?? nextFrames[0];

  return {
    ...document,
    frames: nextFrames,
    activeFrameId: nextActive.id,
  };
}

export function setActiveFrame(
  document: StudioDocument,
  frameId: string,
): StudioDocument {
  return {
    ...document,
    activeFrameId: frameId,
  };
}

export function countPaletteUsage(grid: PixelGrid | null): Map<string, number> {
  const counts = new Map<string, number>();

  if (!grid) {
    return counts;
  }

  for (const cell of grid.cells) {
    if (!cell.color) {
      continue;
    }

    counts.set(cell.color, (counts.get(cell.color) ?? 0) + 1);
  }

  return counts;
}

export function getTransparentCount(grid: PixelGrid | null): number {
  return grid?.cells.filter((cell) => cell.color === null).length ?? 0;
}
