import type { ConversionOptions, PixelGrid } from '../types/pixel';

type InspectorPanelProps = {
  grid: PixelGrid;
  options: ConversionOptions;
};

export default function InspectorPanel({
  grid,
  options,
}: InspectorPanelProps) {
  return (
    <section className="panel panel--sidebar">
      <div className="panel__header panel__header--stack">
        <h2>Grid Inspector</h2>
        <span>Craft notes for the current draft</span>
      </div>

      <ul className="inspector-list">
        <li>Total cells: {grid.cells.length}</li>
        <li>Distinct colors: {grid.palette.length}</li>
        <li>
          Reduction mode: {options.gridSize} x {options.gridSize} /{' '}
          {options.paletteSize} colors
        </li>
        <li>
          Dithering: {options.dithering ? 'enabled' : 'off'} | Cleanup:{' '}
          {options.cleanupNoise ? 'enabled' : 'off'}
        </li>
      </ul>

      <p className="inspector-note">
        Treat this output as a base draft. Strong pixel art still comes from
        manual cleanup of edges, clusters, and focal points.
      </p>
    </section>
  );
}
