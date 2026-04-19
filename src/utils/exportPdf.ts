import { jsPDF } from 'jspdf';
import { renderBeadPrintPage } from './beadPrintPage';
import { renderCrochetPrintPage } from './crochetPrintPage';
import { buildScenarioExportDocument, type ScenarioExportParams } from './scenarioExport';

const PAGE_MARGIN = 14;
const LINE_HEIGHT = 5.5;

function ensureSpace(doc: jsPDF, y: number, neededHeight: number) {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y + neededHeight <= pageHeight - PAGE_MARGIN) {
    return y;
  }

  doc.addPage();
  return PAGE_MARGIN;
}

function addWrappedText(doc: jsPDF, text: string, y: number, fontSize = 11) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const lines = doc.splitTextToSize(text, pageWidth - PAGE_MARGIN * 2);
  const nextY = ensureSpace(doc, y, lines.length * LINE_HEIGHT + 1);

  doc.setFontSize(fontSize);
  doc.text(lines, PAGE_MARGIN, nextY);

  return nextY + lines.length * LINE_HEIGHT;
}

function exportBeadScenarioPdf(params: ScenarioExportParams) {
  const beadBrand = params.beadBrand ?? 'mard';
  const canvas = renderBeadPrintPage({
    grid: params.grid,
    beadBrand,
    beadUsage: params.beadUsage ?? [],
  });

  if (!canvas) {
    return;
  }

  const isLandscape = canvas.width > canvas.height;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const scale = Math.min(
    (pageWidth - PAGE_MARGIN * 2) / canvas.width,
    (pageHeight - PAGE_MARGIN * 2) / canvas.height,
  );
  const renderWidth = canvas.width * scale;
  const renderHeight = canvas.height * scale;
  const x = (pageWidth - renderWidth) / 2;
  const y = (pageHeight - renderHeight) / 2;

  doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');
  doc.save('pixel-forge-beads-pattern.pdf');
}

function exportCrochetScenarioPdf(params: ScenarioExportParams) {
  const exportDocument = buildScenarioExportDocument(params);

  if (exportDocument.kind === 'crochet-chart') {
    const canvas = renderCrochetPrintPage({
      grid: params.grid,
      crochetAnalysis: params.crochetAnalysis ?? null,
    });

    if (!canvas) {
      return;
    }

    const isLandscape = canvas.width > canvas.height;
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const scale = Math.min(
      (pageWidth - PAGE_MARGIN * 2) / canvas.width,
      (pageHeight - PAGE_MARGIN * 2) / canvas.height,
    );
    const renderWidth = canvas.width * scale;
    const renderHeight = canvas.height * scale;
    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');
    doc.save(`${exportDocument.filename}.pdf`);
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let y = PAGE_MARGIN;
  const englishTitle = 'Crochet Row Notes';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(englishTitle, PAGE_MARGIN, y);
  y += 8;

  if (exportDocument.kind === 'crochet-rows') {
    doc.setFont('helvetica', 'normal');
    y = addWrappedText(doc, `Printable rows: ${exportDocument.filledRowCount}`, y, 11) + 2;

    for (const row of exportDocument.rows) {
      y = addWrappedText(
        doc,
        `Row ${row.rowNumber}  ${row.instructions.join(' / ')}  ${row.stitchCount} stitches`,
        y,
        10,
      );
    }
  }

  doc.save(`${exportDocument.filename}.pdf`);
}

export function exportScenarioPdf(params: ScenarioExportParams) {
  if (params.scenario === 'beads') {
    exportBeadScenarioPdf(params);
    return;
  }

  exportCrochetScenarioPdf(params);
}
