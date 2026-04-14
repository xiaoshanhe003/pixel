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
          })),
        }}
      />,
    );

    expect(
      screen.getByRole('grid', { name: /pixel output grid/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell')).toHaveLength(256);
  });
});
