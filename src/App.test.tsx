import { render, screen, waitFor } from '@testing-library/react';
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

describe('App', () => {
  it('renders the converter heading and size options', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /像素工坊/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/16 x 16/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/32 x 32/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/16 色/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/32 色/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/启用抖动/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/清理杂点/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/保留轮廓/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/简化形状/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/线稿角色模式/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/主体铺满画幅/i)).toBeInTheDocument();
  });

  it('shows a generated grid after an image is uploaded', async () => {
    render(<App />);

    const input = screen.getByLabelText(/上传图片/i) as HTMLInputElement;
    const file = new File(['fake'], 'sprite.png', { type: 'image/png' });

    await userEvent.upload(input, file);

    await waitFor(() =>
      expect(screen.getByText(/像素网格已生成/i)).toBeInTheDocument(),
    );

    expect(
      screen.getByAltText(/已上传原图预览/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('grid', { name: /像素输出网格/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/当前调色板/i)).toBeInTheDocument();
  });
});
