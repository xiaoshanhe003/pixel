type PalettePanelProps = {
  palette: string[];
  counts: Map<string, number>;
  transparentCount: number;
};

export default function PalettePanel({
  palette,
  counts,
  transparentCount,
}: PalettePanelProps) {
  return (
    <section className="panel panel--sidebar">
      <div className="panel__header panel__header--stack">
        <h2>当前调色板</h2>
        <span>
          {palette.length} 色{transparentCount > 0 ? ' + 透明' : ''}
        </span>
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
            <span>{counts.get(color) ?? 0} 格</span>
          </div>
        ))}

        {transparentCount > 0 ? (
          <div className="swatch">
            <span className="swatch-chip swatch-chip--transparent" aria-hidden="true" />
            <code>透明</code>
            <span>{transparentCount} 格</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
