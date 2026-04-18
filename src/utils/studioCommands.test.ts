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
});
