import { describe, expect, it } from 'vitest';
import {
  buildBeadEditorPalette,
  buildBeadNoiseCleanupMap,
  countBeadUsage,
  mapGridToBeadPalette,
} from '../beads';
import { DEFAULT_16_COLOR_PALETTE } from '../../data/defaultPalettes';
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

  it('keeps the editor palette order stable when the active bead color changes', () => {
    const palette = buildBeadEditorPalette('mard', DEFAULT_16_COLOR_PALETTE, 16, '#166F41');

    expect(palette[0]).not.toBe('#166f41');
    expect(palette).toContain('#166f41');
  });

  it('avoids near-duplicate black swatches in the default mard editor palette', () => {
    const palette = buildBeadEditorPalette('mard', DEFAULT_16_COLOR_PALETTE, 16, '#000000');

    expect(palette).toContain('#000000');
    expect(palette).not.toContain('#1d1414');
  });

  it('builds cleanup replacements for bead colors that appear three times or less', () => {
    let grid = createBlankGrid(16);
    grid = replaceCellColor(grid, 0, 0, '#000000');
    grid = replaceCellColor(grid, 1, 0, '#000000');
    grid = replaceCellColor(grid, 0, 1, '#000000');
    grid = replaceCellColor(grid, 1, 1, '#000000');
    grid = replaceCellColor(grid, 2, 0, '#166f41');
    grid = replaceCellColor(grid, 3, 0, '#166f41');
    grid = replaceCellColor(grid, 2, 1, '#166f41');

    const replacements = buildBeadNoiseCleanupMap(grid);

    expect(replacements.get('#166f41')).toBe('#000000');
    expect(replacements.has('#000000')).toBe(false);
  });
});
