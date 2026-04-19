import { screen, within } from '@testing-library/react';
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
    expect(screen.getByRole('heading', { name: /^拼豆图纸$/i })).toBeInTheDocument();
    expect(screen.queryByText(/Perler 映射/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Perler 色号映射/i)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: /P 系列颜色/i })).toBeInTheDocument();
    const exportPanel = screen.getByLabelText(/拼豆图纸/i);

    expect(within(exportPanel).queryByText(/^Print$/i)).not.toBeInTheDocument();
    expect(within(exportPanel).queryByText(/^16 x 16$/i)).not.toBeInTheDocument();
    expect(within(exportPanel).queryByRole('button', { name: /豆子清单/i })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: /P 系列颜色/i })).toBeInTheDocument();
    expect(screen.getByText(/所需豆子数量：/i)).toBeInTheDocument();
    expect(screen.getByText(/所需最小的行和列：/i)).toBeInTheDocument();
  });

  it('prints only from the scenario export panel action', async () => {
    vi.mocked(window.print).mockClear();
    renderApp();
    await uploadMockImage('beads-print.png');

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /打印当前图纸/i }));

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('prints crochet chart from the scenario export panel action', async () => {
    vi.mocked(window.print).mockClear();
    renderApp();
    await createBlankCanvas();

    await userEvent.click(screen.getByRole('button', { name: /画笔/i }));
    await userEvent.click(screen.getByLabelText(/像素 0,15 透明/i));
    await userEvent.click(screen.getByRole('button', { name: /钩织图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /打印当前图纸/i }));

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('disables scenario print and hides crochet-only summaries in blank states', async () => {
    renderApp();
    await createBlankCanvas();

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));

    expect(screen.getByRole('button', { name: /打印当前图纸/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /钩织图纸/i }));

    expect(screen.getByRole('button', { name: /打印当前图纸/i })).toBeDisabled();
    expect(screen.queryByLabelText(/钩织图纸摘要/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/第 1 行/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/当前调色板/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/透明/i)).not.toBeInTheDocument();
  });

  it('cleans up bead speckles on the canvas from the export panel action', async () => {
    renderApp();
    await createBlankCanvas();

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /画笔/i }));

    await userEvent.click(screen.getByLabelText(/像素 0,0 透明/i));
    await userEvent.click(screen.getByLabelText(/像素 1,0 透明/i));
    await userEvent.click(screen.getByLabelText(/像素 0,1 透明/i));
    await userEvent.click(screen.getByLabelText(/像素 1,1 透明/i));

    await userEvent.click(screen.getByRole('button', { name: /打开 Mard 品牌色板/i }));
    await userEvent.click(screen.getByRole('button', { name: /选择品牌色 B12/i }));

    await userEvent.click(screen.getByLabelText(/像素 2,0 透明/i));
    await userEvent.click(screen.getByLabelText(/像素 3,0 透明/i));
    await userEvent.click(screen.getByLabelText(/像素 2,1 透明/i));

    expect(screen.getByLabelText(/像素 2,1 #166f41/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /去除杂色/i }));

    expect(screen.getByLabelText(/像素 2,1 #000000/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/像素 2,1 #166f41/i)).not.toBeInTheDocument();
  });

  it('cleans up bead speckles on a 50 x 50 canvas', async () => {
    renderApp();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /网格尺寸/i }), '50');
    await createBlankCanvas();

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /画笔/i }));

    await userEvent.click(screen.getByLabelText(/像素 0,0 透明/i));
    await userEvent.click(screen.getByLabelText(/像素 1,0 透明/i));
    await userEvent.click(screen.getByLabelText(/像素 0,1 透明/i));
    await userEvent.click(screen.getByLabelText(/像素 1,1 透明/i));

    await userEvent.click(screen.getByRole('button', { name: /打开 Mard 品牌色板/i }));
    await userEvent.click(screen.getByRole('button', { name: /选择品牌色 B12/i }));

    await userEvent.click(screen.getByLabelText(/像素 2,0 透明/i));
    await userEvent.click(screen.getByLabelText(/像素 3,0 透明/i));
    await userEvent.click(screen.getByLabelText(/像素 2,1 透明/i));

    expect(screen.getByLabelText(/像素 2,1 #166f41/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /去除杂色/i }));

    expect(screen.getByLabelText(/像素 2,1 #000000/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/像素 2,1 #166f41/i)).not.toBeInTheDocument();
  }, 15000);

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
    expect(
      Array.from(document.querySelectorAll('.bead-axis-label--top'))
        .slice(0, 4)
        .map((label) => label.textContent),
    ).toEqual(['16', '15', '14', '13']);
    expect(screen.getByText(/R1（2针）/i)).toBeInTheDocument();
    expect(screen.getByText(/^H x 2$/i)).toBeInTheDocument();
    expect(screen.queryByText(/钩织 PDF 图纸/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /行列说明/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /PDF 图纸/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/^H$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^黑$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2 针/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/图纸最小行列范围：/i)).toBeInTheDocument();
    expect(document.querySelectorAll('.export-sheet__divider')).toHaveLength(1);
    expect(screen.queryByText(/针 ·/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /符号图/i }));

    expect(screen.getByLabelText(/像素 0,15 #000000 符号 H/i)).toBeInTheDocument();
  });
});
