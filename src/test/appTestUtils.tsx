import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from '../App';
import type { PixelGrid } from '../types/pixel';

vi.mock('../utils/image', () => ({
  fileToImageElement: vi.fn(async () => ({ width: 16, height: 16 })),
  cropImageFile: vi.fn(
    async (file: File) => new File(['cropped'], `cropped-${file.name}`, { type: file.type }),
  ),
  imageSourceToImageData: vi.fn(
    () =>
      ({
        data: new Uint8ClampedArray(16 * 16 * 4),
        width: 16,
        height: 16,
      }) as ImageData,
  ),
}));

vi.mock('../utils/pixelPipeline', () => ({
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

export function renderApp() {
  return render(<App />);
}

export async function createBlankCanvas() {
  await userEvent.click(screen.getByRole('button', { name: /新建空白画布/i }));
}

export async function uploadMockImage(name = 'sprite.png') {
  const input = screen.getByLabelText(/上传图片/i) as HTMLInputElement;
  const file = new File(['fake'], name, { type: 'image/png' });

  await userEvent.upload(input, file);
  await userEvent.click(screen.getByRole('button', { name: /^确认$/i }));
  await waitFor(() =>
    expect(screen.getByLabelText(/像素 1,0 #ffffff/i)).toBeInTheDocument(),
  );
}
