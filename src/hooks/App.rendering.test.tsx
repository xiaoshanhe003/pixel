import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createBlankCanvas, renderApp, uploadMockImage } from '../test/appTestUtils';
import { cropImageFile } from '../utils/image';

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
    expect(screen.getByRole('combobox', { name: /颜色数量/i })).toHaveValue('16');
    expect(screen.getByRole('combobox', { name: /细节等级/i })).toHaveValue('clean');
    expect(screen.getByRole('combobox', { name: /图像类型/i })).toHaveValue('line-art-character');
    expect(screen.getByRole('combobox', { name: /画面构图/i })).toHaveValue('full-composition');
    expect(screen.getByRole('button', { name: /填充桶/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /线条/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /矩形/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /放大/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /当前缩放 100%/i })).toHaveValue('100');
    expect(screen.getByRole('checkbox', { name: /网格/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('button', { name: /抓手/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('hides palette size controls in bead mode', async () => {
    renderApp();

    expect(screen.getByRole('combobox', { name: /颜色数量/i })).toHaveValue('16');

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));

    expect(screen.queryByRole('combobox', { name: /颜色数量/i })).not.toBeInTheDocument();
  });

  it('shows the expanded grid size options in ascending order', async () => {
    renderApp();

    const gridSizeSelect = screen.getByRole('combobox', { name: /网格尺寸/i });
    const optionLabels = Array.from(gridSizeSelect.querySelectorAll('option')).map(
      (option) => option.textContent,
    );

    expect(optionLabels).toEqual(['16 x 16', '32 x 32', '50 x 50', '64 x 64', '100 x 100']);
  });

  it('shows a generated grid after an image is uploaded', async () => {
    renderApp();
    await uploadMockImage();

    expect(screen.getByAltText(/已上传原图预览/i)).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: /像素输出网格/i })).toBeInTheDocument();
    expect(screen.getByText(/当前调色板/i)).toBeInTheDocument();
  });

  it('allows clearing the uploaded source image from the left dock', async () => {
    renderApp();
    await uploadMockImage();

    await userEvent.click(screen.getByRole('button', { name: /删除/i }));

    expect(screen.queryByAltText(/已上传原图预览/i)).not.toBeInTheDocument();
    expect(screen.getByText(/无参考图/i)).toBeInTheDocument();
  });

  it('keeps pre-processing behind a single confirm action before upload', async () => {
    renderApp();

    const input = screen.getByLabelText(/上传图片/i) as HTMLInputElement;
    const file = new File(['fake'], 'sprite.png', { type: 'image/png' });

    await userEvent.upload(input, file);

    expect(screen.getByRole('dialog', { name: /图片裁切/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^确认$/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^确认$/i }));

    expect(cropImageFile).not.toHaveBeenCalled();
    await screen.findByRole('grid', { name: /像素输出网格/i });
  });

  it('reopens cropping inside a modal for an existing uploaded image', async () => {
    renderApp();
    await uploadMockImage();

    await userEvent.click(screen.getByRole('button', { name: /^裁切$/i }));

    expect(screen.getByRole('dialog', { name: /图片裁切/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^关闭$/i }));

    expect(screen.queryByRole('dialog', { name: /图片裁切/i })).not.toBeInTheDocument();
    expect(screen.getByAltText(/已上传原图预览/i)).toBeInTheDocument();
  });

  it('updates canvas zoom and grid visibility controls', async () => {
    renderApp();

    expect(screen.getByRole('combobox', { name: /当前缩放 100%/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /放大/i }));

    expect(screen.getByRole('combobox', { name: /当前缩放 125%/i })).toHaveValue('125');

    await userEvent.click(screen.getByRole('checkbox', { name: /网格/i }));

    expect(screen.getByRole('checkbox', { name: /网格/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
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

    await userEvent.click(screen.getByRole('button', { name: /画笔/i }));

    expect(screen.getByLabelText(/画笔设置/i)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /画笔尺寸/i })).toHaveValue('1');
    expect(screen.getByLabelText(/当前尺寸 1 px/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^橡皮$/i }));

    expect(screen.getByLabelText(/橡皮设置/i)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /橡皮尺寸/i })).toHaveValue('1');
    expect(screen.getByLabelText(/当前尺寸 1 px/i)).toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: /画笔尺寸/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/画笔设置/i)).not.toBeInTheDocument();
  });

  it('renders the secondary tool panel for paint and fill only', async () => {
    renderApp();
    await createBlankCanvas();

    await userEvent.click(screen.getByRole('button', { name: /画笔/i }));

    expect(screen.getByLabelText(/画笔设置/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /填充桶/i }));

    expect(screen.getByLabelText(/填充设置/i)).toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: /画笔尺寸/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^橡皮$/i }));

    expect(screen.getByLabelText(/橡皮设置/i)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /橡皮尺寸/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /线条/i }));

    expect(screen.queryByRole('slider', { name: /画笔尺寸/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: /橡皮尺寸/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/填充设置/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/橡皮设置/i)).not.toBeInTheDocument();
  });
});
