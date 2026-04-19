type PalettePanelProps = {
  palette: string[];
  counts: Map<string, number>;
  transparentCount: number;
};

export default function PalettePanel({
  palette,
  counts,
  transparentCount: _transparentCount,
}: PalettePanelProps) {
  if (palette.length === 0) {
    return null;
  }

  return (
    <section className="panel panel--sidebar">
      <div className="panel__header panel__header--stack panel__header--align-left">
        <h2>当前调色板</h2>
        <span>{palette.length} 色</span>
      </div>

      <div className="swatches">
        {palette.map((color) => (
          <div key={color} className="swatch">
            <span
              className="swatch-chip"
              aria-hidden="true"
              style={{ backgroundColor: color }}
            />
            <div className="swatch__meta">
              <code>{color}</code>
              <span className="swatch__count">{counts.get(color) ?? 0} 格</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
