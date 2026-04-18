import { useState } from 'react';
import type { BeadBrand } from '../data/beadPalettes';
import type { PixelGrid } from '../types/pixel';
import type { BeadMappedColor } from '../utils/beads';
import type { CrochetPatternAnalysis } from '../utils/crochet';
import ScenarioExportPreviewDialog from './ScenarioExportPreviewDialog';
import ScenarioExportSheet from './ScenarioExportSheet';

type ScenarioExportPanelProps = {
  scenario: 'beads' | 'crochet';
  grid: PixelGrid;
  beadBrand?: BeadBrand;
  beadUsage?: BeadMappedColor[];
  crochetAnalysis?: CrochetPatternAnalysis;
  exportMode: string;
  onExportModeChange: (mode: string) => void;
  onPrint: () => void;
};

export default function ScenarioExportPanel({
  scenario,
  grid,
  beadBrand,
  beadUsage = [],
  crochetAnalysis,
  exportMode,
  onExportModeChange,
  onPrint,
}: ScenarioExportPanelProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  function handleExportPdf() {
    setIsExportingPdf(true);

    void import('../utils/exportPdf')
      .then(({ exportScenarioPdf }) =>
        exportScenarioPdf({
          scenario,
          grid,
          beadBrand,
          beadUsage,
          crochetAnalysis,
          exportMode,
        }),
      )
      .finally(() => {
        setIsExportingPdf(false);
      });
  }

  return (
    <>
      <section className="panel stage-bottom-note scenario-export-panel" aria-label="打印导出">
        <div className="panel__header">
          <div className="panel-title-block">
            <h2>打印导出</h2>
          </div>
          <div className="panel__header-actions export-panel__actions">
            <button
              type="button"
              className={`chip-button${isPreviewOpen ? ' is-active' : ''}`}
              aria-label="打开图纸预览"
              aria-pressed={isPreviewOpen}
              onClick={() => setIsPreviewOpen(true)}
            >
              预览
            </button>
            <button
              type="button"
              className="chip-button export-print-button"
              aria-label="打印当前图纸"
              onClick={onPrint}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M7 8V4h10v4M6 16H4v-6h16v6h-2M7 14h10v6H7z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
              <span>打印</span>
            </button>
            <button
              type="button"
              className="chip-button"
              aria-label="导出 PDF"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
            >
              {isExportingPdf ? '生成中...' : '导出 PDF'}
            </button>
          </div>
        </div>
        <ScenarioExportSheet
          scenario={scenario}
          grid={grid}
          beadBrand={beadBrand}
          beadUsage={beadUsage}
          crochetAnalysis={crochetAnalysis}
          exportMode={exportMode}
          onExportModeChange={onExportModeChange}
          className="export-sheet--embedded"
        />
      </section>
      {isPreviewOpen ? (
        <ScenarioExportPreviewDialog
          scenario={scenario}
          grid={grid}
          beadBrand={beadBrand}
          beadUsage={beadUsage}
          crochetAnalysis={crochetAnalysis}
          exportMode={exportMode}
          onExportModeChange={onExportModeChange}
          onPrint={onPrint}
          onExportPdf={handleExportPdf}
          onClose={() => setIsPreviewOpen(false)}
          isExportingPdf={isExportingPdf}
        />
      ) : null}
    </>
  );
}
