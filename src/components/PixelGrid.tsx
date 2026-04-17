import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PixelGrid as PixelGridModel } from '../types/pixel';
import type { EditorSelection, EditorTool, EditorToolSettings } from '../types/studio';
import {
  buildBrushFootprint,
  buildLinePoints,
  buildRectanglePoints,
} from '../utils/studio';
import type { LayerContentBounds } from '../utils/studio';
import { getCursorForTool } from '../utils/toolCursors';

type PixelGridProps = {
  grid: PixelGridModel;
  editable?: boolean;
  activeColor?: string;
  tool?: EditorTool;
  toolSettings: EditorToolSettings;
  onPreviewPaintStroke?: (
    points: Array<{ x: number; y: number }>,
    color: string | null,
  ) => void;
  onCommitPaintStroke?: (
    points: Array<{ x: number; y: number }>,
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
    y: (viewport.height - contentHeight) / 2,
  };
}

function snapOffsetToDevicePixel(value: number, enabled: boolean) {
  return enabled ? Math.round(value) : value;
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

export default function PixelGrid({
  grid,
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
    points: Array<{ x: number; y: number }>;
    visited: Set<string>;
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
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
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

  function previewStroke(points: Array<{ x: number; y: number }>, color: string | null) {
    onPreviewPaintStroke?.(points, color);
  }

  function commitStroke(points: Array<{ x: number; y: number }>, color: string | null) {
    onCommitPaintStroke?.(points, color);
  }

  const toolCursor = getCursorForTool(tool);
  const hoverPreview =
    editable && hoverCell && (tool === 'paint' || tool === 'erase')
      ? {
          cells: buildBrushFootprint(
            hoverCell.x,
            hoverCell.y,
            tool === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize,
          ),
        }
      : null;
  const previewCells = interactionPreview?.cells ?? hoverPreview?.cells ?? [];
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
        commitStroke(paintStateRef.current.points, paintStateRef.current.color);
        paintStateRef.current = null;
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
    () => buildCenteredOffset(viewportMetrics, scaledGridWidth, scaledGridHeight),
    [scaledGridHeight, scaledGridWidth, viewportMetrics],
  );
  const getConstrainedPanOffset = useCallback(
    (nextOffset: { x: number; y: number }) => {
      if (viewportMetrics.width === 0 || viewportMetrics.height === 0) {
        return { x: 0, y: 0 };
      }

      const minOffsetX =
        scaledGridWidth > viewportMetrics.width
          ? viewportMetrics.width - scaledGridWidth
          : centeredOffset.x;
      const maxOffsetX = scaledGridWidth > viewportMetrics.width ? 0 : centeredOffset.x;
      const minOffsetY =
        scaledGridHeight > viewportMetrics.height
          ? viewportMetrics.height - scaledGridHeight
          : centeredOffset.y;
      const maxOffsetY = scaledGridHeight > viewportMetrics.height ? 0 : centeredOffset.y;

      return {
        x: Math.min(Math.max(nextOffset.x, minOffsetX - centeredOffset.x), maxOffsetX - centeredOffset.x),
        y: Math.min(Math.max(nextOffset.y, minOffsetY - centeredOffset.y), maxOffsetY - centeredOffset.y),
      };
    },
    [centeredOffset.x, centeredOffset.y, scaledGridHeight, scaledGridWidth, viewportMetrics.height, viewportMetrics.width],
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
      left: renderedGridOffset.x + frameInset + displayedSelectionBounds.minX * cellStride,
      top: renderedGridOffset.y + frameInset + displayedSelectionBounds.minY * cellStride,
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
    renderedGridOffset.x,
    renderedGridOffset.y,
  ]);
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
    top: '0',
    left: '0',
    transform: `translate(${renderedGridOffset.x}px, ${renderedGridOffset.y}px)`,
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
      onPointerDown={(event) => {
        if (tool !== 'move' || !viewportRef.current) {
          return;
        }

        dragStateRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          offsetX: panOffset.x,
          offsetY: panOffset.y,
        };
        viewportRef.current.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
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

        const deltaX = event.clientX - dragStateRef.current.startX;
        const deltaY = event.clientY - dragStateRef.current.startY;
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
          commitStroke(paintStateRef.current.points, paintStateRef.current.color);
          paintStateRef.current = null;
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
      <div
        className={`pixel-grid-frame${showGrid ? '' : ' pixel-grid-frame--flat'}${
          hideTransparencyTexture ? ' pixel-grid--hide-transparency-texture' : ''
        }`}
        style={frameStyle}
      >
        <div
          role="grid"
          aria-label="像素输出网格"
          className={`pixel-grid${showGrid ? '' : ' pixel-grid--flat'}`}
          style={gridStyle}
        >
          {grid.cells.map((cell) => (
            <button
              key={`${cell.x}-${cell.y}`}
              type="button"
              role="gridcell"
              className={`pixel-cell${cell.color ? '' : ' pixel-cell--transparent'}${editable ? ' pixel-cell--editable' : ''}${showGrid ? '' : ' pixel-cell--flat'}${presentation === 'symbol' ? ' pixel-cell--symbol' : ''}`}
              aria-label={`像素 ${cell.x},${cell.y} ${cell.color ?? '透明'}${
                presentation === 'symbol' && cell.color
                  ? ` 符号 ${getCellOverlay?.(cell) ?? '?'}`
                  : ''
              }`}
              data-active-tool={tool}
              data-cell-x={cell.x}
              data-cell-y={cell.y}
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

                setHoverCell({ x: cell.x, y: cell.y });

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
                  points: [{ x: cell.x, y: cell.y }],
                  visited: new Set([pointKey]),
                };
                previewStroke([{ x: cell.x, y: cell.y }], nextColor);
              }}
              onPointerEnter={(event) => {
                setHoverCell({ x: cell.x, y: cell.y });

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

                const pointKey = `${cell.x}-${cell.y}`;

                if (paintStateRef.current.visited.has(pointKey)) {
                  return;
                }

                paintStateRef.current.visited.add(pointKey);
                paintStateRef.current.points = [
                  ...paintStateRef.current.points,
                  { x: cell.x, y: cell.y },
                ];
                previewStroke(
                  paintStateRef.current.points,
                  paintStateRef.current.color,
                );
              }}
              onPointerLeave={() => {
                if (!shapeStateRef.current) {
                  setInteractionPreview(null);
                }
              }}
              onClick={() => {
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
                  [{ x: cell.x, y: cell.y }],
                  tool === 'erase' ? null : activeColor ?? null,
                );
              }}
            >
              {presentation === 'symbol' && cell.color ? (
                <span className="pixel-cell__overlay">{getCellOverlay?.(cell) ?? '?'}</span>
              ) : null}
              {previewLookup.has(`${cell.x}-${cell.y}`) ? (
                <span className="pixel-cell__preview" aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
