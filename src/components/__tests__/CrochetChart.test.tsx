import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import CrochetChart from '../CrochetChart';
import type { GridSize, PixelGrid } from '../../types/pixel';

const defaultToolSettings = {
  paintSize: 1 as const,
  eraseSize: 1 as const,
  shapePreviewMode: 'outline' as const,
};

function createGrid(width: GridSize, height: GridSize): PixelGrid {
  return {
    width,
    height,
    palette: ['#000000'],
    cells: Array.from({ length: width * height }, (_, index) => ({
      x: index % width,
      y: Math.floor(index / width),
      color: '#000000',
      source: { r: 0, g: 0, b: 0 },
      alpha: 255,
    })),
  };
}

describe('CrochetChart', () => {
  it('renders ruler labels right to left and bottom to top', () => {
    render(
      <CrochetChart
        grid={createGrid(16, 16)}
        viewMode="color"
        symbolByColor={new Map([['#000000', 'H']])}
        toolSettings={defaultToolSettings}
      />,
    );

    const columnLabels = Array.from(
      document.querySelectorAll('.crochet-chart__columns .crochet-chart__index'),
    ).map((label) => label.textContent);
    const rowLabels = Array.from(
      document.querySelectorAll('.crochet-chart__rows .crochet-chart__index'),
    ).map((label) => label.textContent);

    expect(columnLabels.slice(0, 4)).toEqual(['16', '15', '14', '13']);
    expect(columnLabels.at(-1)).toBe('1');
    expect(rowLabels.slice(0, 4)).toEqual(['16', '15', '14', '13']);
    expect(rowLabels.at(-1)).toBe('1');
  });
});
