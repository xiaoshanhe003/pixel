import type { GridSize, PixelCell, PixelGrid } from '../types/pixel';
import type {
  ScenarioId,
  StudioDocument,
  StudioFrame,
  StudioLayer,
} from '../types/studio';
import { clampByte, hexToRgb, rgbToHex } from './color';

let nextStudioId = 0;

function createStudioId(prefix: string): string {
  nextStudioId += 1;
  return `${prefix}-${nextStudioId}`;
}

function buildPalette(cells: PixelCell[]): string[] {
  return [...new Set(cells.map((cell) => cell.color).filter(Boolean))] as string[];
}

export function createBlankGrid(size: GridSize): PixelGrid {
  const cells: PixelCell[] = Array.from({ length: size * size }, (_, index) => ({
    x: index % size,
    y: Math.floor(index / size),
    color: null,
    source: { r: 255, g: 255, b: 255 },
    alpha: 0,
  }));

  return {
    width: size,
    height: size,
    cells,
    palette: [],
  };
}

export function createBlankLayer(size: GridSize, name = '图层 1'): StudioLayer {
  return {
    id: createStudioId('layer'),
    name,
    visible: true,
    locked: false,
    opacity: 1,
    cells: createBlankGrid(size).cells,
  };
}

export function createBlankFrame(size: GridSize, name = '第 1 帧'): StudioFrame {
  const layer = createBlankLayer(size, '图层 1');

  return {
    id: createStudioId('frame'),
    name,
    layers: [layer],
    activeLayerId: layer.id,
  };
}

export function createStudioDocument(
  scenario: ScenarioId,
  size: GridSize,
): StudioDocument {
  const frame = createBlankFrame(size);

  return {
    scenario,
    width: size,
    height: size,
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
  width: GridSize,
  height: GridSize,
): PixelGrid {
  const cellCount = width * height;
  const base = createBlankGrid(width);
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
          color,
          alpha: color ? 255 : 0,
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
      color,
      alpha: color ? 255 : 0,
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

function applyColorAtPoints(
  grid: PixelGrid,
  points: Array<{ x: number; y: number }>,
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
      color,
      alpha: color ? 255 : 0,
    };
  }

  return {
    ...grid,
    cells: nextCells,
    palette: buildPalette(nextCells),
  };
}

export function drawLine(
  grid: PixelGrid,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string | null,
): PixelGrid {
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

  return applyColorAtPoints(grid, points, color);
}

export function drawRectangle(
  grid: PixelGrid,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string | null,
): PixelGrid {
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

  return applyColorAtPoints(grid, points, color);
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

export function addLayerToActiveFrame(document: StudioDocument): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => {
    const nextLayer = createBlankLayer(
      document.width,
      `图层 ${frame.layers.length + 1}`,
    );

    return {
      ...frame,
      layers: [nextLayer, ...frame.layers],
      activeLayerId: nextLayer.id,
    };
  });
}

export function duplicateActiveLayer(document: StudioDocument): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => {
    const source = frame.layers.find((layer) => layer.id === frame.activeLayerId);

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

export function deleteActiveLayer(document: StudioDocument): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => {
    if (frame.layers.length <= 1) {
      return frame;
    }

    const activeIndex = frame.layers.findIndex(
      (layer) => layer.id === frame.activeLayerId,
    );

    if (activeIndex === -1) {
      return frame;
    }

    const nextLayers = frame.layers.filter(
      (layer) => layer.id !== frame.activeLayerId,
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

export function mergeActiveLayerDown(document: StudioDocument): StudioDocument {
  return updateFrame(document, document.activeFrameId, (frame) => {
    const activeIndex = frame.layers.findIndex(
      (layer) => layer.id === frame.activeLayerId,
    );

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
