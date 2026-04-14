import type { PixelGrid as PixelGridModel } from '../types/pixel';

type PixelGridProps = {
  grid: PixelGridModel;
};

export default function PixelGrid({ grid }: PixelGridProps) {
  return (
    <section className="pixel-grid-card" aria-label="pixel output panel">
      <div className="panel__header panel__header--tight">
        <h2>Pixel Output</h2>
        <span>
          {grid.width} x {grid.height} editable matrix
        </span>
      </div>

      <div
        role="grid"
        aria-label="Pixel output grid"
        className="pixel-grid"
        style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }}
      >
        {grid.cells.map((cell) => (
          <button
            key={`${cell.x}-${cell.y}`}
            type="button"
            role="gridcell"
            className="pixel-cell"
            aria-label={`cell ${cell.x},${cell.y} ${cell.color}`}
            style={{ backgroundColor: cell.color }}
          />
        ))}
      </div>
    </section>
  );
}
