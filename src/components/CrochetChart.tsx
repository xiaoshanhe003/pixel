import PixelGrid from './PixelGrid';
import type { PixelGrid as PixelGridModel } from '../types/pixel';
import type { EditorTool } from '../types/studio';

type CrochetChartProps = {
  grid: PixelGridModel;
  viewMode: 'color' | 'symbol';
  symbolByColor: Map<string, string>;
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
};

export default function CrochetChart({
  grid,
  viewMode,
  symbolByColor,
  editable,
  activeColor,
  tool,
  onPaintCell,
  onFillArea,
  onDrawLine,
  onDrawRectangle,
  onSampleCell,
  zoom,
  showGrid,
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
        onPaintCell={onPaintCell}
        onFillArea={onFillArea}
        onDrawLine={onDrawLine}
        onDrawRectangle={onDrawRectangle}
        onSampleCell={onSampleCell}
        zoom={zoom}
        showGrid={showGrid}
        presentation={viewMode === 'symbol' ? 'symbol' : 'color'}
        getCellOverlay={(cell) =>
          cell.color ? symbolByColor.get(cell.color) ?? '?' : undefined
        }
      />
    </div>
  );
}
