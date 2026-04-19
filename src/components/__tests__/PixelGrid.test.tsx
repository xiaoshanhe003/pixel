import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GridSize, PixelGrid as PixelGridModel } from '../../types/pixel';
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

function createSizedGrid(
  width: GridSize,
  height: GridSize,
  color: string | null = null,
): PixelGridModel {
  return {
    width,
    height,
    palette: color ? [color] : [],
    cells: Array.from({ length: width * height }, (_, index) => ({
      x: index % width,
      y: Math.floor(index / width),
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

  it('adds bead grid markers in bead scenario', () => {
    render(
      <PixelGrid
        grid={createGrid('#000000')}
        scenario="beads"
        toolSettings={defaultToolSettings}
      />,
    );

    expect(screen.getByRole('grid', { name: /像素输出网格/i })).toHaveClass('pixel-grid--beads');
    expect(screen.getByLabelText(/像素 4,0 #000000/i)).toHaveAttribute('data-bead-col', '4');
    expect(screen.getByLabelText(/像素 0,9 #000000/i)).toHaveAttribute('data-bead-row', '9');
  });

  it('renders bead axis labels pinned to the top and left canvas edges in bead scenario', () => {
    render(
      <PixelGrid
        grid={createGrid('#000000')}
        scenario="beads"
        toolSettings={defaultToolSettings}
      />,
    );

    expect(document.querySelector('.pixel-grid-shell--beads')).toBeInTheDocument();
    expect(document.querySelector('.bead-axis-corner')).toBeInTheDocument();
    expect(document.querySelector('.bead-axis-track--top')).toBeInTheDocument();
    expect(document.querySelector('.bead-axis-track--left')).toBeInTheDocument();
    expect(document.querySelectorAll('.bead-axis-label--top')).toHaveLength(16);
    expect(document.querySelectorAll('.bead-axis-label--left')).toHaveLength(16);
    expect(document.querySelectorAll('.bead-axis-label--bottom')).toHaveLength(0);
    expect(document.querySelectorAll('.bead-axis-label--right')).toHaveLength(0);
  });

  it('uses one shared ruler interval based on the largest bead index width', () => {
    render(
      <PixelGrid
        grid={createSizedGrid(100, 100, '#000000')}
        scenario="beads"
        toolSettings={defaultToolSettings}
      />,
    );

    const topLabels = Array.from(document.querySelectorAll('.bead-axis-label--top')).map((label) =>
      Number(label.textContent),
    );
    const leftLabels = Array.from(document.querySelectorAll('.bead-axis-label--left')).map((label) =>
      Number(label.textContent),
    );

    expect(topLabels).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);
    expect(leftLabels).toEqual(topLabels);
  });

  it('keeps ruler numbering rhythm consistent when labels are thinned out', () => {
    render(
      <PixelGrid
        grid={createSizedGrid(64, 64, '#000000')}
        scenario="beads"
        zoom={1.25}
        toolSettings={defaultToolSettings}
      />,
    );

    const topLabels = Array.from(document.querySelectorAll('.bead-axis-label--top'))
      .slice(0, 6)
      .map((label) => Number(label.textContent));
    const leftLabels = Array.from(document.querySelectorAll('.bead-axis-label--left'))
      .slice(0, 6)
      .map((label) => Number(label.textContent));

    expect(topLabels).toEqual([2, 4, 6, 8, 10, 12]);
    expect(leftLabels).toEqual([2, 4, 6, 8, 10, 12]);
  });

  it('thins crochet ruler labels from the right and bottom edges inward', () => {
    render(
      <PixelGrid
        grid={createSizedGrid(50, 50, '#000000')}
        scenario="crochet"
        zoom={1}
        toolSettings={defaultToolSettings}
      />,
    );

    const topLabels = Array.from(document.querySelectorAll('.bead-axis-label--top')).map((label) =>
      Number(label.textContent),
    );
    const leftLabels = Array.from(document.querySelectorAll('.bead-axis-label--left')).map((label) =>
      Number(label.textContent),
    );

    expect(topLabels).toEqual([
      49, 47, 45, 43, 41, 39, 37, 35, 33, 31, 29, 27, 25,
      23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1,
    ]);
    expect(leftLabels).toEqual(topLabels);
  });

  it('lets thinned ruler labels occupy their full interval span', () => {
    render(
      <PixelGrid
        grid={createSizedGrid(64, 64, '#000000')}
        scenario="beads"
        zoom={0.08}
        toolSettings={defaultToolSettings}
      />,
    );

    const topLabel = Array.from(document.querySelectorAll('.bead-axis-label--top')).find(
      (label) => label.textContent === '20',
    ) as HTMLElement;
    const leftLabel = Array.from(document.querySelectorAll('.bead-axis-label--left')).find(
      (label) => label.textContent === '20',
    ) as HTMLElement;

    expect(topLabel.style.width).toBe('40px');
    expect(leftLabel.style.height).toBe('40px');
  });

  it('keeps bead axis rulers pinned while their labels move with the canvas grid', () => {
    render(
      <PixelGrid
        grid={createGrid('#000000')}
        scenario="beads"
        editable
        tool="move"
        zoom={2}
        toolSettings={defaultToolSettings}
      />,
    );

    const viewport = screen
      .getByRole('grid', { name: /像素输出网格/i })
      .closest('.pixel-grid-viewport') as HTMLElement;
    const frame = screen.getByRole('grid', { name: /像素输出网格/i }).parentElement as HTMLElement;
    const firstColumnLabel = document.querySelector('.bead-axis-label--top') as HTMLElement;
    const firstRowLabel = document.querySelector('.bead-axis-label--left') as HTMLElement;

    Object.defineProperty(viewport, 'clientWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 400,
    });

    fireEvent(window, new Event('resize'));

    const initialLeft = firstColumnLabel.style.left;
    const initialTop = firstColumnLabel.style.top;
    const initialRowTop = firstRowLabel.style.top;
    const initialFrameLeft = frame.style.left;
    const initialFrameTop = frame.style.top;

    fireEvent.wheel(viewport, { deltaX: 30, deltaY: 40 });

    expect(firstColumnLabel.style.left).not.toBe(initialLeft);
    expect(firstColumnLabel.style.top).toBe(initialTop);
    expect(firstRowLabel.style.top).not.toBe(initialRowTop);
    expect(Number.parseInt(frame.style.left, 10)).toBeLessThan(Number.parseInt(initialFrameLeft, 10));
    expect(Number.parseInt(frame.style.top, 10)).toBeLessThan(Number.parseInt(initialFrameTop, 10));
    expect(Number.parseInt(firstColumnLabel.style.left, 10)).toBeLessThan(Number.parseInt(initialLeft, 10));
    expect(Number.parseInt(firstRowLabel.style.top, 10)).toBeLessThan(Number.parseInt(initialRowTop, 10));
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
    const handleCommitPaintStroke = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="paint"
        toolSettings={defaultToolSettings}
        onCommitPaintStroke={handleCommitPaintStroke}
      />,
    );

    await user.click(screen.getByLabelText(/像素 0,0 透明/i));

    expect(handleCommitPaintStroke).toHaveBeenCalledWith([{ x: 0, y: 0 }], '#ff00aa');
  });

  it('fills skipped cells while dragging the brush across non-adjacent cells', () => {
    const handleCommitPaintStroke = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="paint"
        toolSettings={defaultToolSettings}
        onCommitPaintStroke={handleCommitPaintStroke}
      />,
    );

    const viewport = screen
      .getByRole('grid', { name: /像素输出网格/i })
      .closest('.pixel-grid-viewport') as HTMLElement;
    const firstCell = screen.getByLabelText(/像素 0,0 透明/i);
    const fourthCell = screen.getByLabelText(/像素 3,0 透明/i);

    fireEvent.pointerDown(firstCell, {
      pointerId: 7,
      clientX: 12,
      clientY: 12,
    });
    fireEvent.pointerEnter(fourthCell, { pointerId: 7, clientX: 12, clientY: 12 });
    fireEvent.pointerUp(viewport, { pointerId: 7 });

    expect(handleCommitPaintStroke).toHaveBeenCalledWith(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
      '#ff00aa',
    );
  });

  it('does not paint when move tool is active', async () => {
    const user = userEvent.setup();
    const handleCommitPaintStroke = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="move"
        toolSettings={defaultToolSettings}
        onCommitPaintStroke={handleCommitPaintStroke}
      />,
    );

    await user.click(screen.getByLabelText(/像素 0,0 透明/i));

    expect(handleCommitPaintStroke).not.toHaveBeenCalled();
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
    const frame = grid.parentElement as HTMLElement;

    Object.defineProperty(viewport, 'clientWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 400,
    });

    fireEvent(window, new Event('resize'));
    fireEvent.wheel(viewport, { deltaX: 30, deltaY: 40 });

    expect(frame.style.left).toBe('-510px');
    expect(frame.style.top).toBe('-520px');
  });

  it('starts panning from a grid cell when the move tool is active', () => {
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
    const frame = grid.parentElement as HTMLElement;
    const firstCell = screen.getByLabelText(/像素 0,0 透明/i);

    Object.defineProperty(viewport, 'clientWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 400,
    });

    fireEvent(window, new Event('resize'));
    fireEvent.pointerDown(firstCell, { pointerId: 7, clientX: 120, clientY: 120 });
    fireEvent.pointerMove(viewport, { pointerId: 7, clientX: 170, clientY: 150 });
    fireEvent.pointerUp(viewport, { pointerId: 7 });

    expect(frame.style.left).toBe('-480px');
    expect(frame.style.top).toBe('-480px');
  });

  it('keeps a small gutter visible when panning an oversized canvas to the edge', () => {
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
    const frame = grid.parentElement as HTMLElement;

    Object.defineProperty(viewport, 'clientWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 400,
    });

    fireEvent(window, new Event('resize'));
    fireEvent.wheel(viewport, { deltaX: -5000, deltaY: -5000 });

    expect(frame.style.left).toBe('96px');
    expect(frame.style.top).toBe('96px');
  });

  it('centers smaller grids horizontally and keeps a fixed top safe margin', () => {
    render(
      <PixelGrid
        grid={createGrid()}
        zoom={0.5}
        toolSettings={defaultToolSettings}
      />,
    );

    const viewport = screen
      .getByRole('grid', { name: /像素输出网格/i })
      .closest('.pixel-grid-viewport') as HTMLElement;
    const grid = screen.getByRole('grid', { name: /像素输出网格/i }) as HTMLElement;
    const frame = grid.parentElement as HTMLElement;

    Object.defineProperty(viewport, 'clientWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 400,
    });

    fireEvent(window, new Event('resize'));

    expect(frame.style.left).toBe('24px');
    expect(frame.style.top).toBe('24px');
  });

  it('snaps the default offsets to whole pixels so grid lines stay crisp', () => {
    render(
      <PixelGrid
        grid={createGrid()}
        zoom={0.5}
        toolSettings={defaultToolSettings}
      />,
    );

    const viewport = screen
      .getByRole('grid', { name: /像素输出网格/i })
      .closest('.pixel-grid-viewport') as HTMLElement;
    const grid = screen.getByRole('grid', { name: /像素输出网格/i }) as HTMLElement;
    const frame = grid.parentElement as HTMLElement;

    Object.defineProperty(viewport, 'clientWidth', {
      configurable: true,
      value: 401,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 401,
    });

    fireEvent(window, new Event('resize'));

    expect(frame.style.left).toBe('24px');
    expect(frame.style.top).toBe('24px');
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
    expect(firstCell.style.width).toBe('100%');
    expect(firstCell.style.height).toBe('100%');
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

    expect(screen.getByRole('grid', { name: /像素输出网格/i }).parentElement).toHaveClass(
      'pixel-grid--hide-transparency-texture',
    );
  });

  it('paints continuously while dragging across cells', () => {
    const handlePreviewPaintStroke = vi.fn();
    const handleCommitPaintStroke = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="paint"
        toolSettings={defaultToolSettings}
        onPreviewPaintStroke={handlePreviewPaintStroke}
        onCommitPaintStroke={handleCommitPaintStroke}
      />,
    );

    const first = screen.getByLabelText(/像素 0,0 透明/i);
    const second = screen.getByLabelText(/像素 1,0 透明/i);

    fireEvent.pointerDown(first, { pointerId: 1 });
    fireEvent.pointerEnter(second, { pointerId: 1 });

    expect(handlePreviewPaintStroke).not.toHaveBeenCalled();
    expect(first.querySelector('.pixel-cell__preview')).toBeInTheDocument();
    expect(second.querySelector('.pixel-cell__preview')).toBeInTheDocument();

    fireEvent.pointerUp(screen.getByRole('grid', { name: /像素输出网格/i }), {
      pointerId: 1,
    });

    expect(handleCommitPaintStroke).toHaveBeenCalledWith(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      '#ff00aa',
    );
  });

  it('keeps painting after the pointer leaves and re-enters the stage mid-drag', () => {
    const handlePreviewPaintStroke = vi.fn();
    const handleCommitPaintStroke = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        activeColor="#ff00aa"
        tool="paint"
        toolSettings={defaultToolSettings}
        onPreviewPaintStroke={handlePreviewPaintStroke}
        onCommitPaintStroke={handleCommitPaintStroke}
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

    expect(handlePreviewPaintStroke).not.toHaveBeenCalled();
    expect(first.querySelector('.pixel-cell__preview')).toBeInTheDocument();
    expect(second.querySelector('.pixel-cell__preview')).toBeInTheDocument();

    fireEvent.pointerUp(window, { pointerId: 12 });

    expect(handleCommitPaintStroke).toHaveBeenCalledWith(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      '#ff00aa',
    );
  });

  it('erases continuously while dragging across cells', () => {
    const handlePreviewPaintStroke = vi.fn();
    const handleCommitPaintStroke = vi.fn();

    render(
      <PixelGrid
        grid={createGrid('#000000')}
        editable
        tool="erase"
        toolSettings={defaultToolSettings}
        onPreviewPaintStroke={handlePreviewPaintStroke}
        onCommitPaintStroke={handleCommitPaintStroke}
      />,
    );

    const first = screen.getByLabelText(/像素 0,0 #000000/i);
    const second = screen.getByLabelText(/像素 1,0 #000000/i);

    fireEvent.pointerDown(first, { pointerId: 2 });
    fireEvent.pointerEnter(second, { pointerId: 2 });

    expect(handlePreviewPaintStroke).not.toHaveBeenCalled();
    expect(first.querySelector('.pixel-cell__preview')).toBeInTheDocument();
    expect(second.querySelector('.pixel-cell__preview')).toBeInTheDocument();

    fireEvent.pointerUp(screen.getByRole('grid', { name: /像素输出网格/i }), {
      pointerId: 2,
    });

    expect(handleCommitPaintStroke).toHaveBeenCalledWith(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      null,
    );
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
    expect((viewport as HTMLElement).style.cursor).toContain('%23ffffff');
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

  it('creates a marquee selection while dragging in select mode', () => {
    const handleSelectionChange = vi.fn();

    render(
      <PixelGrid
        grid={createGrid()}
        editable
        tool="select"
        toolSettings={defaultToolSettings}
        onSelectionChange={handleSelectionChange}
      />,
    );

    fireEvent.pointerDown(screen.getByLabelText(/像素 1,1 透明/i), { pointerId: 8 });
    fireEvent.pointerEnter(screen.getByLabelText(/像素 3,2 透明/i), { pointerId: 8 });
    fireEvent.pointerUp(screen.getByLabelText(/像素 3,2 透明/i), { pointerId: 8 });

    expect(handleSelectionChange).toHaveBeenLastCalledWith({
      minX: 1,
      minY: 1,
      maxX: 3,
      maxY: 2,
      width: 3,
      height: 2,
    });
  });

  it('delegates moving the current selection', () => {
    const handlePreviewMoveSelection = vi.fn();
    const handleCommitMoveSelection = vi.fn();

    render(
      <PixelGrid
        grid={createGrid('#000000')}
        editable
        tool="select"
        toolSettings={defaultToolSettings}
        selectionBounds={{ minX: 1, minY: 1, maxX: 2, maxY: 2, width: 2, height: 2 }}
        onPreviewMoveSelection={handlePreviewMoveSelection}
        onCommitMoveSelection={handleCommitMoveSelection}
      />,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: /移动选区/i }), {
      pointerId: 10,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(screen.getByLabelText(/像素 3,2 #000000/i), { pointerId: 10 });
    fireEvent.pointerUp(screen.getByLabelText(/像素 3,2 #000000/i), { pointerId: 10 });

    expect(handlePreviewMoveSelection).toHaveBeenCalledWith(2, 1);
    expect(handleCommitMoveSelection).toHaveBeenCalledWith(2, 1);
  });
});
