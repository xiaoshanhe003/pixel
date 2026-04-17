import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PixelGrid as PixelGridModel } from '../../types/pixel';
import PixelGrid from '../PixelGrid';

const defaultToolSettings = {
  paintSize: 1 as const,
  eraseSize: 1 as const,
  shapePreviewMode: 'outline' as const,
};

function createGrid(color: string | null = null): PixelGridModel {
  return {
    width: 16,
    height: 16,
    palette: color ? [color] : [],
    cells: Array.from({ length: 256 }, (_, index) => ({
      x: index % 16,
      y: Math.floor(index / 16),
      color,
      source: { r: 0, g: 0, b: 0 },
      alpha: color ? 255 : 0,
    })),
  };
}

describe('PixelGrid', () => {
  it('renders one cell per pixel with square dimensions', () => {
    render(<PixelGrid grid={createGrid('#000000')} toolSettings={defaultToolSettings} />);

    expect(
      screen.getByRole('grid', { name: /像素输出网格/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell')).toHaveLength(256);
  });

  it('renders transparent cells with a dedicated label', () => {
    const grid = createGrid('#000000');
    grid.cells[0] = {
      ...grid.cells[0],
      color: null,
      alpha: 0,
    };

    render(<PixelGrid grid={grid} toolSettings={defaultToolSettings} />);

    expect(screen.getByLabelText(/像素 0,0 透明/i)).toBeInTheDocument();
  });

  it('applies flat styling when grid lines are hidden', () => {
    const grid = createGrid('#000000');
    grid.cells[0] = {
      ...grid.cells[0],
      color: null,
      alpha: 0,
    };

    render(
      <PixelGrid
        grid={grid}
        showGrid={false}
        toolSettings={defaultToolSettings}
      />,
    );

    expect(screen.getByRole('grid', { name: /像素输出网格/i })).toHaveClass('pixel-grid--flat');
    expect(screen.getByLabelText(/像素 0,0 透明/i)).toHaveClass('pixel-cell--flat');
    expect(screen.getByLabelText(/像素 1,0 #000000/i)).toHaveClass('pixel-cell--flat');
  });

  it('lets the user paint a cell when editable', async () => {
    const user = userEvent.setup();
    const handlePaint = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="paint"
        toolSettings={defaultToolSettings}
        onPaintCell={handlePaint}
      />,
    );

    await user.click(screen.getByLabelText(/像素 0,0 透明/i));

    expect(handlePaint).toHaveBeenCalledWith(0, 0, '#ff00aa');
  });

  it('does not paint when move tool is active', async () => {
    const user = userEvent.setup();
    const handlePaint = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="move"
        toolSettings={defaultToolSettings}
        onPaintCell={handlePaint}
      />,
    );

    await user.click(screen.getByLabelText(/像素 0,0 透明/i));

    expect(handlePaint).not.toHaveBeenCalled();
  });

  it('pans the canvas internally on wheel input instead of relying on scrollbars', () => {
    render(
      <PixelGrid
        grid={createGrid()}
        editable
        tool="move"
        zoom={2}
        toolSettings={defaultToolSettings}
      />,
    );

    const viewport = screen
      .getByRole('grid', { name: /像素输出网格/i })
      .closest('.pixel-grid-viewport') as HTMLElement;
    const grid = screen.getByRole('grid', { name: /像素输出网格/i }) as HTMLElement;

    Object.defineProperty(viewport, 'clientWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 400,
    });

    fireEvent.wheel(viewport, { deltaX: 30, deltaY: 40 });

    expect(grid.style.transform).toContain('-30px');
    expect(grid.style.transform).toContain('-40px');
  });

  it('assigns explicit row and cell sizes when zoom changes', () => {
    render(
      <PixelGrid
        grid={createGrid()}
        editable
        tool="move"
        zoom={2}
        toolSettings={defaultToolSettings}
      />,
    );

    const grid = screen.getByRole('grid', { name: /像素输出网格/i }) as HTMLElement;
    const firstCell = screen.getByLabelText(/像素 0,0 透明/i) as HTMLElement;

    expect(grid.style.gridTemplateColumns).toContain('84px');
    expect(grid.style.gridTemplateRows).toContain('84px');
    expect(firstCell.style.width).toBe('84px');
    expect(firstCell.style.height).toBe('84px');
  });

  it('hides transparency texture when cells become too small', () => {
    render(
      <PixelGrid
        grid={createGrid()}
        editable
        zoom={0.02}
        toolSettings={defaultToolSettings}
      />,
    );

    expect(screen.getByRole('grid', { name: /像素输出网格/i })).toHaveClass(
      'pixel-grid--hide-transparency-texture',
    );
  });

  it('paints continuously while dragging across cells', () => {
    const handlePaint = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="paint"
        toolSettings={defaultToolSettings}
        onPaintCell={handlePaint}
      />,
    );

    const first = screen.getByLabelText(/像素 0,0 透明/i);
    const second = screen.getByLabelText(/像素 1,0 透明/i);

    fireEvent.pointerDown(first, { pointerId: 1 });
    fireEvent.pointerEnter(second, { pointerId: 1 });
    fireEvent.pointerUp(screen.getByRole('grid', { name: /像素输出网格/i }), {
      pointerId: 1,
    });

    expect(handlePaint).toHaveBeenNthCalledWith(1, 0, 0, '#ff00aa');
    expect(handlePaint).toHaveBeenNthCalledWith(2, 1, 0, '#ff00aa');
  });

  it('keeps painting after the pointer leaves and re-enters the stage mid-drag', () => {
    const handlePaint = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="paint"
        toolSettings={defaultToolSettings}
        onPaintCell={handlePaint}
      />,
    );

    const viewport = screen
      .getByRole('grid', { name: /像素输出网格/i })
      .closest('.pixel-grid-viewport');
    const first = screen.getByLabelText(/像素 0,0 透明/i);
    const second = screen.getByLabelText(/像素 1,0 透明/i);

    fireEvent.pointerDown(first, { pointerId: 12 });
    fireEvent.pointerLeave(viewport as HTMLElement, { pointerId: 12 });
    fireEvent.pointerEnter(second, { pointerId: 12 });
    fireEvent.pointerUp(window, { pointerId: 12 });

    expect(handlePaint).toHaveBeenNthCalledWith(1, 0, 0, '#ff00aa');
    expect(handlePaint).toHaveBeenNthCalledWith(2, 1, 0, '#ff00aa');
  });

  it('erases continuously while dragging across cells', () => {
    const handlePaint = vi.fn();

    render(
      <PixelGrid
        grid={createGrid('#000000')}
        editable
        tool="erase"
        toolSettings={defaultToolSettings}
        onPaintCell={handlePaint}
      />,
    );

    const first = screen.getByLabelText(/像素 0,0 #000000/i);
    const second = screen.getByLabelText(/像素 1,0 #000000/i);

    fireEvent.pointerDown(first, { pointerId: 2 });
    fireEvent.pointerEnter(second, { pointerId: 2 });
    fireEvent.pointerUp(screen.getByRole('grid', { name: /像素输出网格/i }), {
      pointerId: 2,
    });

    expect(handlePaint).toHaveBeenNthCalledWith(1, 0, 0, null);
    expect(handlePaint).toHaveBeenNthCalledWith(2, 1, 0, null);
  });

  it('does not show the floating tooltip while hovering in paint mode', () => {
    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="paint"
        toolSettings={{ ...defaultToolSettings, paintSize: 2 }}
      />,
    );

    fireEvent.pointerEnter(screen.getByLabelText(/像素 5,5 透明/i), { pointerId: 9 });

    expect(screen.queryByText(/预览画笔/i)).not.toBeInTheDocument();
  });

  it('delegates to fill behavior when fill tool is active', () => {
    const handleFill = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="fill"
        toolSettings={defaultToolSettings}
        onFillArea={handleFill}
      />,
    );

    fireEvent.pointerDown(screen.getByLabelText(/像素 0,0 透明/i), { pointerId: 3 });

    expect(handleFill).toHaveBeenCalledWith(0, 0, '#ff00aa');
  });

  it('uses a tool-specific cursor on the canvas viewport', () => {
    render(
      <PixelGrid
        grid={createGrid()}
        editable
        tool="fill"
        toolSettings={defaultToolSettings}
      />,
    );

    const viewport = screen
      .getByRole('grid', { name: /像素输出网格/i })
      .closest('.pixel-grid-viewport');

    expect(viewport).toHaveAttribute('data-active-tool', 'fill');
    expect((viewport as HTMLElement).style.cursor).toContain('data:image/svg+xml');
  });

  it('keeps the selected tool cursor while hovering editable cells', () => {
    render(
      <PixelGrid
        grid={createGrid()}
        editable
        tool="rectangle"
        toolSettings={defaultToolSettings}
      />,
    );

    expect(
      (screen.getByLabelText(/像素 0,0 透明/i) as HTMLElement).style.cursor,
    ).toContain('data:image/svg+xml');
  });

  it('delegates line drawing after a drag selection', () => {
    const handleDrawLine = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="line"
        toolSettings={defaultToolSettings}
        onDrawLine={handleDrawLine}
      />,
    );

    const first = screen.getByLabelText(/像素 0,0 透明/i);
    const last = screen.getByLabelText(/像素 2,2 透明/i);

    fireEvent.pointerDown(first, { pointerId: 4 });
    fireEvent.pointerEnter(last, { pointerId: 4 });
    fireEvent.pointerUp(last, { pointerId: 4 });

    expect(handleDrawLine).toHaveBeenCalledWith(0, 0, 2, 2, '#ff00aa');
  });

  it('delegates rectangle drawing after a drag selection', () => {
    const handleDrawRectangle = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="rectangle"
        toolSettings={defaultToolSettings}
        onDrawRectangle={handleDrawRectangle}
      />,
    );

    const first = screen.getByLabelText(/像素 1,1 透明/i);
    const last = screen.getByLabelText(/像素 3,3 透明/i);

    fireEvent.pointerDown(first, { pointerId: 5 });
    fireEvent.pointerEnter(last, { pointerId: 5 });
    fireEvent.pointerUp(last, { pointerId: 5 });

    expect(handleDrawRectangle).toHaveBeenCalledWith(1, 1, 3, 3, '#ff00aa');
  });

  it('shows a rectangle preview before pointer release', () => {
    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="rectangle"
        toolSettings={defaultToolSettings}
      />,
    );

    fireEvent.pointerDown(screen.getByLabelText(/像素 1,1 透明/i), { pointerId: 6 });
    fireEvent.pointerEnter(screen.getByLabelText(/像素 3,3 透明/i), { pointerId: 6 });

    expect(screen.getByLabelText(/预览矩形 1,1 到 3,3/i)).toBeInTheDocument();
  });
});
