import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PixelGrid as PixelGridModel } from '../types/pixel';
import type { EditorTool, EditorToolSettings } from '../types/studio';
import {
  buildBrushFootprint,
  buildLinePoints,
  buildRectanglePoints,
} from '../utils/studio';
import { getCursorForTool } from '../utils/toolCursors';

type PixelGridProps = {
  grid: PixelGridModel;
  editable?: boolean;
  activeColor?: string;
  tool?: EditorTool;
  toolSettings: EditorToolSettings;
  onPaintCell?: (x: number, y: number, color: string | null) => void;
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
  zoom?: number;
  showGrid?: boolean;
  presentation?: 'color' | 'symbol';
  getCellOverlay?: (cell: PixelGridModel['cells'][number]) => string | undefined;
};

export function getBaseCellSize(width: number) {
  return width === 16 ? 42 : width === 32 ? 24 : 12;
}

export default function PixelGrid({
  grid,
  editable = false,
  activeColor,
  tool = 'paint',
  toolSettings,
  onPaintCell,
  onFillArea,
  onDrawLine,
  onDrawRectangle,
  onSampleCell,
  zoom = 1,
  showGrid = true,
  presentation = 'color',
  getCellOverlay,
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
  } | null>(null);
  const shapeStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    tool: 'line' | 'rectangle';
  } | null>(null);
  const [interactionPreview, setInteractionPreview] = useState<{
    cells: Array<{ x: number; y: number }>;
    label: string;
  } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  function paintCell(x: number, y: number, color: string | null) {
    onPaintCell?.(x, y, color);
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
        paintStateRef.current = null;
      }

      if (
        shapeStateRef.current &&
        shapeStateRef.current.pointerId === event.pointerId
      ) {
        finalizeShape();
        shapeStateRef.current = null;
      }
    }

    window.addEventListener('pointerup', handleGlobalPointerEnd);
    window.addEventListener('pointercancel', handleGlobalPointerEnd);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerEnd);
      window.removeEventListener('pointercancel', handleGlobalPointerEnd);
    };
  }, [finalizeShape]);

  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [grid.width, grid.height, zoom]);

  const baseCellSize = getBaseCellSize(grid.width);
  const scaledCellSize = baseCellSize * zoom;
  const scaledGridWidth = grid.width * scaledCellSize;
  const scaledGridHeight = grid.height * scaledCellSize;
  const hideTransparencyTexture = scaledCellSize < 6;
  const clampPanOffset = useCallback(
    (nextOffset: { x: number; y: number }) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return nextOffset;
      }

      const computedStyle = window.getComputedStyle(viewport);
      const horizontalPadding =
        (Number.parseFloat(computedStyle.paddingLeft) || 0) +
        (Number.parseFloat(computedStyle.paddingRight) || 0);
      const verticalPadding =
        (Number.parseFloat(computedStyle.paddingTop) || 0) +
        (Number.parseFloat(computedStyle.paddingBottom) || 0);
      const availableWidth = Math.max(0, viewport.clientWidth - horizontalPadding);
      const availableHeight = Math.max(0, viewport.clientHeight - verticalPadding);
      const canPan =
        scaledGridWidth > availableWidth || scaledGridHeight > availableHeight;

      if (!canPan) {
        return { x: 0, y: 0 };
      }

      return nextOffset;
    },
    [scaledGridHeight, scaledGridWidth],
  );

  useEffect(() => {
    setPanOffset((current) => clampPanOffset(current));
  }, [clampPanOffset]);

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
          clampPanOffset({
            x: dragStateRef.current.offsetX + deltaX,
            y: dragStateRef.current.offsetY + deltaY,
          }),
        );
      }}
      onPointerUp={(event) => {
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
          paintStateRef.current = null;
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
          clampPanOffset({
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
      <div
        role="grid"
        aria-label="像素输出网格"
        className={`pixel-grid${showGrid ? '' : ' pixel-grid--flat'}${
          hideTransparencyTexture ? ' pixel-grid--hide-transparency-texture' : ''
        }`}
        style={{
          gridTemplateColumns: `repeat(${grid.width}, ${scaledCellSize}px)`,
          gridTemplateRows: `repeat(${grid.height}, ${scaledCellSize}px)`,
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px))`,
          width: `${scaledGridWidth}px`,
          minWidth: `${scaledGridWidth}px`,
          height: `${scaledGridHeight}px`,
        }}
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
              style={{
                ...(presentation === 'color' && cell.color
                  ? { backgroundColor: cell.color }
                  : undefined),
                width: `${scaledCellSize}px`,
                height: `${scaledCellSize}px`,
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

                paintStateRef.current = {
                  pointerId: event.pointerId,
                  color: nextColor,
                  mode: tool === 'erase' ? 'erase' : 'paint',
                };
                paintCell(cell.x, cell.y, nextColor);
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

                paintCell(cell.x, cell.y, paintStateRef.current.color);
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

                paintCell(cell.x, cell.y, tool === 'erase' ? null : activeColor ?? null);
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
    </section>
  );
}
