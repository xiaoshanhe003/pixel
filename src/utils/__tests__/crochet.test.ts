import { describe, expect, it } from 'vitest';
import { analyzeCrochetPattern } from '../crochet';
import { createBlankGrid, replaceCellColor } from '../studio';

describe('analyzeCrochetPattern', () => {
  it('builds a symbol legend and row instructions from the grid', () => {
    let grid = createBlankGrid(16);
    grid = replaceCellColor(grid, 0, 15, '#111111');
    grid = replaceCellColor(grid, 1, 15, '#111111');
    grid = replaceCellColor(grid, 2, 15, '#ff00aa');
    grid = replaceCellColor(grid, 0, 14, '#ff00aa');

    const analysis = analyzeCrochetPattern(grid);

    expect(analysis.legend).toEqual([
      { color: '#111111', symbol: 'A', count: 2 },
      { color: '#ff00aa', symbol: 'B', count: 2 },
    ]);
    expect(analysis.totalStitches).toBe(4);
    expect(analysis.rows[0]).toEqual({
      rowNumber: 1,
      stitchCount: 3,
      instructions: ['A x 2', 'B x 1'],
    });
    expect(analysis.rows[1]).toEqual({
      rowNumber: 2,
      stitchCount: 1,
      instructions: ['B x 1'],
    });
  });
});
