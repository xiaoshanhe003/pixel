import { useEffect, useState } from 'react';
import type { BeadBrand } from '../data/beadPalettes';
import type { PixelGrid } from '../types/pixel';
import type { BeadMappedColor } from '../utils/beads';
import type { CrochetPatternAnalysis } from '../utils/crochet';
import { renderBeadPrintPageDataUrl } from '../utils/beadPrintPage';
import ScenarioExportSheet from './ScenarioExportSheet';

type ScenarioExportPanelProps = {
  scenario: 'beads' | 'crochet';
  grid: PixelGrid;
  beadBrand?: BeadBrand;
  beadUsage?: BeadMappedColor[];
  crochetAnalysis?: CrochetPatternAnalysis;
  exportMode: string;
  onExportModeChange: (mode: string) => void;
  onCleanupBeadNoise: () => void;
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
  onCleanupBeadNoise,
  onPrint,
}: ScenarioExportPanelProps) {
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const isBeadScenario = scenario === 'beads';

  useEffect(() => {
    if (!isBeadScenario || !beadBrand) {
      setPreviewImageUrl(null);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom')) {
      setPreviewImageUrl(null);
      return;
    }

    let cancelled = false;
    const previewDelayMs = grid.width * grid.height >= 2500 ? 160 : 0;
    const timerId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      const nextPreviewImageUrl = renderBeadPrintPageDataUrl({
        grid,
        beadBrand,
        beadUsage,
      });

      if (!cancelled) {
        setPreviewImageUrl(nextPreviewImageUrl);
      }
    }, previewDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [beadBrand, beadUsage, grid, isBeadScenario]);

  return (
    <section
      className={`panel stage-bottom-note scenario-export-panel${isBeadScenario && previewImageUrl ? ' scenario-export-panel--beads-print' : ''}`}
      aria-label={isBeadScenario ? '拼豆图纸' : '打印导出'}
    >
      <div className="panel__header">
        <div className="panel-title-block">
          <h2>{isBeadScenario ? '拼豆图纸' : '打印导出'}</h2>
        </div>
        <div className="panel__header-actions export-panel__actions">
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
        onCleanupBeadNoise={onCleanupBeadNoise}
        className="export-sheet--embedded"
        previewImageUrl={previewImageUrl}
      />
      {isBeadScenario && previewImageUrl ? (
        <div className="export-sheet-print-stage" aria-hidden="true">
          <img
            className="export-sheet-print-stage__image"
            src={previewImageUrl}
            alt="拼豆图纸打印成品"
          />
        </div>
      ) : null}
    </section>
  );
}
