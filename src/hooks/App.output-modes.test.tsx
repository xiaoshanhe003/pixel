import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createBlankCanvas, renderApp, uploadMockImage } from '../test/appTestUtils';

describe('App output modes', () => {
  it('maps the bead scenario to a brand palette and shows bead counts', async () => {
    renderApp();
    await uploadMockImage('beads.png');

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /Perler/i }));

    expect(screen.getByRole('heading', { name: /拼豆色板/i })).toBeInTheDocument();
    expect(screen.getByText(/Perler 映射/i)).toBeInTheDocument();
    expect(screen.getAllByText(/255 颗/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /打印导出/i })).toBeInTheDocument();
    expect(screen.getByText(/拼豆打印图纸/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /颜色清单/i }));

    expect(screen.getByText(/拼豆颜色清单/i)).toBeInTheDocument();
  });

  it('prints only from the scenario export panel action', async () => {
    renderApp();
    await uploadMockImage('beads-print.png');

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /打印当前图纸/i }));

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('shows crochet numbering, symbol view, and row instructions', async () => {
    renderApp();
    await createBlankCanvas();
    await userEvent.click(screen.getByLabelText(/像素 0,15 透明/i));
    await userEvent.click(screen.getByLabelText(/像素 1,15 透明/i));

    await userEvent.click(screen.getByRole('button', { name: /钩织图纸/i }));

    expect(screen.getAllByRole('heading', { name: /钩织图纸/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/第 1 行/i)).toBeInTheDocument();
    expect(screen.getByText(/A x 2/i)).toBeInTheDocument();
    expect(screen.getByText(/钩织 PDF 图纸/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /符号图/i }));

    expect(screen.getByLabelText(/像素 0,15 #d65a31 符号 A/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /行列说明/i }));

    expect(screen.getByText(/钩织行列说明/i)).toBeInTheDocument();
  });
});
