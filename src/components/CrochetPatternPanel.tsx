import type { CrochetPatternAnalysis } from '../utils/crochet';

type CrochetPatternPanelProps = {
  analysis: CrochetPatternAnalysis;
  title?: string | null;
  className?: string;
};

export default function CrochetPatternPanel({
  analysis,
  title = '钩织图纸',
  className,
}: CrochetPatternPanelProps) {
  return (
    <section className={className ?? 'panel panel--sidebar'}>
      {title ? (
        <div className="panel__header">
          <h2>{title}</h2>
        </div>
      ) : null}

      <div className="crochet-rows">
        {analysis.rows
          .filter((row) => row.stitchCount > 0)
          .map((row) => (
            <div key={row.rowNumber} className="crochet-row-card">
              <strong>{`R${row.rowNumber}（${row.stitchCount}针）`}</strong>
              {row.instructions.length > 0 ? (
                <span className="crochet-row-card__instructions">
                  {row.instructions.map((instruction, index) => (
                    <span key={`${row.rowNumber}-${instruction}-${index}`} className="crochet-row-card__instruction">
                      {instruction}
                      {index < row.instructions.length - 1 ? '，' : ''}
                    </span>
                  ))}
                </span>
              ) : (
                <span>空行</span>
              )}
            </div>
          ))}
      </div>
    </section>
  );
}
