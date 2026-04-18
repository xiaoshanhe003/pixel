import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BeadBrand } from '../data/beadPalettes';
import type { PixelGrid } from '../types/pixel';
import type { BeadMappedColor } from '../utils/beads';
import type { CrochetPatternAnalysis } from '../utils/crochet';
import { renderBeadPrintPageDataUrl } from '../utils/beadPrintPage';
import ScenarioExportSheet from './ScenarioExportSheet';

type ScenarioExportPreviewDialogProps = {
  scenario: 'beads' | 'crochet';
  grid: PixelGrid;
  beadBrand?: BeadBrand;
  beadUsage?: BeadMappedColor[];
  crochetAnalysis?: CrochetPatternAnalysis;
  exportMode: string;
  onExportModeChange: (mode: string) => void;
  onPrint: () => void;
  onExportPdf: () => void;
  onClose: () => void;
  isExportingPdf?: boolean;
};

export default function ScenarioExportPreviewDialog({
  scenario,
  grid,
  beadBrand,
  beadUsage = [],
  crochetAnalysis,
  exportMode,
  onExportModeChange,
  onPrint,
  onExportPdf,
  onClose,
  isExportingPdf = false,
}: ScenarioExportPreviewDialogProps) {
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

    const nextUrl = renderBeadPrintPageDataUrl({
      grid,
      beadBrand,
      beadUsage,
    });
    setPreviewImageUrl(nextUrl);
  }, [beadBrand, beadUsage, grid, isBeadScenario]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    documentElement.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouchAction;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const dialog = (
    <div className="export-preview-backdrop">
      <section className="export-preview-dialog" role="dialog" aria-modal="true" aria-label="打印预览">
        <div className="export-preview-dialog__header">
          <div>
            <h3 className="crop-dialog__title">打印预览</h3>
          </div>
          <div className="export-preview-dialog__actions">
            <button type="button" className="chip-button" onClick={onPrint}>
              打印
            </button>
            <button
              type="button"
              className="chip-button"
              disabled={isExportingPdf}
              onClick={onExportPdf}
            >
              {isExportingPdf ? '生成中...' : '导出 PDF'}
            </button>
            <button type="button" className="chip-button" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>

        <div className="export-preview-stage">
          <div className="export-preview-paper" aria-label="图纸成品预览">
            {isBeadScenario && previewImageUrl ? (
              <img
                className="export-preview-paper__image"
                src={previewImageUrl}
                alt="拼豆图纸打印预览"
              />
            ) : (
              <ScenarioExportSheet
                scenario={scenario}
                grid={grid}
                beadBrand={beadBrand}
                beadUsage={beadUsage}
                crochetAnalysis={crochetAnalysis}
                exportMode={exportMode}
                onExportModeChange={onExportModeChange}
                className="export-sheet--preview"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );

  if (typeof document === 'undefined') {
    return dialog;
  }

  return createPortal(dialog, document.body);
}
