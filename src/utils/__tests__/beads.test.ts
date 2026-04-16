import { describe, expect, it } from 'vitest';
import { mapGridToBeadPalette, countBeadUsage } from '../beads';
import { createBlankGrid, replaceCellColor } from '../studio';

describe('bead helpers', () => {
  it('maps source colors to the selected brand palette', () => {
    const base = createBlankGrid(16);
    const grid = {
      ...base,
      cells: base.cells.map((cell, index) =>
        index === 0
          ? {
              ...cell,
              color: '#c04040',
              source: { r: 192, g: 64, b: 64 },
              alpha: 255,
            }
          : cell,
      ),
    };

    const mapped = mapGridToBeadPalette(grid, 'perler');

    expect(mapped.cells[0].color).toBe('#c5423f');
  });

  it('counts mapped bead usage for the selected brand', () => {
    let grid = createBlankGrid(16);
    grid = replaceCellColor(grid, 0, 0, '#c5423f');
    grid = replaceCellColor(grid, 1, 0, '#c5423f');

    const usage = countBeadUsage(grid, 'perler');

    expect(usage[0]).toMatchObject({
      id: 'P03',
      name: 'Red',
      count: 2,
    });
  });
});
