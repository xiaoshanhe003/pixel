import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PixelGrid from '../PixelGrid';

describe('PixelGrid', () => {
  it('renders one cell per pixel with square dimensions', () => {
    render(
      <PixelGrid
        grid={{
          width: 16,
          height: 16,
          palette: ['#000000'],
          cells: Array.from({ length: 256 }, (_, index) => ({
            x: index % 16,
            y: Math.floor(index / 16),
            color: '#000000',
            source: { r: 0, g: 0, b: 0 },
            alpha: 255,
          })),
        }}
      />,
    );

    expect(
      screen.getByRole('grid', { name: /像素输出网格/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell')).toHaveLength(256);
  });

  it('renders transparent cells with a dedicated label', () => {
    render(
      <PixelGrid
        grid={{
          width: 16,
          height: 16,
          palette: ['#000000'],
          cells: Array.from({ length: 256 }, (_, index) => ({
            x: index % 16,
            y: Math.floor(index / 16),
            color: index === 0 ? null : '#000000',
            source: { r: 0, g: 0, b: 0 },
            alpha: index === 0 ? 0 : 255,
          })),
        }}
      />,
    );

    expect(screen.getByLabelText(/像素 0,0 透明/i)).toBeInTheDocument();
  });

  it('lets the user paint a cell when editable', async () => {
    const user = userEvent.setup();
    const handlePaint = vi.fn();

    render(
      <PixelGrid
        grid={{
          width: 16,
          height: 16,
          palette: [],
          cells: Array.from({ length: 256 }, (_, index) => ({
            x: index % 16,
            y: Math.floor(index / 16),
            color: null,
            source: { r: 0, g: 0, b: 0 },
            alpha: 0,
          })),
        }}
        editable
        activeColor="#ff00aa"
        tool="paint"
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
        grid={{
          width: 16,
          height: 16,
          palette: [],
          cells: Array.from({ length: 256 }, (_, index) => ({
            x: index % 16,
            y: Math.floor(index / 16),
            color: null,
            source: { r: 0, g: 0, b: 0 },
            alpha: 0,
          })),
        }}
        editable
        activeColor="#ff00aa"
        tool="move"
        onPaintCell={handlePaint}
      />,
    );

    await user.click(screen.getByLabelText(/像素 0,0 透明/i));

    expect(handlePaint).not.toHaveBeenCalled();
  });

  it('paints continuously while dragging across cells', () => {
    const handlePaint = vi.fn();

    render(
      <PixelGrid
        grid={{
          width: 16,
          height: 16,
          palette: [],
          cells: Array.from({ length: 256 }, (_, index) => ({
            x: index % 16,
            y: Math.floor(index / 16),
            color: null,
            source: { r: 0, g: 0, b: 0 },
            alpha: 0,
          })),
        }}
        editable
        activeColor="#ff00aa"
        tool="paint"
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

  it('erases continuously while dragging across cells', () => {
    const handlePaint = vi.fn();

    render(
      <PixelGrid
        grid={{
          width: 16,
          height: 16,
          palette: ['#000000'],
          cells: Array.from({ length: 256 }, (_, index) => ({
            x: index % 16,
            y: Math.floor(index / 16),
            color: '#000000',
            source: { r: 0, g: 0, b: 0 },
            alpha: 255,
          })),
        }}
        editable
        tool="erase"
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

  it('delegates to fill behavior when fill tool is active', () => {
    const handleFill = vi.fn();

    render(
      <PixelGrid
        grid={{
          width: 16,
          height: 16,
          palette: [],
          cells: Array.from({ length: 256 }, (_, index) => ({
            x: index % 16,
            y: Math.floor(index / 16),
            color: null,
            source: { r: 0, g: 0, b: 0 },
            alpha: 0,
          })),
        }}
        editable
        activeColor="#ff00aa"
        tool="fill"
        onFillArea={handleFill}
      />,
    );

    fireEvent.pointerDown(screen.getByLabelText(/像素 0,0 透明/i), { pointerId: 3 });

    expect(handleFill).toHaveBeenCalledWith(0, 0, '#ff00aa');
  });

  it('uses a tool-specific cursor on the canvas viewport', () => {
    render(
      <PixelGrid
        grid={{
          width: 16,
          height: 16,
          palette: [],
          cells: Array.from({ length: 256 }, (_, index) => ({
            x: index % 16,
            y: Math.floor(index / 16),
            color: null,
            source: { r: 0, g: 0, b: 0 },
            alpha: 0,
          })),
        }}
        editable
        tool="fill"
      />,
    );

    const viewport = screen
      .getByRole('grid', { name: /像素输出网格/i })
      .closest('.pixel-grid-viewport');

    expect(viewport).toHaveAttribute('data-active-tool', 'fill');
    expect((viewport as HTMLElement).style.cursor).toContain('data:image/svg+xml');
  });

  it('delegates line drawing after a drag selection', () => {
    const handleDrawLine = vi.fn();

    render(
      <PixelGrid
        grid={{
          width: 16,
          height: 16,
          palette: [],
          cells: Array.from({ length: 256 }, (_, index) => ({
            x: index % 16,
            y: Math.floor(index / 16),
            color: null,
            source: { r: 0, g: 0, b: 0 },
            alpha: 0,
          })),
        }}
        editable
        activeColor="#ff00aa"
        tool="line"
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
        grid={{
          width: 16,
          height: 16,
          palette: [],
          cells: Array.from({ length: 256 }, (_, index) => ({
            x: index % 16,
            y: Math.floor(index / 16),
            color: null,
            source: { r: 0, g: 0, b: 0 },
            alpha: 0,
          })),
        }}
        editable
        activeColor="#ff00aa"
        tool="rectangle"
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
});
