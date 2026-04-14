import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
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
});
