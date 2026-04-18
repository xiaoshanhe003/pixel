import PixelGrid from './PixelGrid';
import type { PixelGrid as PixelGridModel } from '../types/pixel';
import type { EditorSelection, EditorTool, EditorToolSettings } from '../types/studio';
import type { LayerContentBounds } from '../utils/studio';

type CrochetChartProps = {
  grid: PixelGridModel;
  viewMode: 'color' | 'symbol';
  symbolByColor: Map<string, string>;
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
  onSelectionChange?: (selection: EditorSelection | null) => void;
  onPreviewMoveSelection?: (offsetX: number, offsetY: number) => void;
  onCommitMoveSelection?: (offsetX: number, offsetY: number) => void;
  onPreviewScaleSelection?: (targetWidth: number, targetHeight: number) => void;
  onCommitScaleSelection?: (targetWidth: number, targetHeight: number) => void;
  onSampleCell?: (color: string | null) => void;
  zoom?: number;
  showGrid?: boolean;
  onViewportSizeChange?: (size: { width: number; height: number }) => void;
  selectionBounds?: LayerContentBounds | null;
};

export default function CrochetChart({
  grid,
  viewMode,
  symbolByColor,
  editable,
  activeColor,
  tool,
  toolSettings,
  onPreviewPaintStroke,
  onCommitPaintStroke,
  onFillArea,
  onDrawLine,
  onDrawRectangle,
  onSelectionChange,
  onPreviewMoveSelection,
  onCommitMoveSelection,
  onPreviewScaleSelection,
  onCommitScaleSelection,
  onSampleCell,
  zoom,
  showGrid,
  onViewportSizeChange,
  selectionBounds,
}: CrochetChartProps) {
  const columnNumbers = Array.from({ length: grid.width }, (_, index) => index + 1);
  const rowNumbers = Array.from({ length: grid.height }, (_, index) => grid.height - index);

  return (
    <div className="crochet-chart">
      <div className="crochet-chart__corner" aria-hidden="true" />
      <div
        className="crochet-chart__columns"
        style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }}
      >
        {columnNumbers.map((value) => (
          <span key={value} className="crochet-chart__index">
            {value}
          </span>
        ))}
      </div>
      <div className="crochet-chart__rows">
        {rowNumbers.map((value) => (
          <span key={value} className="crochet-chart__index">
            {value}
          </span>
        ))}
      </div>
      <PixelGrid
        grid={grid}
        editable={editable}
        activeColor={activeColor}
        tool={tool}
        toolSettings={toolSettings}
        onPreviewPaintStroke={onPreviewPaintStroke}
        onCommitPaintStroke={onCommitPaintStroke}
        onFillArea={onFillArea}
        onDrawLine={onDrawLine}
        onDrawRectangle={onDrawRectangle}
        onSelectionChange={onSelectionChange}
        onPreviewMoveSelection={onPreviewMoveSelection}
        onCommitMoveSelection={onCommitMoveSelection}
        onPreviewScaleSelection={onPreviewScaleSelection}
        onCommitScaleSelection={onCommitScaleSelection}
        onSampleCell={onSampleCell}
        zoom={zoom}
        showGrid={showGrid}
        onViewportSizeChange={onViewportSizeChange}
        selectionBounds={selectionBounds}
        presentation={viewMode === 'symbol' ? 'symbol' : 'color'}
        getCellOverlay={(cell) =>
          cell.color ? symbolByColor.get(cell.color) ?? '?' : undefined
        }
      />
    </div>
  );
}
