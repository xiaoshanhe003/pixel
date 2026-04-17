import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createBlankCanvas, renderApp, uploadMockImage } from '../test/appTestUtils';

describe('App rendering', () => {
  it('renders the studio heading, scenario tabs, and project settings', () => {
    renderApp();

    expect(screen.getByRole('button', { name: /新建空白画布/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /撤销/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /重做/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /像素绘画/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /拼豆图纸/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /钩织图纸/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /网格尺寸/i })).toHaveValue('16');
    expect(screen.getByRole('combobox', { name: /调色板数量/i })).toHaveValue('16');
    expect(screen.getByLabelText(/启用抖动/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/清理杂点/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/保留轮廓/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/简化形状/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/线稿角色模式/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/主体铺满画幅/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /填充桶/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /线条/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /矩形/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /放大/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /当前缩放 100%/i })).toHaveValue('100');
    expect(screen.getByRole('button', { name: /隐藏网格/i })).toBeInTheDocument();
  });

  it('shows a generated grid after an image is uploaded', async () => {
    renderApp();
    await uploadMockImage();

    expect(screen.getByAltText(/已上传原图预览/i)).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: /像素输出网格/i })).toBeInTheDocument();
    expect(screen.getByText(/当前调色板/i)).toBeInTheDocument();
  });

  it('updates canvas zoom and grid visibility controls', async () => {
    renderApp();

    expect(screen.getByRole('combobox', { name: /当前缩放 100%/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /放大/i }));

    expect(screen.getByRole('combobox', { name: /当前缩放 125%/i })).toHaveValue('125');

    await userEvent.click(screen.getByRole('button', { name: /隐藏网格/i }));

    expect(screen.getByRole('button', { name: /显示网格/i })).toBeInTheDocument();
  });

  it('sets the canvas to actual-size zoom', async () => {
    renderApp();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /当前缩放 100%/i }),
      'actual',
    );

    expect(screen.getByRole('combobox', { name: /当前缩放 2%/i })).toHaveValue('actual');
  });

  it('shows brush and eraser size controls for the active tool', async () => {
    renderApp();
    await createBlankCanvas();

    expect(screen.getByRole('combobox', { name: /画笔尺寸/i })).toHaveValue('1');

    await userEvent.click(screen.getByRole('button', { name: /^橡皮$/i }));

    expect(screen.getByRole('combobox', { name: /橡皮尺寸/i })).toHaveValue('1');
    expect(screen.queryByRole('combobox', { name: /画笔尺寸/i })).not.toBeInTheDocument();
  });

  it('renders tool-specific helper controls inside the inline toolbar', async () => {
    renderApp();
    await createBlankCanvas();

    expect(screen.getByRole('combobox', { name: /画笔尺寸/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /线条/i }));

    expect(screen.queryByRole('combobox', { name: /画笔尺寸/i })).not.toBeInTheDocument();
  });
});
