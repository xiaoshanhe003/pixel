import type { CrochetPatternAnalysis } from '../utils/crochet';

type CrochetPatternPanelProps = {
  analysis: CrochetPatternAnalysis;
};

export default function CrochetPatternPanel({
  analysis,
}: CrochetPatternPanelProps) {
  return (
    <section className="panel panel--sidebar">
      <div className="panel__header panel__header--stack">
        <h2>钩织图纸</h2>
        <span>
          {analysis.totalStitches} 针 · {analysis.filledRowCount} 行
        </span>
      </div>

      <div className="swatches">
        {analysis.legend.map((item) => (
          <div key={item.color} className="swatch">
            <span
              className="swatch-chip"
              aria-hidden="true"
              style={{ backgroundColor: item.color }}
            />
            <span>符号 {item.symbol}</span>
            <code>{item.color}</code>
            <span>{item.count} 针</span>
          </div>
        ))}
      </div>

      <div className="crochet-rows">
        {analysis.rows
          .filter((row) => row.stitchCount > 0)
          .map((row) => (
            <div key={row.rowNumber} className="crochet-row-card">
              <strong>第 {row.rowNumber} 行</strong>
              <span>{row.stitchCount} 针</span>
              <span>
                {row.instructions.length > 0 ? row.instructions.join(' / ') : '空行'}
              </span>
            </div>
          ))}
      </div>
    </section>
  );
}
