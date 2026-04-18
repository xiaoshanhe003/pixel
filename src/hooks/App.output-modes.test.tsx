import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_16_COLOR_PALETTE } from '../data/defaultPalettes';
import { BEAD_BRANDS } from '../data/beadPalettes';
import { createBlankCanvas, renderApp, uploadMockImage } from '../test/appTestUtils';
import {
  buildBeadEditorPalette,
  findBeadColorByHex,
  mapColorToBeadPalette,
} from '../utils/beads';
import { exportScenarioPdf } from '../utils/exportPdf';

vi.mock('../utils/exportPdf', () => ({
  exportScenarioPdf: vi.fn(),
}));

describe('App output modes', () => {
  it('maps the bead scenario to a brand palette and shows bead counts', async () => {
    renderApp();
    await uploadMockImage('beads.png');

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /选择拼豆品牌映射/i }),
      'perler',
    );

    expect(screen.getByText(/拼豆色板/i)).toBeInTheDocument();
    expect(screen.getAllByText(/255 颗/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /打印导出/i })).toBeInTheDocument();
    expect(screen.getByText(/拼豆打印图纸/i)).toBeInTheDocument();
    expect(screen.queryByText(/Perler 映射/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Perler 色号映射/i)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: /P 系列颜色/i })).toBeInTheDocument();
    const exportPanel = screen.getByLabelText(/打印导出/i);

    expect(within(exportPanel).queryByText(/^Print$/i)).not.toBeInTheDocument();
    expect(within(exportPanel).queryByText(/^16 x 16$/i)).not.toBeInTheDocument();
    expect(within(exportPanel).queryByRole('button', { name: /豆子清单/i })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: /P 系列颜色/i })).toBeInTheDocument();
    expect(screen.getByText(/所需豆子数量：/i)).toBeInTheDocument();
    expect(screen.getByText(/所需最小的行和列：/i)).toBeInTheDocument();
  });

  it('prints only from the scenario export panel action', async () => {
    renderApp();
    await uploadMockImage('beads-print.png');

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /打印当前图纸/i }));

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('opens a dedicated export preview dialog from the export panel', async () => {
    renderApp();
    await uploadMockImage('beads-preview.png');

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));

    await userEvent.click(screen.getByRole('button', { name: /打开图纸预览/i }));

    expect(screen.getByRole('dialog', { name: /打印预览/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/图纸成品预览/i)).toBeInTheDocument();
  });

  it('exports the current chart as a pdf file', async () => {
    renderApp();
    await uploadMockImage('beads-export.png');

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /导出 PDF/i }));

    await waitFor(() => expect(exportScenarioPdf).toHaveBeenCalledTimes(1));
  });

  it('keeps the active paint color in sync with the bead brand mapping', async () => {
    renderApp();
    await createBlankCanvas();
    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /画笔/i }));

    const mappedColor = mapColorToBeadPalette('#000000', 'mard');
    const mappedBead = findBeadColorByHex(mappedColor, 'mard');

    expect(screen.getByText(mappedBead?.id ?? mappedColor)).toBeInTheDocument();
  });

  it('uses the current bead brand palette in the toolbar swatches without duplicates', async () => {
    renderApp();
    await createBlankCanvas();
    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /画笔/i }));

    const swatches = screen.getAllByRole('button', { name: /选择颜色/i });
    const swatchTitles = swatches.map((swatch) => swatch.getAttribute('title'));
    const uniqueTitles = new Set(swatchTitles);
    const expectedPalette = buildBeadEditorPalette(
      'mard',
      DEFAULT_16_COLOR_PALETTE,
      16,
    );
    const expectedCount = Math.min(16, expectedPalette.length, BEAD_BRANDS.mard.colors.length);

    expect(swatches.length).toBe(uniqueTitles.size);
    expect(swatches.length).toBe(expectedCount);
    expect([...uniqueTitles].sort()).toEqual([...expectedPalette].sort());
  });

  it('opens the full bead brand library instead of the default color picker in bead mode', async () => {
    renderApp();
    await createBlankCanvas();
    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /画笔/i }));

    expect(document.querySelector('input[type="color"]')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /打开 Mard 品牌色板/i }));

    expect(screen.getByRole('dialog', { name: /Mard 品牌色板/i })).toBeInTheDocument();
    expect(screen.getByText(/H 系列/i)).toBeInTheDocument();
    expect(screen.getByText(/黑白灰中性色/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /选择品牌色 B12/i }));

    expect(screen.getByText('B12')).toBeInTheDocument();
  });

  it('shows crochet numbering, symbol view, and row instructions', async () => {
    renderApp();
    await createBlankCanvas();
    await userEvent.click(screen.getByRole('button', { name: /画笔/i }));
    await userEvent.click(screen.getByLabelText(/像素 0,15 透明/i));
    await userEvent.click(screen.getByLabelText(/像素 1,15 透明/i));

    await userEvent.click(screen.getByRole('button', { name: /钩织图纸/i }));

    expect(screen.getAllByRole('heading', { name: /钩织图纸/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/第 1 行/i)).toBeInTheDocument();
    expect(screen.getByText(/A x 2/i)).toBeInTheDocument();
    expect(screen.getByText(/钩织 PDF 图纸/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /符号图/i }));

    expect(screen.getByLabelText(/像素 0,15 #000000 符号 A/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /行列说明/i }));

    expect(screen.getByText(/钩织行列说明/i)).toBeInTheDocument();
  });
});
