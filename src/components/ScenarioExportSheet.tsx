import type { BeadBrand } from '../data/beadPalettes';
import type { PixelGrid } from '../types/pixel';
import type { BeadMappedColor } from '../utils/beads';
import type { CrochetPatternAnalysis } from '../utils/crochet';
import { getPerceivedLuminance, hexToRgb } from '../utils/color';
import { buildScenarioExportDocument } from '../utils/scenarioExport';

type ScenarioExportSheetProps = {
  scenario: 'beads' | 'crochet';
  grid: PixelGrid;
  beadBrand?: BeadBrand;
  beadUsage?: BeadMappedColor[];
  crochetAnalysis?: CrochetPatternAnalysis;
  exportMode: string;
  onExportModeChange: (mode: string) => void;
  onCleanupBeadNoise: () => void;
  className?: string;
  previewImageUrl?: string | null;
};

function renderPrintGrid(grid: PixelGrid, showSymbols = false, symbolByColor?: Map<string, string>) {
  return (
    <div
      className={`print-grid${showSymbols ? ' print-grid--symbols' : ''}`}
      style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }}
    >
      {grid.cells.map((cell) => (
        <span
          key={`${cell.x}-${cell.y}`}
          className={`print-grid__cell${cell.color ? '' : ' print-grid__cell--empty'}`}
          style={!showSymbols && cell.color ? { backgroundColor: cell.color } : undefined}
        >
          {showSymbols && cell.color ? symbolByColor?.get(cell.color) ?? '?' : null}
        </span>
      ))}
    </div>
  );
}

function renderBeadUsageRow(item: BeadMappedColor) {
  const textColor =
    getPerceivedLuminance(hexToRgb(item.hex)) < 140 ? '#ffffff' : '#1a1a1a';

  return (
    <div key={item.id} className="export-sheet__usage-tile">
      <div
        className="export-sheet__usage-swatch bead-library__swatch bead-library__swatch--tile"
        title={item.name.trim().toUpperCase() !== item.id.trim().toUpperCase() ? item.name : item.id}
        style={{
          backgroundColor: item.hex,
          color: textColor,
        }}
      >
        <span className="bead-library__swatch-code">{item.id}</span>
      </div>
      <span className="export-sheet__count">{item.count} 颗</span>
    </div>
  );
}

export default function ScenarioExportSheet({
  scenario,
  grid,
  beadBrand = 'mard',
  beadUsage = [],
  crochetAnalysis,
  exportMode,
  onExportModeChange,
  onCleanupBeadNoise,
  className,
  previewImageUrl,
}: ScenarioExportSheetProps) {
  const isBeads = scenario === 'beads';
  const exportDocument = buildScenarioExportDocument({
    scenario,
    grid,
    beadBrand,
    beadUsage,
    crochetAnalysis,
    exportMode,
  });
  const modes = [
    { id: 'crochet-chart', label: 'PDF 图纸' },
    { id: 'crochet-rows', label: '行列说明' },
  ];
  const hasBeadContent =
    exportDocument.kind === 'beads' && exportDocument.beadSummary.totalCount > 0;

  return (
    <div className={className ? `export-sheet ${className}` : 'export-sheet'}>
      {!isBeads ? (
        <div className="frame-strip__actions">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`chip-button${exportMode === mode.id ? ' is-active' : ''}`}
              onClick={() => onExportModeChange(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      ) : null}

      {!isBeads ? (
        <div className="export-sheet__header">
          <strong>{exportDocument.title}</strong>
          {exportDocument.subtitle ? <span>{exportDocument.subtitle}</span> : null}
        </div>
      ) : null}

      {exportDocument.kind === 'beads' ? (
        <>
          {previewImageUrl ? (
            <div className="export-sheet__preview-stage">
              <img
                className="export-sheet__preview-image"
                src={previewImageUrl}
                alt="拼豆图纸第一页预览"
              />
            </div>
          ) : (
            renderPrintGrid(exportDocument.grid)
          )}
          <div className="export-sheet__section">
            {hasBeadContent ? (
              <>
                <section className="export-sheet__summary" aria-label="豆子清单摘要">
                  <p className="export-sheet__summary-line">
                    所需豆子数量：{exportDocument.beadSummary.totalCount} 颗
                  </p>
                  <p className="export-sheet__summary-line">
                    所需最小的行和列：
                    {exportDocument.beadSummary.occupiedSize.rows} x{' '}
                    {exportDocument.beadSummary.occupiedSize.columns}
                  </p>
                  <p className="export-sheet__summary-line">色板：{exportDocument.beadBrandLabel}</p>
                </section>
                <div className="export-sheet__summary-actions">
                  <button
                    type="button"
                    className="chip-button"
                    onClick={onCleanupBeadNoise}
                  >
                    去除杂色
                  </button>
                </div>
              </>
            ) : null}
            <div className="export-sheet__groups">
              {exportDocument.beadUsageGroups.map((group) => (
                <section
                  key={group.id}
                  className="export-sheet__group"
                  aria-label={`${group.id} 系列颜色`}
                >
                  <div className="export-sheet__group-header">
                    <strong>{group.id}</strong>
                  </div>
                  <div className="export-sheet__usage-grid">
                    {group.items.map((item) => renderBeadUsageRow(item))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {exportDocument.kind === 'crochet-chart' ? (
        <>
          {renderPrintGrid(exportDocument.grid, true, exportDocument.symbolByColor)}
          <div className="export-sheet__legend">
            {exportDocument.legend.map((item) => (
              <div key={item.color} className="export-sheet__legend-item">
                <span
                  className="swatch-chip"
                  aria-hidden="true"
                  style={{ backgroundColor: item.color }}
                />
                <span>符号 {item.symbol}</span>
                <code>{item.color}</code>
                <strong>{item.count} 针</strong>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {exportDocument.kind === 'crochet-rows' ? (
        <div className="export-sheet__list">
          {exportDocument.rows.map((row) => (
            <div key={row.rowNumber} className="export-sheet__list-row">
              <strong>第 {row.rowNumber} 行</strong>
              <span>{row.instructions.join(' / ')}</span>
              <span>{row.stitchCount} 针</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
