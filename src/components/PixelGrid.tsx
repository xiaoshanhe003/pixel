import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PixelGrid as PixelGridModel } from '../types/pixel';
import type { EditorSelection, EditorTool, EditorToolSettings } from '../types/studio';
import {
  buildBrushFootprint,
  buildLinePoints,
  buildRectanglePoints,
} from '../utils/studio';
import type { BrushPoint, LayerContentBounds } from '../utils/studio';
import { getCursorForTool } from '../utils/toolCursors';

type PixelGridProps = {
  grid: PixelGridModel;
  scenario?: 'pixel' | 'beads' | 'crochet';
  editable?: boolean;
  activeColor?: string;
  tool?: EditorTool;
  toolSettings: EditorToolSettings;
  onPreviewPaintStroke?: (
    points: BrushPoint[],
    color: string | null,
  ) => void;
  onCommitPaintStroke?: (
    points: BrushPoint[],
    color: string | null,
  ) => void;
  onFillArea?: (x: number, y: number, color: string | null) => void;
  onDrawLine?: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string | null,
  ) => void;
  onDrawRectangle?: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string | null,
  ) => void;
  onSampleCell?: (color: string | null) => void;
  onSelectionChange?: (selection: EditorSelection | null) => void;
  onPreviewMoveSelection?: (offsetX: number, offsetY: number) => void;
  onCommitMoveSelection?: (offsetX: number, offsetY: number) => void;
  onPreviewScaleSelection?: (targetWidth: number, targetHeight: number) => void;
  onCommitScaleSelection?: (targetWidth: number, targetHeight: number) => void;
  zoom?: number;
  showGrid?: boolean;
  presentation?: 'color' | 'symbol';
  getCellOverlay?: (cell: PixelGridModel['cells'][number]) => string | undefined;
  onViewportSizeChange?: (size: { width: number; height: number }) => void;
  selectionBounds?: LayerContentBounds | null;
};

export function getBaseCellSize(width: number) {
  return width === 16 ? 42 : width === 32 ? 24 : 12;
}

const GRID_LINE_WIDTH = 1;
const PAN_EDGE_GUTTER = 96;
const DEFAULT_TOP_SAFE_MARGIN = 24;
const BEAD_AXIS_LABEL_SIZE = 22;
const BEAD_AXIS_LABEL_GAP = 0;
const BEAD_AXIS_LABEL_HORIZONTAL_PADDING = 8;
const BEAD_AXIS_LABEL_CHAR_WIDTH = 7;

type ViewportMetrics = {
  width: number;
  height: number;
};

function readViewportMetrics(viewport: HTMLDivElement): ViewportMetrics {
  const computedStyle = window.getComputedStyle(viewport);
  const horizontalPadding =
    (Number.parseFloat(computedStyle.paddingLeft) || 0) +
    (Number.parseFloat(computedStyle.paddingRight) || 0);
  const verticalPadding =
    (Number.parseFloat(computedStyle.paddingTop) || 0) +
    (Number.parseFloat(computedStyle.paddingBottom) || 0);

  return {
    width: Math.max(0, viewport.clientWidth - horizontalPadding),
    height: Math.max(0, viewport.clientHeight - verticalPadding),
  };
}

function buildCenteredOffset(
  viewport: ViewportMetrics,
  contentWidth: number,
  contentHeight: number,
) {
  return {
    x: (viewport.width - contentWidth) / 2,
    y:
      contentHeight <= viewport.height
        ? Math.min(DEFAULT_TOP_SAFE_MARGIN, Math.max(0, viewport.height - contentHeight))
        : (viewport.height - contentHeight) / 2,
  };
}

function snapOffsetToDevicePixel(value: number, enabled: boolean) {
  return enabled ? Math.round(value) : value;
}

function buildAxisLabelSteps(maxValue: number) {
  const steps: number[] = [];
  let magnitude = 1;

  while (magnitude <= Math.max(1, maxValue) * 10) {
    steps.push(magnitude, magnitude * 2, magnitude * 5);
    magnitude *= 10;
  }

  return Array.from(new Set(steps)).sort((left, right) => left - right);
}

function estimateAxisLabelWidth(maxValue: number) {
  return String(Math.max(1, maxValue)).length * BEAD_AXIS_LABEL_CHAR_WIDTH;
}

function getAxisLabelStep(maxValue: number, cellStride: number) {
  const requiredWidth =
    estimateAxisLabelWidth(maxValue) + BEAD_AXIS_LABEL_HORIZONTAL_PADDING;

  return (
    buildAxisLabelSteps(maxValue).find((step) => step * cellStride >= requiredWidth) ??
    Math.max(1, maxValue)
  );
}

function shouldRenderAxisLabel(value: number, maxValue: number, step: number) {
  return value % step === 0;
}

function getAxisLabelSpan(value: number, step: number) {
  return Math.max(step, value > 0 ? Math.min(step, value) : step);
}

function readPointerCellTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const x = Number(target.dataset.cellX);
  const y = Number(target.dataset.cellY);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return { x, y };
}

function clampCellIndex(value: number, max: number) {
  return Math.max(0, Math.min(max - 1, value));
}

export default function PixelGrid({
  grid,
  scenario = 'pixel',
  editable = false,
  activeColor,
  tool = 'paint',
  toolSettings,
  onPreviewPaintStroke,
  onCommitPaintStroke,
  onFillArea,
  onDrawLine,
  onDrawRectangle,
  onSampleCell,
  onSelectionChange,
  onPreviewMoveSelection,
  onCommitMoveSelection,
  onPreviewScaleSelection,
  onCommitScaleSelection,
  zoom = 1,
  showGrid = true,
  presentation = 'color',
  getCellOverlay,
  onViewportSizeChange,
  selectionBounds,
}: PixelGridProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const paintStateRef = useRef<{
    pointerId: number;
    color: string | null;
    mode: 'paint' | 'erase';
    points: BrushPoint[];
    visited: Set<string>;
    lastPoint: BrushPoint;
  } | null>(null);
  const suppressClickPaintRef = useRef(false);
  const shapeStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    tool: 'line' | 'rectangle';
  } | null>(null);
  const selectionStateRef = useRef<{
    pointerId: number;
    mode: 'marquee' | 'move' | 'scale';
    startX: number;
    startY: number;
    bounds: LayerContentBounds;
    width: number;
    height: number;
  } | null>(null);
  const [interactionPreview, setInteractionPreview] = useState<{
    cells: Array<{ x: number; y: number }>;
    label: string;
  } | null>(null);
  const [paintPreview, setPaintPreview] = useState<{
    points: BrushPoint[];
    size: 1 | 2 | 3 | 4;
    color: string | null;
  } | null>(null);
  const [hoverCell, setHoverCell] = useState<BrushPoint | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [viewportMetrics, setViewportMetrics] = useState<ViewportMetrics>({
    width: 0,
    height: 0,
  });
  const [selectionPreviewSize, setSelectionPreviewSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [selectionPreviewOffset, setSelectionPreviewOffset] = useState<{
    x: number;
    y: number;
  } | null>(null);

  function commitStroke(points: BrushPoint[], color: string | null) {
    onCommitPaintStroke?.(points, color);
  }

  function readBrushPointFromEvent(
    event: { clientX: number; clientY: number; currentTarget: EventTarget | null },
    cell: { x: number; y: number },
    size: 1 | 2 | 3 | 4,
  ): BrushPoint {
    if (!(event.currentTarget instanceof HTMLElement) || size % 2 !== 0) {
      return cell;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;

    return {
      ...cell,
      alignX: relativeX < rect.width / 2 ? 'before' : 'after',
      alignY: relativeY < rect.height / 2 ? 'before' : 'after',
    };
  }

  const toolCursor = getCursorForTool(tool);
  const localPaintPreview = useMemo(
    () =>
      editable && paintPreview
        ? {
            cells: paintPreview.points.flatMap((point) =>
              buildBrushFootprint(point.x, point.y, paintPreview.size, {
                alignX: point.alignX,
                alignY: point.alignY,
              }),
            ),
          }
        : null,
    [editable, paintPreview],
  );
  const hoverPreview =
    editable &&
    !paintPreview &&
    hoverCell &&
    (tool === 'paint' || tool === 'erase')
      ? {
          cells: buildBrushFootprint(
            hoverCell.x,
            hoverCell.y,
            tool === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize,
            {
              alignX: hoverCell.alignX,
              alignY: hoverCell.alignY,
            },
          ),
        }
      : null;
  const previewCells =
    localPaintPreview?.cells ?? interactionPreview?.cells ?? hoverPreview?.cells ?? [];
  const previewLookup = useMemo(
    () => new Set(previewCells.map((cell) => `${cell.x}-${cell.y}`)),
    [previewCells],
  );
  const baseCellSize = getBaseCellSize(grid.width);
  const rawScaledCellSize = baseCellSize * zoom;
  const displayCellSize = showGrid ? Math.max(1, Math.round(rawScaledCellSize)) : rawScaledCellSize;
  const lineWidth = showGrid ? GRID_LINE_WIDTH : 0;
  const frameInset = showGrid ? GRID_LINE_WIDTH : 0;
  const cellStride = displayCellSize + lineWidth;
  const innerGridWidth =
    grid.width * displayCellSize + Math.max(0, grid.width - 1) * lineWidth;
  const innerGridHeight =
    grid.height * displayCellSize + Math.max(0, grid.height - 1) * lineWidth;
  const scaledGridWidth = innerGridWidth + frameInset * 2;
  const scaledGridHeight = innerGridHeight + frameInset * 2;
  const hideTransparencyTexture = displayCellSize < 6;
  const beadAxisInset =
    scenario === 'beads' ? BEAD_AXIS_LABEL_SIZE + BEAD_AXIS_LABEL_GAP : 0;
  const contentViewportMetrics = useMemo(
    () => ({
      width: Math.max(0, viewportMetrics.width - beadAxisInset),
      height: Math.max(0, viewportMetrics.height - beadAxisInset),
    }),
    [beadAxisInset, viewportMetrics.height, viewportMetrics.width],
  );

  const finalizeShape = useCallback(() => {
    if (!shapeStateRef.current) {
      return;
    }

    const { startX, startY, endX, endY, tool: shapeTool } = shapeStateRef.current;
    const nextColor = activeColor ?? null;

    if (shapeTool === 'line') {
      onDrawLine?.(startX, startY, endX, endY, nextColor);
      setInteractionPreview(null);
      return;
    }

    onDrawRectangle?.(startX, startY, endX, endY, nextColor);
    setInteractionPreview(null);
  }, [activeColor, onDrawLine, onDrawRectangle]);

  useEffect(() => {
    function handleGlobalPointerEnd(event: PointerEvent) {
      if (
        paintStateRef.current &&
        paintStateRef.current.pointerId === event.pointerId
      ) {
        viewportRef.current?.releasePointerCapture?.(event.pointerId);
        commitStroke(paintStateRef.current.points, paintStateRef.current.color);
        paintStateRef.current = null;
        setPaintPreview(null);
        suppressClickPaintRef.current = true;
      }

      if (
        shapeStateRef.current &&
        shapeStateRef.current.pointerId === event.pointerId
      ) {
        finalizeShape();
        shapeStateRef.current = null;
      }

      if (
        selectionStateRef.current &&
        selectionStateRef.current.pointerId === event.pointerId
      ) {
        if (selectionStateRef.current.mode === 'move') {
          const targetCell = readPointerCellTarget(event.target);
          const offsetX = targetCell
            ? targetCell.x - selectionStateRef.current.bounds.minX
            : Math.round(
                ((event.clientX ?? selectionStateRef.current.startX) -
                  selectionStateRef.current.startX) /
                  displayCellSize,
              );
          const offsetY = targetCell
            ? targetCell.y - selectionStateRef.current.bounds.minY
            : Math.round(
                ((event.clientY ?? selectionStateRef.current.startY) -
                  selectionStateRef.current.startY) /
                  displayCellSize,
              );
          onCommitMoveSelection?.(offsetX, offsetY);
        } else if (selectionStateRef.current.mode === 'scale') {
          onCommitScaleSelection?.(
            selectionPreviewSize?.width ?? selectionStateRef.current.width,
            selectionPreviewSize?.height ?? selectionStateRef.current.height,
          );
        }

        selectionStateRef.current = null;
        setSelectionPreviewSize(null);
        setSelectionPreviewOffset(null);
      }
    }

    window.addEventListener('pointerup', handleGlobalPointerEnd);
    window.addEventListener('pointercancel', handleGlobalPointerEnd);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerEnd);
      window.removeEventListener('pointercancel', handleGlobalPointerEnd);
    };
  }, [
    displayCellSize,
    finalizeShape,
    grid.height,
    grid.width,
    onCommitMoveSelection,
    onCommitScaleSelection,
    selectionPreviewSize?.height,
    selectionPreviewSize?.width,
  ]);

  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [grid.width, grid.height, zoom]);

  useEffect(() => {
    setSelectionPreviewSize(null);
    setSelectionPreviewOffset(null);
    selectionStateRef.current = null;
  }, [selectionBounds?.height, selectionBounds?.width, tool]);

  const centeredOffset = useMemo(
    () => buildCenteredOffset(contentViewportMetrics, scaledGridWidth, scaledGridHeight),
    [contentViewportMetrics, scaledGridHeight, scaledGridWidth],
  );
  const getConstrainedPanOffset = useCallback(
    (nextOffset: { x: number; y: number }) => {
      if (contentViewportMetrics.width === 0 || contentViewportMetrics.height === 0) {
        return { x: 0, y: 0 };
      }

      const horizontalGutter = Math.min(
        PAN_EDGE_GUTTER,
        Math.max(0, Math.floor(contentViewportMetrics.width * 0.24)),
      );
      const verticalGutter = Math.min(
        PAN_EDGE_GUTTER,
        Math.max(0, Math.floor(contentViewportMetrics.height * 0.24)),
      );
      const minOffsetX =
        scaledGridWidth > contentViewportMetrics.width
          ? contentViewportMetrics.width - scaledGridWidth - horizontalGutter
          : centeredOffset.x;
      const maxOffsetX =
        scaledGridWidth > contentViewportMetrics.width ? horizontalGutter : centeredOffset.x;
      const minOffsetY =
        scaledGridHeight > contentViewportMetrics.height
          ? contentViewportMetrics.height - scaledGridHeight - verticalGutter
          : centeredOffset.y;
      const maxOffsetY =
        scaledGridHeight > contentViewportMetrics.height ? verticalGutter : centeredOffset.y;

      return {
        x: Math.min(Math.max(nextOffset.x, minOffsetX - centeredOffset.x), maxOffsetX - centeredOffset.x),
        y: Math.min(Math.max(nextOffset.y, minOffsetY - centeredOffset.y), maxOffsetY - centeredOffset.y),
      };
    },
    [
      centeredOffset.x,
      centeredOffset.y,
      contentViewportMetrics.height,
      contentViewportMetrics.width,
      scaledGridHeight,
      scaledGridWidth,
    ],
  );
  const gridOffset = useMemo(() => {
    return {
      x: centeredOffset.x + panOffset.x,
      y: centeredOffset.y + panOffset.y,
    };
  }, [centeredOffset.x, centeredOffset.y, panOffset.x, panOffset.y]);
  const renderedGridOffset = useMemo(
    () => ({
      x: snapOffsetToDevicePixel(gridOffset.x, showGrid),
      y: snapOffsetToDevicePixel(gridOffset.y, showGrid),
    }),
    [gridOffset.x, gridOffset.y, showGrid],
  );
  const readBrushPointFromViewportEvent = useCallback(
    (event: { clientX: number; clientY: number }, size: 1 | 2 | 3 | 4): BrushPoint | null => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return null;
      }

      const rect = viewport.getBoundingClientRect();
      const relativeX =
        (event.clientX ?? 0) - rect.left - beadAxisInset - renderedGridOffset.x - frameInset;
      const relativeY =
        (event.clientY ?? 0) - rect.top - beadAxisInset - renderedGridOffset.y - frameInset;

      if (
        relativeX < 0 ||
        relativeY < 0 ||
        relativeX > innerGridWidth ||
        relativeY > innerGridHeight
      ) {
        return null;
      }

      const x = clampCellIndex(Math.floor(relativeX / cellStride), grid.width);
      const y = clampCellIndex(Math.floor(relativeY / cellStride), grid.height);
      const offsetX = relativeX - x * cellStride;
      const offsetY = relativeY - y * cellStride;

      return {
        x,
        y,
        ...(size % 2 === 0
          ? {
              alignX: offsetX < displayCellSize / 2 ? 'before' : 'after',
              alignY: offsetY < displayCellSize / 2 ? 'before' : 'after',
            }
          : {}),
      };
    },
    [
      beadAxisInset,
      cellStride,
      displayCellSize,
      frameInset,
      grid.height,
      grid.width,
      innerGridHeight,
      innerGridWidth,
      renderedGridOffset.x,
      renderedGridOffset.y,
    ],
  );
  const appendBrushPoint = useCallback(
    (nextPoint: BrushPoint) => {
      if (!paintStateRef.current) {
        return;
      }

      const previousPoint = paintStateRef.current.lastPoint;
      const interpolatedPoints = buildLinePoints(
        previousPoint.x,
        previousPoint.y,
        nextPoint.x,
        nextPoint.y,
      );
      const nextPoints: BrushPoint[] = [];

      for (let index = 0; index < interpolatedPoints.length; index += 1) {
        const point = interpolatedPoints[index];
        const candidate =
          index === interpolatedPoints.length - 1
            ? nextPoint
            : { x: point.x, y: point.y };
        const pointKey = `${candidate.x}-${candidate.y}`;

        if (paintStateRef.current.visited.has(pointKey)) {
          continue;
        }

        paintStateRef.current.visited.add(pointKey);
        nextPoints.push(candidate);
      }

      paintStateRef.current.lastPoint = nextPoint;

      if (nextPoints.length === 0) {
        return;
      }

      paintStateRef.current.points = [...paintStateRef.current.points, ...nextPoints];
      setPaintPreview({
        points: paintStateRef.current.points,
        size: paintStateRef.current.mode === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize,
        color: paintStateRef.current.color,
      });
    },
    [toolSettings.eraseSize, toolSettings.paintSize],
  );
  const displayedSelectionBounds = useMemo(() => {
    if (!selectionBounds) {
      return null;
    }

    return {
      ...selectionBounds,
      minX: selectionBounds.minX + (selectionPreviewOffset?.x ?? 0),
      minY: selectionBounds.minY + (selectionPreviewOffset?.y ?? 0),
      maxX: selectionBounds.maxX + (selectionPreviewOffset?.x ?? 0),
      maxY: selectionBounds.maxY + (selectionPreviewOffset?.y ?? 0),
      width: selectionPreviewSize?.width ?? selectionBounds.width,
      height: selectionPreviewSize?.height ?? selectionBounds.height,
    };
  }, [selectionBounds, selectionPreviewOffset, selectionPreviewSize]);
  const selectionFrame = useMemo(() => {
    if (!displayedSelectionBounds) {
      return null;
    }

    return {
      left:
        beadAxisInset +
        renderedGridOffset.x +
        frameInset +
        displayedSelectionBounds.minX * cellStride,
      top:
        beadAxisInset +
        renderedGridOffset.y +
        frameInset +
        displayedSelectionBounds.minY * cellStride,
      width:
        displayedSelectionBounds.width * displayCellSize +
        Math.max(0, displayedSelectionBounds.width - 1) * lineWidth,
      height:
        displayedSelectionBounds.height * displayCellSize +
        Math.max(0, displayedSelectionBounds.height - 1) * lineWidth,
    };
  }, [
    cellStride,
    displayCellSize,
    displayedSelectionBounds,
    frameInset,
    lineWidth,
    beadAxisInset,
    renderedGridOffset.x,
    renderedGridOffset.y,
  ]);
  const beadColumnNumbers = useMemo(
    () =>
      scenario === 'beads'
        ? Array.from({ length: grid.width }, (_, index) => index + 1)
        : [],
    [grid.width, scenario],
  );
  const beadRowNumbers = useMemo(
    () =>
      scenario === 'beads'
        ? Array.from({ length: grid.height }, (_, index) => index + 1)
        : [],
    [grid.height, scenario],
  );
  const beadColumnLabelStep = useMemo(
    () => (scenario === 'beads' ? getAxisLabelStep(grid.width, cellStride) : 1),
    [cellStride, grid.width, scenario],
  );
  const beadRowLabelStep = useMemo(
    () => (scenario === 'beads' ? getAxisLabelStep(grid.height, cellStride) : 1),
    [cellStride, grid.height, scenario],
  );
  const beadAxisOriginX = beadAxisInset + renderedGridOffset.x + frameInset;
  const beadAxisOriginY = beadAxisInset + renderedGridOffset.y + frameInset;
  const topAxisLeadSize = Math.max(0, beadAxisOriginX - beadAxisInset);
  const leftAxisLeadSize = Math.max(0, beadAxisOriginY - beadAxisInset);
  const topAxisTailStart = beadAxisOriginX + grid.width * cellStride;
  const leftAxisTailStart = beadAxisOriginY + grid.height * cellStride;
  const topAxisTailSize = Math.max(0, viewportMetrics.width - topAxisTailStart);
  const leftAxisTailSize = Math.max(0, viewportMetrics.height - leftAxisTailStart);
  const gridStyle: CSSProperties & {
    '--pixel-cell-size': string;
    '--pixel-grid-line-width': string;
    '--pixel-grid-frame-inset': string;
  } = {
    '--pixel-cell-size': `${displayCellSize}px`,
    '--pixel-grid-line-width': `${lineWidth}px`,
    '--pixel-grid-frame-inset': `${frameInset}px`,
    gridTemplateColumns: `repeat(${grid.width}, ${displayCellSize}px)`,
    gridTemplateRows: `repeat(${grid.height}, ${displayCellSize}px)`,
    width: `${innerGridWidth}px`,
    minWidth: `${innerGridWidth}px`,
    height: `${innerGridHeight}px`,
  };
  const frameStyle: CSSProperties = {
    top: `${beadAxisInset + renderedGridOffset.y}px`,
    left: `${beadAxisInset + renderedGridOffset.x}px`,
    width: `${scaledGridWidth}px`,
    minWidth: `${scaledGridWidth}px`,
    height: `${scaledGridHeight}px`,
  };

  useEffect(() => {
    setPanOffset((current) => getConstrainedPanOffset(current));
  }, [getConstrainedPanOffset]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const reportViewportSize = () => {
      const nextMetrics = readViewportMetrics(viewport);
      setViewportMetrics((current) =>
        current.width === nextMetrics.width && current.height === nextMetrics.height
          ? current
          : nextMetrics,
      );
      onViewportSizeChange?.(nextMetrics);
    };

    reportViewportSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', reportViewportSize);

      return () => {
        window.removeEventListener('resize', reportViewportSize);
      };
    }

    const observer = new ResizeObserver(reportViewportSize);
    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, [onViewportSizeChange]);

  return (
    <section
      ref={viewportRef}
      className={`pixel-grid-viewport${tool === 'move' ? ' is-move-mode' : ''}`}
      aria-label="像素输出面板"
      data-active-tool={tool}
      style={{ cursor: toolCursor }}
      onPointerDownCapture={(event) => {
        if (tool !== 'move' || !viewportRef.current) {
          return;
        }

        event.preventDefault();
        dragStateRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX ?? 0,
          startY: event.clientY ?? 0,
          offsetX: panOffset.x,
          offsetY: panOffset.y,
        };
        viewportRef.current.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (
          (tool === 'paint' || tool === 'erase') &&
          paintStateRef.current &&
          paintStateRef.current.pointerId === event.pointerId
        ) {
          const brushSize =
            tool === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize;
          const brushPoint = readBrushPointFromViewportEvent(event, brushSize);

          if (brushPoint) {
            appendBrushPoint(brushPoint);
            setHoverCell(brushPoint);
          }

          return;
        }

        if (
          tool === 'select' &&
          selectionStateRef.current &&
          selectionStateRef.current.pointerId === event.pointerId
        ) {
          if (selectionStateRef.current.mode === 'marquee') {
            return;
          }

          const targetCell = readPointerCellTarget(event.target);
          const deltaX = targetCell
            ? targetCell.x - selectionStateRef.current.bounds.minX
            : Math.round(
                ((event.clientX ?? selectionStateRef.current.startX) -
                  selectionStateRef.current.startX) /
                  displayCellSize,
              );
          const deltaY = targetCell
            ? targetCell.y - selectionStateRef.current.bounds.minY
            : Math.round(
                ((event.clientY ?? selectionStateRef.current.startY) -
                  selectionStateRef.current.startY) /
                  displayCellSize,
              );

          if (selectionStateRef.current.mode === 'move') {
            const nextOffsetX = Math.max(
              -selectionStateRef.current.bounds.minX,
              Math.min(grid.width - 1 - selectionStateRef.current.bounds.maxX, deltaX),
            );
            const nextOffsetY = Math.max(
              -selectionStateRef.current.bounds.minY,
              Math.min(grid.height - 1 - selectionStateRef.current.bounds.maxY, deltaY),
            );

            setSelectionPreviewOffset({ x: nextOffsetX, y: nextOffsetY });
            onPreviewMoveSelection?.(nextOffsetX, nextOffsetY);
            return;
          }

          const nextWidth = Math.max(
            1,
            Math.min(
              grid.width - selectionStateRef.current.bounds.minX,
              selectionStateRef.current.width + deltaX,
            ),
          );
          const nextHeight = Math.max(
            1,
            Math.min(
              grid.height - selectionStateRef.current.bounds.minY,
              selectionStateRef.current.height + deltaY,
            ),
          );
          setSelectionPreviewSize({ width: nextWidth, height: nextHeight });
          onPreviewScaleSelection?.(nextWidth, nextHeight);
          return;
        }

        if (
          tool !== 'move' ||
          !viewportRef.current ||
          !dragStateRef.current ||
          dragStateRef.current.pointerId !== event.pointerId
        ) {
          return;
        }

        const deltaX =
          (event.clientX ?? dragStateRef.current.startX) - dragStateRef.current.startX;
        const deltaY =
          (event.clientY ?? dragStateRef.current.startY) - dragStateRef.current.startY;
        setPanOffset(
          getConstrainedPanOffset({
            x: dragStateRef.current.offsetX + deltaX,
            y: dragStateRef.current.offsetY + deltaY,
          }),
        );
      }}
      onPointerUp={(event) => {
        if (
          tool === 'select' &&
          viewportRef.current &&
          selectionStateRef.current &&
          selectionStateRef.current.pointerId === event.pointerId
        ) {
          viewportRef.current.releasePointerCapture?.(event.pointerId);

          if (selectionStateRef.current.mode === 'move') {
            const targetCell = readPointerCellTarget(event.target);
            const offsetX = Math.max(
              -selectionStateRef.current.bounds.minX,
              Math.min(
                grid.width - 1 - selectionStateRef.current.bounds.maxX,
                targetCell
                  ? targetCell.x - selectionStateRef.current.bounds.minX
                  : Math.round(
                      ((event.clientX ?? selectionStateRef.current.startX) -
                        selectionStateRef.current.startX) /
                        displayCellSize,
                    ),
              ),
            );
            const offsetY = Math.max(
              -selectionStateRef.current.bounds.minY,
              Math.min(
                grid.height - 1 - selectionStateRef.current.bounds.maxY,
                targetCell
                  ? targetCell.y - selectionStateRef.current.bounds.minY
                  : Math.round(
                      ((event.clientY ?? selectionStateRef.current.startY) -
                        selectionStateRef.current.startY) /
                        displayCellSize,
                    ),
              ),
            );

            onCommitMoveSelection?.(offsetX, offsetY);
          } else if (selectionStateRef.current.mode === 'scale') {
            onCommitScaleSelection?.(
              selectionPreviewSize?.width ?? selectionStateRef.current.width,
              selectionPreviewSize?.height ?? selectionStateRef.current.height,
            );
          }

          selectionStateRef.current = null;
          setSelectionPreviewSize(null);
          setSelectionPreviewOffset(null);
          return;
        }

        if (
          tool === 'move' &&
          viewportRef.current &&
          dragStateRef.current &&
          dragStateRef.current.pointerId === event.pointerId
        ) {
          viewportRef.current.releasePointerCapture?.(event.pointerId);
          dragStateRef.current = null;
        }

        if (
          paintStateRef.current &&
          paintStateRef.current.pointerId === event.pointerId
        ) {
          viewportRef.current?.releasePointerCapture?.(event.pointerId);
          commitStroke(paintStateRef.current.points, paintStateRef.current.color);
          paintStateRef.current = null;
          setPaintPreview(null);
          suppressClickPaintRef.current = true;
        }

        if (
          shapeStateRef.current &&
          shapeStateRef.current.pointerId === event.pointerId
        ) {
          finalizeShape();
          shapeStateRef.current = null;
        }
      }}
      onPointerLeave={() => {
        if (tool === 'move') {
          return;
        }

        setHoverCell(null);

        if (!shapeStateRef.current) {
          setInteractionPreview(null);
        }
      }}
      onWheel={(event) => {
        if (Math.abs(event.deltaX) < 0.01 && Math.abs(event.deltaY) < 0.01) {
          return;
        }

        event.preventDefault();
        setPanOffset((current) =>
          getConstrainedPanOffset({
            x: current.x - event.deltaX,
            y: current.y - event.deltaY,
          }),
        );
      }}
    >
      {interactionPreview ? (
        <div className="pixel-grid-preview" aria-label={interactionPreview.label}>
          {interactionPreview.label}
        </div>
      ) : null}
      {tool === 'select' && selectionFrame ? (
        <div
          className="pixel-grid-selection"
          style={{
            left: `${selectionFrame.left}px`,
            top: `${selectionFrame.top}px`,
            width: `${selectionFrame.width}px`,
            height: `${selectionFrame.height}px`,
          }}
        >
          <button
            type="button"
            className="pixel-grid-selection__body"
            aria-label="移动选区"
            onPointerDown={(event) => {
              if (!selectionBounds) {
                return;
              }

              event.stopPropagation();
              selectionStateRef.current = {
                pointerId: event.pointerId,
                mode: 'move',
                startX: event.clientX ?? 0,
                startY: event.clientY ?? 0,
                bounds: selectionBounds,
                width: displayedSelectionBounds?.width ?? selectionBounds.width,
                height: displayedSelectionBounds?.height ?? selectionBounds.height,
              };
              viewportRef.current?.setPointerCapture?.(event.pointerId);
            }}
          />
          <button
            type="button"
            className="pixel-grid-selection__handle"
            aria-label="缩放选区"
            onPointerDown={(event) => {
              if (!selectionBounds) {
                return;
              }

              event.stopPropagation();
              selectionStateRef.current = {
                pointerId: event.pointerId,
                mode: 'scale',
                startX: event.clientX ?? 0,
                startY: event.clientY ?? 0,
                bounds: selectionBounds,
                width: displayedSelectionBounds?.width ?? selectionBounds.width,
                height: displayedSelectionBounds?.height ?? selectionBounds.height,
              };
              viewportRef.current?.setPointerCapture?.(event.pointerId);
            }}
          />
        </div>
      ) : null}
      {scenario === 'beads' ? (
        <div className="bead-axis-layer" aria-hidden="true">
          <span
            className="bead-axis-corner"
            style={{
              width: `${beadAxisInset}px`,
              height: `${beadAxisInset}px`,
            }}
          />
          <span
            className="bead-axis-track bead-axis-track--top"
            style={{
              left: `${beadAxisInset}px`,
              top: '0',
              height: `${BEAD_AXIS_LABEL_SIZE}px`,
            } as CSSProperties}
          />
          <span
            className="bead-axis-track bead-axis-track--left"
            style={{
              left: '0',
              top: `${beadAxisInset}px`,
              width: `${BEAD_AXIS_LABEL_SIZE}px`,
            } as CSSProperties}
          />
          {topAxisLeadSize > 0 ? (
            <span
              className="bead-axis-fill bead-axis-fill--top bead-axis-fill--top-lead"
              style={{
                left: `${beadAxisInset}px`,
                top: '0',
                width: `${topAxisLeadSize}px`,
                height: `${BEAD_AXIS_LABEL_SIZE}px`,
              }}
            />
          ) : null}
          {leftAxisLeadSize > 0 ? (
            <span
              className="bead-axis-fill bead-axis-fill--left bead-axis-fill--left-lead"
              style={{
                left: '0',
                top: `${beadAxisInset}px`,
                width: `${BEAD_AXIS_LABEL_SIZE}px`,
                height: `${leftAxisLeadSize}px`,
              }}
            />
          ) : null}
          {topAxisTailSize > 0 ? (
            <span
              className="bead-axis-fill bead-axis-fill--top bead-axis-fill--top-tail"
              style={{
                left: `${topAxisTailStart}px`,
                top: '0',
                width: `${topAxisTailSize}px`,
                height: `${BEAD_AXIS_LABEL_SIZE}px`,
              }}
            />
          ) : null}
          {leftAxisTailSize > 0 ? (
            <span
              className="bead-axis-fill bead-axis-fill--left bead-axis-fill--left-tail"
              style={{
                left: '0',
                top: `${leftAxisTailStart}px`,
                width: `${BEAD_AXIS_LABEL_SIZE}px`,
                height: `${leftAxisTailSize}px`,
              }}
            />
          ) : null}
          {beadColumnNumbers.map((value, index) => {
            if (!shouldRenderAxisLabel(value, grid.width, beadColumnLabelStep)) {
              return null;
            }

            const span = getAxisLabelSpan(value, beadColumnLabelStep);
            const axisX = beadAxisOriginX + (value - span) * cellStride;

            return (
              <span
                key={`top-${value}`}
                className="bead-axis-label bead-axis-label--column bead-axis-label--top"
                style={{
                  left: `${axisX}px`,
                  top: '0',
                  width: `${span * cellStride}px`,
                  height: `${BEAD_AXIS_LABEL_SIZE}px`,
                }}
              >
                {value}
              </span>
            );
          })}
          {beadRowNumbers.map((value, index) => {
            if (!shouldRenderAxisLabel(value, grid.height, beadRowLabelStep)) {
              return null;
            }

            const span = getAxisLabelSpan(value, beadRowLabelStep);
            const axisY = beadAxisOriginY + (value - span) * cellStride;

            return (
              <span
                key={`left-${value}`}
                className="bead-axis-label bead-axis-label--row bead-axis-label--left"
                style={{
                  left: '0',
                  top: `${axisY}px`,
                  width: `${BEAD_AXIS_LABEL_SIZE}px`,
                  height: `${span * cellStride}px`,
                }}
              >
                {value}
              </span>
            );
          })}
        </div>
      ) : null}
      <div
        className={`pixel-grid-shell${scenario === 'beads' ? ' pixel-grid-shell--beads' : ''}`}
      >
        <div
          className={`pixel-grid-frame${showGrid ? '' : ' pixel-grid-frame--flat'}${
          hideTransparencyTexture ? ' pixel-grid--hide-transparency-texture' : ''
        }`}
        style={frameStyle}
      >
        <div
          role="grid"
          aria-label="像素输出网格"
          className={`pixel-grid${showGrid ? '' : ' pixel-grid--flat'}${
            scenario === 'beads' ? ' pixel-grid--beads' : ''
          }`}
          style={gridStyle}
        >
          {grid.cells.map((cell) => (
            <button
              key={`${cell.x}-${cell.y}`}
              type="button"
              role="gridcell"
              className={`pixel-cell${cell.color ? '' : ' pixel-cell--transparent'}${editable ? ' pixel-cell--editable' : ''}${showGrid ? '' : ' pixel-cell--flat'}${presentation === 'symbol' ? ' pixel-cell--symbol' : ''}${
                scenario === 'beads' ? ' pixel-cell--beads' : ''
              }`}
              aria-label={`像素 ${cell.x},${cell.y} ${cell.color ?? '透明'}${
                presentation === 'symbol' && cell.color
                  ? ` 符号 ${getCellOverlay?.(cell) ?? '?'}`
                  : ''
              }`}
              data-active-tool={tool}
              data-cell-x={cell.x}
              data-cell-y={cell.y}
              data-bead-col={cell.x}
              data-bead-row={cell.y}
              style={{
                ...(presentation === 'color' && cell.color
                  ? { backgroundColor: cell.color }
                  : undefined),
                width: '100%',
                height: '100%',
                cursor: toolCursor,
              }}
              onPointerDown={(event) => {
                if (!editable || tool === 'move') {
                  return;
                }

                const brushPoint = readBrushPointFromEvent(
                  event,
                  { x: cell.x, y: cell.y },
                  tool === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize,
                );
                setHoverCell(brushPoint);

                if (tool === 'sample') {
                  onSampleCell?.(cell.color);
                  return;
                }

                if (tool === 'select') {
                  selectionStateRef.current = {
                    pointerId: event.pointerId,
                    mode: 'marquee',
                    startX: cell.x,
                    startY: cell.y,
                    bounds: {
                      minX: cell.x,
                      minY: cell.y,
                      maxX: cell.x,
                      maxY: cell.y,
                      width: 1,
                      height: 1,
                    },
                    width: 1,
                    height: 1,
                  };
                  onSelectionChange?.({
                    minX: cell.x,
                    minY: cell.y,
                    maxX: cell.x,
                    maxY: cell.y,
                    width: 1,
                    height: 1,
                  });
                  return;
                }

                if (tool === 'fill') {
                  onFillArea?.(cell.x, cell.y, activeColor ?? null);
                  return;
                }

                if (tool === 'line' || tool === 'rectangle') {
                  shapeStateRef.current = {
                    pointerId: event.pointerId,
                    startX: cell.x,
                    startY: cell.y,
                    endX: cell.x,
                    endY: cell.y,
                    tool,
                  };
                  setInteractionPreview({
                    cells:
                      tool === 'line'
                        ? buildLinePoints(cell.x, cell.y, cell.x, cell.y)
                        : buildRectanglePoints(cell.x, cell.y, cell.x, cell.y),
                    label: `预览${tool === 'line' ? '线条' : '矩形'} ${cell.x},${cell.y} 到 ${cell.x},${cell.y}`,
                  });
                  return;
                }

                const nextColor = tool === 'erase' ? null : activeColor ?? null;
                const pointKey = `${cell.x}-${cell.y}`;

                paintStateRef.current = {
                  pointerId: event.pointerId,
                  color: nextColor,
                  mode: tool === 'erase' ? 'erase' : 'paint',
                  points: [brushPoint],
                  visited: new Set([pointKey]),
                  lastPoint: brushPoint,
                };
                setPaintPreview({
                  points: [brushPoint],
                  size: tool === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize,
                  color: nextColor,
                });
                viewportRef.current?.setPointerCapture?.(event.pointerId);
              }}
              onPointerEnter={(event) => {
                const brushPoint = readBrushPointFromEvent(
                  event,
                  { x: cell.x, y: cell.y },
                  tool === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize,
                );
                setHoverCell(brushPoint);

                if (
                  !editable ||
                  tool === 'move' ||
                  tool === 'sample' ||
                  tool === 'fill'
                ) {
                  return;
                }

                if (
                  tool === 'select' &&
                  selectionStateRef.current &&
                  selectionStateRef.current.pointerId === event.pointerId &&
                  selectionStateRef.current.mode === 'marquee'
                ) {
                  const minX = Math.min(selectionStateRef.current.startX, cell.x);
                  const minY = Math.min(selectionStateRef.current.startY, cell.y);
                  const maxX = Math.max(selectionStateRef.current.startX, cell.x);
                  const maxY = Math.max(selectionStateRef.current.startY, cell.y);

                  onSelectionChange?.({
                    minX,
                    minY,
                    maxX,
                    maxY,
                    width: maxX - minX + 1,
                    height: maxY - minY + 1,
                  });
                  return;
                }

                if (
                  (tool === 'line' || tool === 'rectangle') &&
                  shapeStateRef.current &&
                  shapeStateRef.current.pointerId === event.pointerId
                ) {
                  const previewCells =
                    tool === 'line'
                      ? buildLinePoints(
                          shapeStateRef.current.startX,
                          shapeStateRef.current.startY,
                          cell.x,
                          cell.y,
                        )
                      : buildRectanglePoints(
                          shapeStateRef.current.startX,
                          shapeStateRef.current.startY,
                          cell.x,
                          cell.y,
                        );

                  shapeStateRef.current = {
                    ...shapeStateRef.current,
                    endX: cell.x,
                    endY: cell.y,
                  };
                  setInteractionPreview({
                    cells: previewCells,
                    label: `预览${tool === 'line' ? '线条' : '矩形'} ${shapeStateRef.current.startX},${shapeStateRef.current.startY} 到 ${cell.x},${cell.y}`,
                  });
                  return;
                }

                if (
                  !paintStateRef.current ||
                  paintStateRef.current.pointerId !== event.pointerId
                ) {
                  return;
                }

                appendBrushPoint(brushPoint);
              }}
              onPointerLeave={() => {
                if (!shapeStateRef.current) {
                  setInteractionPreview(null);
                }
              }}
              onClick={(event) => {
                if (
                  !editable ||
                  tool === 'move' ||
                  tool === 'select' ||
                  tool === 'sample' ||
                  tool === 'fill' ||
                  tool === 'line' ||
                  tool === 'rectangle'
                ) {
                  return;
                }

                if (paintStateRef.current) {
                  return;
                }

                if (suppressClickPaintRef.current) {
                  suppressClickPaintRef.current = false;
                  return;
                }

                commitStroke(
                  [
                    readBrushPointFromEvent(
                      event,
                      { x: cell.x, y: cell.y },
                      tool === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize,
                    ),
                  ],
                  tool === 'erase' ? null : activeColor ?? null,
                );
              }}
            >
              {presentation === 'symbol' && cell.color ? (
                <span className="pixel-cell__overlay">{getCellOverlay?.(cell) ?? '?'}</span>
              ) : null}
              {previewLookup.has(`${cell.x}-${cell.y}`) ? (
                <span
                  className={`pixel-cell__preview${
                    paintPreview?.color ? '' : ' pixel-cell__preview--transparent'
                  }`}
                  aria-hidden="true"
                  style={paintPreview?.color ? { backgroundColor: paintPreview.color } : undefined}
                />
              ) : null}
            </button>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
}
