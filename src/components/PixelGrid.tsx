import { useRef } from 'react';
import type { PixelGrid as PixelGridModel } from '../types/pixel';
import type { EditorTool } from '../types/studio';
import { getCursorForTool } from '../utils/toolCursors';

type PixelGridProps = {
  grid: PixelGridModel;
  editable?: boolean;
  activeColor?: string;
  tool?: EditorTool;
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

export default function PixelGrid({
  grid,
  editable = false,
  activeColor,
  tool = 'paint',
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
    scrollLeft: number;
    scrollTop: number;
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

  function paintCell(x: number, y: number, color: string | null) {
    onPaintCell?.(x, y, color);
  }

  function finalizeShape() {
    if (!shapeStateRef.current) {
      return;
    }

    const { startX, startY, endX, endY, tool: shapeTool } = shapeStateRef.current;
    const nextColor = activeColor ?? null;

    if (shapeTool === 'line') {
      onDrawLine?.(startX, startY, endX, endY, nextColor);
      return;
    }

    onDrawRectangle?.(startX, startY, endX, endY, nextColor);
  }

  return (
    <section className="pixel-grid-card" aria-label="像素输出面板">
      <div
        ref={viewportRef}
        className={`pixel-grid-viewport${tool === 'move' ? ' is-move-mode' : ''}`}
        data-active-tool={tool}
        style={{ cursor: getCursorForTool(tool) }}
        onPointerDown={(event) => {
          if (tool !== 'move' || !viewportRef.current) {
            return;
          }

          dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            scrollLeft: viewportRef.current.scrollLeft,
            scrollTop: viewportRef.current.scrollTop,
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
          viewportRef.current.scrollLeft = dragStateRef.current.scrollLeft - deltaX;
          viewportRef.current.scrollTop = dragStateRef.current.scrollTop - deltaY;
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

          paintStateRef.current = null;
        }}
      >
        <div
          role="grid"
          aria-label="像素输出网格"
          className={`pixel-grid${showGrid ? '' : ' pixel-grid--flat'}`}
          style={{
            gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))`,
            transform: `scale(${zoom})`,
            width: `${grid.width * 24}px`,
            minWidth: `${grid.width * 24}px`,
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
              style={
                presentation === 'color' && cell.color
                  ? { backgroundColor: cell.color }
                  : undefined
              }
              onPointerDown={(event) => {
                if (!editable || tool === 'move') {
                  return;
                }

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
                  shapeStateRef.current = {
                    ...shapeStateRef.current,
                    endX: cell.x,
                    endY: cell.y,
                  };
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
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
