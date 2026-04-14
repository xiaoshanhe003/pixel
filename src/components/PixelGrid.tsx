import type { PixelGrid as PixelGridModel } from '../types/pixel';

type PixelGridProps = {
  grid: PixelGridModel;
};

export default function PixelGrid({ grid }: PixelGridProps) {
  return (
    <section className="pixel-grid-card" aria-label="像素输出面板">
      <div
        role="grid"
        aria-label="像素输出网格"
        className="pixel-grid"
        style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }}
      >
        {grid.cells.map((cell) => (
          <button
            key={`${cell.x}-${cell.y}`}
            type="button"
            role="gridcell"
            className={`pixel-cell${cell.color ? '' : ' pixel-cell--transparent'}`}
            aria-label={`像素 ${cell.x},${cell.y} ${cell.color ?? '透明'}`}
            style={cell.color ? { backgroundColor: cell.color } : undefined}
          />
        ))}
      </div>
    </section>
  );
}
