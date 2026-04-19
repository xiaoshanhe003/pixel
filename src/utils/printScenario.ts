import type { BeadBrand } from '../data/beadPalettes';
import type { PixelGrid } from '../types/pixel';
import type { BeadMappedColor } from './beads';
import type { CrochetPatternAnalysis } from './crochet';
import { renderBeadPrintPageDataUrl } from './beadPrintPage';
import { renderCrochetPrintPageDataUrl } from './crochetPrintPage';

type PrintScenarioParams =
  | {
      scenario: 'beads';
      grid: PixelGrid;
      beadBrand: BeadBrand;
      beadUsage: BeadMappedColor[];
    }
  | {
      scenario: 'crochet';
      grid: PixelGrid;
      crochetAnalysis?: CrochetPatternAnalysis | null;
    };

function canUseDedicatedPrintWindow() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  return !(typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom'));
}

function printImageDataUrl(imageUrl: string, title: string) {
  if (!canUseDedicatedPrintWindow()) {
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank', 'noopener,noreferrer');

  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      @page { size: A4; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
      body {
        display: grid;
        place-items: center;
      }
      img {
        display: block;
        width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    <img src="${imageUrl}" alt="${title}" />
  </body>
</html>`);
  printWindow.document.close();

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (printWindow.document.readyState === 'complete') {
    window.setTimeout(triggerPrint, 50);
    return;
  }

  printWindow.addEventListener('load', () => window.setTimeout(triggerPrint, 50), {
    once: true,
  });
}

export function printScenarioExport(params: PrintScenarioParams) {
  if (!canUseDedicatedPrintWindow()) {
    window.print();
    return;
  }

  if (params.scenario === 'beads') {
    const imageUrl = renderBeadPrintPageDataUrl({
      grid: params.grid,
      beadBrand: params.beadBrand,
      beadUsage: params.beadUsage,
    });

    if (!imageUrl) {
      window.print();
      return;
    }

    printImageDataUrl(imageUrl, '拼豆图纸');
    return;
  }

  const imageUrl = renderCrochetPrintPageDataUrl({
    grid: params.grid,
    crochetAnalysis: params.crochetAnalysis,
  });

  if (!imageUrl) {
    window.print();
    return;
  }

  printImageDataUrl(imageUrl, '钩织图纸');
}
