import type { PixelGrid } from '../types/pixel';
import { BEAD_BRANDS, BEAD_BRAND_ORDER, type BeadBrand } from '../data/beadPalettes';
import type { BeadMappedColor } from '../utils/beads';
import type { CrochetPatternAnalysis } from '../utils/crochet';

type ScenarioExportPanelProps = {
  scenario: 'beads' | 'crochet';
  grid: PixelGrid;
  beadBrand?: BeadBrand;
  beadUsage?: BeadMappedColor[];
  crochetAnalysis?: CrochetPatternAnalysis;
  exportMode: string;
  onBeadBrandChange?: (brand: BeadBrand) => void;
  onExportModeChange: (mode: string) => void;
  onPrint: () => void;
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

export default function ScenarioExportPanel({
  scenario,
  grid,
  beadBrand,
  beadUsage = [],
  crochetAnalysis,
  exportMode,
  onBeadBrandChange,
  onExportModeChange,
  onPrint,
}: ScenarioExportPanelProps) {
  const isBeads = scenario === 'beads';
  const modes = isBeads
    ? [
        { id: 'bead-chart', label: '打印图纸' },
        { id: 'bead-list', label: '颜色清单' },
      ]
    : [
        { id: 'crochet-chart', label: 'PDF 图纸' },
        { id: 'crochet-rows', label: '行列说明' },
      ];

  return (
    <section
      className="panel stage-bottom-note scenario-export-panel"
      aria-label="打印导出"
    >
      <div className="panel__header">
        <div className="panel-title-block">
          <span className="panel-title-block__label">Print</span>
          <h2>打印导出</h2>
        </div>
        <span>{grid.width} x {grid.height}</span>
      </div>
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
        <button type="button" className="chip-button" onClick={onPrint}>
          打印当前图纸
        </button>
      </div>
      <div className="export-sheet">
        {isBeads ? (
          <div className="export-sheet__section">
            <div className="export-sheet__header export-sheet__header--section">
              <strong>拼豆色板</strong>
              <span>{beadBrand?.toUpperCase()} 映射</span>
            </div>
            <div className="frame-strip__actions export-sheet__actions">
              {BEAD_BRAND_ORDER.map((brandId) => {
                const brand = BEAD_BRANDS[brandId];

                return (
                <button
                  key={brand.id}
                  type="button"
                  className={`chip-button${beadBrand === brand.id ? ' is-active' : ''}`}
                  onClick={() => onBeadBrandChange?.(brand.id)}
                >
                  {brand.label}
                </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {isBeads && exportMode === 'bead-chart' ? (
          <>
            <div className="export-sheet__header">
              <strong>拼豆打印图纸</strong>
              <span>{beadBrand?.toUpperCase()} 色号映射</span>
            </div>
            {renderPrintGrid(grid)}
            <div className="export-sheet__section">
              <div className="export-sheet__header export-sheet__header--section">
                <strong>颜色清单</strong>
                <span>{beadUsage.reduce((sum, item) => sum + item.count, 0)} 颗总计</span>
              </div>
              <div className="export-sheet__legend">
                {beadUsage.map((item) => (
                  <div key={item.id} className="export-sheet__legend-item">
                    <span
                      className="swatch-chip"
                      aria-hidden="true"
                      style={{ backgroundColor: item.hex }}
                    />
                    <span>{item.id}</span>
                    <span>{item.name}</span>
                    <strong>{item.count} 颗</strong>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {isBeads && exportMode === 'bead-list' ? (
          <>
            <div className="export-sheet__header">
              <strong>拼豆颜色清单</strong>
              <span>{beadUsage.reduce((sum, item) => sum + item.count, 0)} 颗总计</span>
            </div>
            <div className="export-sheet__list">
              {beadUsage.map((item) => (
                <div key={item.id} className="export-sheet__list-row">
                  <span
                    className="swatch-chip"
                    aria-hidden="true"
                    style={{ backgroundColor: item.hex }}
                  />
                  <span>{item.id}</span>
                  <span>{item.name}</span>
                  <strong>{item.count} 颗</strong>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {!isBeads && exportMode === 'crochet-chart' && crochetAnalysis ? (
          <>
            <div className="export-sheet__header">
              <strong>钩织 PDF 图纸</strong>
              <span>{crochetAnalysis.totalStitches} 针</span>
            </div>
            {renderPrintGrid(grid, true, crochetAnalysis.symbolByColor)}
            <div className="export-sheet__legend">
              {crochetAnalysis.legend.map((item) => (
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

        {!isBeads && exportMode === 'crochet-rows' && crochetAnalysis ? (
          <>
            <div className="export-sheet__header">
              <strong>钩织行列说明</strong>
              <span>{crochetAnalysis.filledRowCount} 行可打印</span>
            </div>
            <div className="export-sheet__list">
              {crochetAnalysis.rows
                .filter((row) => row.stitchCount > 0)
                .map((row) => (
                  <div key={row.rowNumber} className="export-sheet__list-row">
                    <strong>第 {row.rowNumber} 行</strong>
                    <span>{row.instructions.join(' / ')}</span>
                    <span>{row.stitchCount} 针</span>
                  </div>
                ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
