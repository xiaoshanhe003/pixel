import { describe, expect, it, vi } from 'vitest';
import { analyzeCrochetPattern } from '../crochet';
import { renderCrochetPrintPageDataUrl } from '../crochetPrintPage';
import { createBlankGrid, replaceCellColor } from '../studio';

function createCanvasContextRecorder() {
  const fontHistory: string[] = [];
  const context = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
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
  } as unknown as CanvasRenderingContext2D;
  const fillText = vi.fn(function (this: CanvasRenderingContext2D, label: string) {
    fontHistory.push(`${this.font}::${label}`);
  });
  (context as unknown as { fillText: typeof fillText }).fillText = fillText;

  return {
    context,
    fillText,
    fontHistory,
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

  it('renders crochet row notes in the footer using the same 20px note size as bead exports', () => {
    let grid = createBlankGrid(16);
    grid = replaceCellColor(grid, 0, 15, '#111111');
    grid = replaceCellColor(grid, 1, 15, '#111111');
    grid = replaceCellColor(grid, 2, 15, '#ff0000');
    grid = replaceCellColor(grid, 0, 14, '#ff0000');

    const crochetAnalysis = analyzeCrochetPattern(grid);
    const { context, fontHistory } = createCanvasContextRecorder();
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context);
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,test');

    try {
      renderCrochetPrintPageDataUrl({ grid, crochetAnalysis });

      expect(fontHistory).toContain(
        'bold 20px "Cascadia Code", "Cascadia Mono", Consolas, monospace::行列说明',
      );
      expect(fontHistory).toContain(
        '20px "Cascadia Code", "Cascadia Mono", Consolas, monospace::R1  H x 2 / HO x 1  3针',
      );
      expect(fontHistory).toContain(
        '20px "Cascadia Code", "Cascadia Mono", Consolas, monospace::R2  HO x 1  1针',
      );
    } finally {
      getContext.mockRestore();
      toDataURL.mockRestore();
    }
  });
});
