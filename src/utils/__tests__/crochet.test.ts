import { describe, expect, it } from 'vitest';
import { analyzeCrochetPattern } from '../crochet';
import { createBlankGrid, replaceCellColor } from '../studio';

describe('analyzeCrochetPattern', () => {
  it('builds a mark legend and row instructions from the grid', () => {
    let grid = createBlankGrid(16);
    grid = replaceCellColor(grid, 0, 15, '#111111');
    grid = replaceCellColor(grid, 1, 15, '#111111');
    grid = replaceCellColor(grid, 2, 15, '#ff00aa');
    grid = replaceCellColor(grid, 0, 14, '#ff00aa');

    const analysis = analyzeCrochetPattern(grid);

    expect(analysis.legend).toEqual([
      { color: '#111111', symbol: 'A', mark: 'H', colorName: '黑', count: 2 },
      { color: '#ff00aa', symbol: 'B', mark: 'F', colorName: '粉', count: 2 },
    ]);
    expect(analysis.totalStitches).toBe(4);
    expect(analysis.rows[0]).toEqual({
      rowNumber: 1,
      stitchCount: 3,
      instructions: ['H x 2', 'F x 1'],
    });
    expect(analysis.rows[1]).toEqual({
      rowNumber: 2,
      stitchCount: 1,
      instructions: ['F x 1'],
    });
  });

  it('expands pinyin prefixes when color-name initials collide', () => {
    let grid = createBlankGrid(16);
    grid = replaceCellColor(grid, 0, 15, '#ff0000');
    grid = replaceCellColor(grid, 1, 15, '#000000');
    grid = replaceCellColor(grid, 2, 15, '#808080');

    const analysis = analyzeCrochetPattern(grid);

    expect(analysis.legend.map((item) => ({
      colorName: item.colorName,
      mark: item.mark,
    }))).toEqual([
      { colorName: '红', mark: 'H' },
      { colorName: '黑', mark: 'HE' },
      { colorName: '灰', mark: 'HU' },
    ]);
  });

  it('keeps distinct shades with the same color name as separate legend entries', () => {
    let grid = createBlankGrid(16);
    grid = replaceCellColor(grid, 0, 15, '#00aa00');
    grid = replaceCellColor(grid, 1, 15, '#00aa00');
    grid = replaceCellColor(grid, 2, 15, '#00cc44');

    const analysis = analyzeCrochetPattern(grid);

    expect(analysis.legend.map((item) => ({
      color: item.color,
      colorName: item.colorName,
      count: item.count,
      mark: item.mark,
    }))).toEqual([
      { color: '#00aa00', colorName: '绿', count: 2, mark: 'L' },
      { color: '#00cc44', colorName: '绿', count: 1, mark: 'LV' },
    ]);
    expect(analysis.rows[0]?.instructions).toEqual(['L x 2', 'LV x 1']);
  });
});
