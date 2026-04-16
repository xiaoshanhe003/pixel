import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import type { PixelGrid } from './types/pixel';

vi.mock('./utils/image', () => ({
  fileToImageElement: vi.fn(async () => ({ width: 16, height: 16 })),
  imageSourceToImageData: vi.fn(
    () =>
      ({
        data: new Uint8ClampedArray(16 * 16 * 4),
        width: 16,
        height: 16,
      }) as ImageData,
  ),
}));

vi.mock('./utils/pixelPipeline', () => ({
  buildPixelGrid: vi.fn(
    (): PixelGrid => ({
      width: 16,
      height: 16,
      palette: ['#000000', '#ffffff'],
      cells: Array.from({ length: 256 }, (_, index) => ({
        x: index % 16,
        y: Math.floor(index / 16),
        color: index === 0 ? null : index % 2 === 0 ? '#000000' : '#ffffff',
        source: { r: 0, g: 0, b: 0 },
        alpha: index === 0 ? 0 : 255,
      })),
    }),
  ),
}));

vi.stubGlobal(
  'URL',
  Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:preview'),
    revokeObjectURL: vi.fn(),
  }),
);
vi.stubGlobal('print', vi.fn());

describe('App', () => {
  it('renders the studio heading, scenario tabs, and size options', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /像素工坊/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新建空白画布/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /像素绘画/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /拼豆图纸/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /钩织图纸/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/16 x 16/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/32 x 32/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/64 x 64/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/16 色/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/32 色/i)).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /隐藏网格/i })).toBeInTheDocument();
  });

  it('creates a blank canvas and allows painting on it', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /新建空白画布/i }));
    await userEvent.click(screen.getByLabelText(/像素 0,0 透明/i));

    expect(screen.getByLabelText(/像素 0,0 #d65a31/i)).toBeInTheDocument();
    expect(screen.getAllByText(/#d65a31/i).length).toBeGreaterThan(0);
  });

  it('fills a contiguous area on the blank canvas', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /新建空白画布/i }));
    await userEvent.click(screen.getByRole('button', { name: /填充桶/i }));
    await userEvent.click(screen.getByLabelText(/像素 0,0 透明/i));

    expect(screen.getByLabelText(/像素 0,0 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 15,15 #d65a31/i)).toBeInTheDocument();
  });

  it('draws a line on the blank canvas', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /新建空白画布/i }));
    await userEvent.click(screen.getByRole('button', { name: /线条/i }));

    const first = screen.getByLabelText(/像素 0,0 透明/i);
    const last = screen.getByLabelText(/像素 2,2 透明/i);

    fireEvent.pointerDown(first, { pointerId: 6 });
    fireEvent.pointerEnter(last, { pointerId: 6 });
    fireEvent.pointerUp(last, { pointerId: 6 });

    expect(screen.getByLabelText(/像素 0,0 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 1,1 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 2,2 #d65a31/i)).toBeInTheDocument();
  });

  it('draws a rectangle outline on the blank canvas', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /新建空白画布/i }));
    await userEvent.click(screen.getByRole('button', { name: /矩形/i }));

    const first = screen.getByLabelText(/像素 1,1 透明/i);
    const last = screen.getByLabelText(/像素 3,3 透明/i);

    fireEvent.pointerDown(first, { pointerId: 7 });
    fireEvent.pointerEnter(last, { pointerId: 7 });
    fireEvent.pointerUp(last, { pointerId: 7 });

    expect(screen.getByLabelText(/像素 1,1 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 2,1 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 3,1 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 2,2 透明/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 3,3 #d65a31/i)).toBeInTheDocument();
  });

  it('shows a generated grid after an image is uploaded', async () => {
    render(<App />);

    const input = screen.getByLabelText(/上传图片/i) as HTMLInputElement;
    const file = new File(['fake'], 'sprite.png', { type: 'image/png' });

    await userEvent.upload(input, file);

    await waitFor(() =>
      expect(screen.getByRole('grid', { name: /像素输出网格/i })).toBeInTheDocument(),
    );

    expect(
      screen.getByAltText(/已上传原图预览/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('grid', { name: /像素输出网格/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/当前调色板/i)).toBeInTheDocument();
  });

  it('maps the bead scenario to a brand palette and shows bead counts', async () => {
    render(<App />);

    const input = screen.getByLabelText(/上传图片/i) as HTMLInputElement;
    const file = new File(['fake'], 'beads.png', { type: 'image/png' });
    await userEvent.upload(input, file);

    await waitFor(() =>
      expect(screen.getByRole('grid', { name: /像素输出网格/i })).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /Perler/i }));

    expect(screen.getByRole('heading', { name: /拼豆色板/i })).toBeInTheDocument();
    expect(screen.getByText(/Perler 映射/i)).toBeInTheDocument();
    expect(screen.getAllByText(/255 颗/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/材料总数：255 颗/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /打印导出/i })).toBeInTheDocument();
    expect(screen.getByText(/拼豆打印图纸/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /颜色清单/i }));

    expect(screen.getByText(/拼豆颜色清单/i)).toBeInTheDocument();
  });

  it('prints only from the scenario export panel action', async () => {
    render(<App />);

    const input = screen.getByLabelText(/上传图片/i) as HTMLInputElement;
    const file = new File(['fake'], 'beads-print.png', { type: 'image/png' });
    await userEvent.upload(input, file);

    await waitFor(() =>
      expect(screen.getByRole('grid', { name: /像素输出网格/i })).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /拼豆图纸/i }));
    await userEvent.click(screen.getByRole('button', { name: /打印当前图纸/i }));

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('shows crochet numbering, symbol view, and row instructions', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /新建空白画布/i }));
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

  it('lets the user create and manage layers in pixel mode', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /图层/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /选中/i })).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: /新建图层/i }));

    expect(screen.getAllByRole('button', { name: /选中/i })).toHaveLength(2);
  });

  it('lets the user delete the active layer in pixel mode', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /新建图层/i }));
    expect(screen.getAllByRole('button', { name: /选中/i })).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: /删除图层/i }));

    expect(screen.getAllByRole('button', { name: /选中/i })).toHaveLength(1);
  });

  it('lets the user merge the active layer down in pixel mode', async () => {
    render(<App />);

    await userEvent.click(screen.getByLabelText(/像素 0,0 透明/i));
    await userEvent.click(screen.getByRole('button', { name: /新建图层/i }));
    await userEvent.click(screen.getByRole('button', { name: /线条/i }));

    const start = screen.getByLabelText(/像素 1,0 透明/i);
    const end = screen.getByLabelText(/像素 1,0 透明/i);
    fireEvent.pointerDown(start, { pointerId: 11 });
    fireEvent.pointerEnter(end, { pointerId: 11 });
    fireEvent.pointerUp(end, { pointerId: 11 });

    expect(screen.getAllByRole('button', { name: /选中/i })).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: /合并到下层/i }));

    expect(screen.getAllByRole('button', { name: /选中/i })).toHaveLength(1);
    expect(screen.getByLabelText(/像素 0,0 #d65a31/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/像素 1,0 #d65a31/i)).toBeInTheDocument();
  });

  it('adds a duplicate frame in pixel mode', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /复制当前帧/i }));

    expect(
      screen.getAllByRole('button', { name: /第 .* 帧/i }).length,
    ).toBeGreaterThan(1);
  });

  it('updates canvas zoom and grid visibility controls', async () => {
    render(<App />);

    expect(screen.getByText(/100%/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /放大/i }));

    expect(screen.getByText(/125%/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /隐藏网格/i }));

    expect(screen.getByRole('button', { name: /显示网格/i })).toBeInTheDocument();
  });

  it('plays back frames in sequence when preview is enabled', async () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /复制当前帧/i }));
      expect(screen.getAllByRole('button', { name: /第 .* 帧/i })).toHaveLength(2);

      fireEvent.click(screen.getByRole('button', { name: /播放预览/i }));
      expect(screen.getByRole('button', { name: /暂停预览/i })).toBeInTheDocument();

      const firstFrame = screen.getByRole('button', { name: /第 1 帧/i });
      const secondFrame = screen.getByRole('button', { name: /第 2 帧/i });

      expect(firstFrame.className).not.toContain('is-active');
      expect(secondFrame.className).toContain('is-active');

      act(() => {
        vi.advanceTimersByTime(170);
      });

      expect(screen.getByRole('button', { name: /第 1 帧/i }).className).toContain(
        'is-active',
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
