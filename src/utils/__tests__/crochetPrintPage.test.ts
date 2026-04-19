import { describe, expect, it, vi } from 'vitest';
import { renderCrochetPrintPageDataUrl } from '../crochetPrintPage';
import { createBlankGrid } from '../studio';

function createCanvasContextRecorder() {
  const fillText = vi.fn();

  return {
    context: {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      fillText,
      roundRect: vi.fn(),
      setLineDash: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      lineWidth: 1,
      strokeStyle: '#000000',
      fillStyle: '#000000',
      font: '12px sans-serif',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      lineCap: 'butt',
    } as unknown as CanvasRenderingContext2D,
    fillText,
  };
}

describe('renderCrochetPrintPageDataUrl', () => {
  it('renders crochet rulers from right to left and bottom to top', () => {
    const grid = createBlankGrid(16);
    const { context, fillText } = createCanvasContextRecorder();
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context);
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,test');

    try {
      const dataUrl = renderCrochetPrintPageDataUrl({ grid });

      expect(dataUrl).toBe('data:image/png;base64,test');

      const rulerLabels = fillText.mock.calls.slice(0, 16).map(([label]) => label);

      expect(rulerLabels).toEqual([
        '16',
        '16',
        '15',
        '15',
        '14',
        '14',
        '13',
        '13',
        '12',
        '12',
        '11',
        '11',
        '10',
        '10',
        '9',
        '9',
      ]);
    } finally {
      getContext.mockRestore();
      toDataURL.mockRestore();
    }
  });
});
