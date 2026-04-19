import { describe, expect, it } from 'vitest';
import { createStudioDocument } from './studio';
import {
  applyStudioCommandToHistory,
  createStudioHistoryState,
  undoStudioHistory,
} from './studioCommands';

describe('studioCommands history', () => {
  it('restores the previous document after undoing a paint command', () => {
    const initial = createStudioDocument('pixel', 16);
    const history = createStudioHistoryState(initial);
    const painted = applyStudioCommandToHistory(history, {
      type: 'paintCell',
      x: 0,
      y: 0,
      color: '#d65a31',
      size: 1,
    });

    expect(painted.present.frames[0]?.layers[0]?.cells[0]?.color).toBe('#d65a31');

    const undone = undoStudioHistory(painted);

    expect(undone.present.frames[0]?.layers[0]?.cells[0]?.color).toBeNull();
  });

  it('records bead cleanup remaps in history so they can be undone', () => {
    const initial = createStudioDocument('beads', 16);
    let history = createStudioHistoryState(initial);

    history = applyStudioCommandToHistory(history, {
      type: 'paintCell',
      x: 0,
      y: 0,
      color: '#000000',
      size: 1,
    });
    history = applyStudioCommandToHistory(history, {
      type: 'paintCell',
      x: 1,
      y: 0,
      color: '#000000',
      size: 1,
    });
    history = applyStudioCommandToHistory(history, {
      type: 'paintCell',
      x: 0,
      y: 1,
      color: '#000000',
      size: 1,
    });
    history = applyStudioCommandToHistory(history, {
      type: 'paintCell',
      x: 1,
      y: 1,
      color: '#000000',
      size: 1,
    });
    history = applyStudioCommandToHistory(history, {
      type: 'paintCell',
      x: 2,
      y: 0,
      color: '#166f41',
      size: 1,
    });

    const cleaned = applyStudioCommandToHistory(history, {
      type: 'remapBeadColors',
      brand: 'mard',
      replacements: [{ from: '#166f41', to: '#000000' }],
    });

    expect(cleaned.present.frames[0]?.layers[0]?.cells[2]?.color).toBe('#000000');

    const undone = undoStudioHistory(cleaned);

    expect(undone.present.frames[0]?.layers[0]?.cells[2]?.color).toBe('#166f41');
  });

  it('applies bead cleanup remaps to every visible unlocked layer in the active frame', () => {
    const initial = createStudioDocument('beads', 16);
    const frame = initial.frames[0]!;
    const primaryLayer = {
      ...frame.layers[0]!,
      cells: frame.layers[0]!.cells.map((cell, index) => {
        if ([0, 1, 16, 17].includes(index)) {
          return {
            ...cell,
            color: '#000000',
            source: { r: 0, g: 0, b: 0 },
            alpha: 255,
          };
        }

        if (index === 2) {
          return {
            ...cell,
            color: '#166f41',
            source: { r: 22, g: 111, b: 65 },
            alpha: 255,
          };
        }

        return { ...cell, source: { ...cell.source } };
      }),
    };
    const secondaryLayer = {
      ...frame.layers[0]!,
      id: 'layer-2',
      name: '图层 2',
      cells: frame.layers[0]!.cells.map((cell) => ({ ...cell, source: { ...cell.source } })),
    };
    const document = {
      ...initial,
      frames: [
        {
          ...frame,
          layers: [primaryLayer, secondaryLayer],
          activeLayerId: secondaryLayer.id,
        },
      ],
    };

    let history = createStudioHistoryState(document);

    const cleaned = applyStudioCommandToHistory(history, {
      type: 'remapBeadColors',
      brand: 'mard',
      replacements: [{ from: '#166f41', to: '#000000' }],
    });

    expect(cleaned.present.frames[0]?.layers[0]?.cells[2]?.color).toBe('#000000');
    expect(cleaned.present.frames[0]?.layers[1]?.cells[2]?.color).toBeNull();
  });
});
