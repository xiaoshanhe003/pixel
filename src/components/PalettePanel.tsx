type PalettePanelProps = {
  palette: string[];
  counts: Map<string, number>;
};

export default function PalettePanel({ palette, counts }: PalettePanelProps) {
  return (
    <section className="panel panel--sidebar">
      <div className="panel__header panel__header--stack">
        <h2>Active Palette</h2>
        <span>{palette.length} colors in play</span>
      </div>

      <div className="swatches">
        {palette.map((color) => (
          <div key={color} className="swatch">
            <span
              className="swatch-chip"
              aria-hidden="true"
              style={{ backgroundColor: color }}
            />
            <code>{color}</code>
            <span>{counts.get(color) ?? 0} cells</span>
          </div>
        ))}
      </div>
    </section>
  );
}
