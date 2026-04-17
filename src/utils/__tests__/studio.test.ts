import { describe, expect, it } from 'vitest';
import {
  addLayerToActiveFrame,
  composeFrame,
  createBlankGrid,
  createStudioDocument,
  deleteActiveLayer,
  drawLine,
  drawLineOnActiveLayer,
  drawRectangle,
  drawRectangleOnActiveLayer,
  fillActiveLayerArea,
  fillCellArea,
  mergeActiveLayerDown,
  measureLayerContentBounds,
  moveActiveLayerSelection,
  replaceActiveLayerCell,
  replaceCellColor,
  scaleActiveLayerSelection,
  setActiveLayer,
  toggleLayerVisibility,
} from '../studio';

describe('studio grid helpers', () => {
  it('creates a square blank grid with a transparent palette-safe canvas', () => {
    const grid = createBlankGrid(16);

    expect(grid.width).toBe(16);
    expect(grid.height).toBe(16);
    expect(grid.cells).toHaveLength(256);
    expect(grid.palette).toEqual([]);
  });

  it('updates one cell and syncs palette membership', () => {
    const grid = createBlankGrid(16);
    const next = replaceCellColor(grid, 0, 0, '#112233');

    expect(next.cells[0].color).toBe('#112233');
    expect(next.palette).toContain('#112233');
  });

  it('fills only the contiguous area of matching cells', () => {
    let grid = createBlankGrid(16);
    grid = replaceCellColor(grid, 0, 0, '#111111');
    grid = replaceCellColor(grid, 1, 0, '#111111');
    grid = replaceCellColor(grid, 3, 0, '#111111');

    const next = fillCellArea(grid, 0, 0, '#ff00aa');

    expect(next.cells[0].color).toBe('#ff00aa');
    expect(next.cells[1].color).toBe('#ff00aa');
    expect(next.cells[3].color).toBe('#111111');
  });

  it('draws a diagonal line across the grid', () => {
    const grid = drawLine(createBlankGrid(16), 0, 0, 3, 3, '#ff00aa');

    expect(grid.cells[0].color).toBe('#ff00aa');
    expect(grid.cells[17].color).toBe('#ff00aa');
    expect(grid.cells[34].color).toBe('#ff00aa');
    expect(grid.cells[51].color).toBe('#ff00aa');
  });

  it('draws a rectangle outline across the selected bounds', () => {
    const grid = drawRectangle(createBlankGrid(16), 1, 1, 3, 3, '#ff00aa');

    expect(grid.cells[17].color).toBe('#ff00aa');
    expect(grid.cells[18].color).toBe('#ff00aa');
    expect(grid.cells[19].color).toBe('#ff00aa');
    expect(grid.cells[34].color).toBeNull();
    expect(grid.cells[35].color).toBe('#ff00aa');
    expect(grid.cells[51].color).toBe('#ff00aa');
  });

  it('composes the top visible layer into a frame preview', () => {
    let document = createStudioDocument('pixel', 16);
    document = replaceActiveLayerCell(document, 0, 0, '#111111');
    document = addLayerToActiveFrame(document);
    document = replaceActiveLayerCell(document, 0, 0, '#ff00aa');

    const preview = composeFrame(document.frames[0], document.width, document.height);

    expect(preview.cells[0].color).toBe('#ff00aa');
  });

  it('falls back to lower layers when the upper layer is hidden', () => {
    let document = createStudioDocument('pixel', 16);
    document = replaceActiveLayerCell(document, 0, 0, '#111111');
    document = addLayerToActiveFrame(document);
    document = replaceActiveLayerCell(document, 0, 0, '#ff00aa');
    document = toggleLayerVisibility(document, document.frames[0].activeLayerId);

    const preview = composeFrame(document.frames[0], document.width, document.height);

    expect(preview.cells[0].color).toBe('#111111');
  });

  it('fills the active layer inside the current document', () => {
    let document = createStudioDocument('pixel', 16);
    document = replaceActiveLayerCell(document, 0, 0, '#111111');
    document = replaceActiveLayerCell(document, 1, 0, '#111111');
    document = fillActiveLayerArea(document, 0, 0, '#ff00aa');

    const preview = composeFrame(document.frames[0], document.width, document.height);

    expect(preview.cells[0].color).toBe('#ff00aa');
    expect(preview.cells[1].color).toBe('#ff00aa');
  });

  it('deletes the active layer and selects a remaining layer', () => {
    let document = createStudioDocument('pixel', 16);
    document = addLayerToActiveFrame(document);

    const next = deleteActiveLayer(document);

    expect(next.frames[0].layers).toHaveLength(1);
    expect(next.frames[0].activeLayerId).toBe(next.frames[0].layers[0].id);
  });

  it('merges the active layer into the lower layer', () => {
    let document = createStudioDocument('pixel', 16);
    document = replaceActiveLayerCell(document, 0, 0, '#111111');
    document = addLayerToActiveFrame(document);
    document = replaceActiveLayerCell(document, 1, 0, '#ff00aa');

    const next = mergeActiveLayerDown(document);
    const preview = composeFrame(next.frames[0], next.width, next.height);

    expect(next.frames[0].layers).toHaveLength(1);
    expect(preview.cells[0].color).toBe('#111111');
    expect(preview.cells[1].color).toBe('#ff00aa');
  });

  it('merges a specific layer into the lower layer by id', () => {
    let document = createStudioDocument('pixel', 16);
    document = replaceActiveLayerCell(document, 0, 0, '#111111');
    document = addLayerToActiveFrame(document);
    document = replaceActiveLayerCell(document, 1, 0, '#ff00aa');

    const topLayerId = document.frames[0].activeLayerId;
    document = setActiveLayer(document, document.frames[0].layers[1].id);

    const next = mergeActiveLayerDown(document, topLayerId);
    const preview = composeFrame(next.frames[0], next.width, next.height);

    expect(next.frames[0].layers).toHaveLength(1);
    expect(preview.cells[0].color).toBe('#111111');
    expect(preview.cells[1].color).toBe('#ff00aa');
  });

  it('draws a line into the active layer inside the current document', () => {
    const document = drawLineOnActiveLayer(
      createStudioDocument('pixel', 16),
      0,
      0,
      2,
      0,
      '#ff00aa',
    );

    const preview = composeFrame(document.frames[0], document.width, document.height);

    expect(preview.cells[0].color).toBe('#ff00aa');
    expect(preview.cells[1].color).toBe('#ff00aa');
    expect(preview.cells[2].color).toBe('#ff00aa');
  });

  it('draws a rectangle into the active layer inside the current document', () => {
    const document = drawRectangleOnActiveLayer(
      createStudioDocument('pixel', 16),
      0,
      0,
      2,
      2,
      '#ff00aa',
    );

    const preview = composeFrame(document.frames[0], document.width, document.height);

    expect(preview.cells[0].color).toBe('#ff00aa');
    expect(preview.cells[1].color).toBe('#ff00aa');
    expect(preview.cells[2].color).toBe('#ff00aa');
    expect(preview.cells[17].color).toBeNull();
    expect(preview.cells[34].color).toBe('#ff00aa');
  });

  it('measures the non-transparent bounds of a layer', () => {
    let document = createStudioDocument('pixel', 16);
    document = replaceActiveLayerCell(document, 2, 3, '#111111');
    document = replaceActiveLayerCell(document, 4, 6, '#ff00aa');

    const bounds = measureLayerContentBounds(
      document.frames[0].layers[0].cells,
      document.width,
      document.height,
    );

    expect(bounds).toEqual({
      minX: 2,
      minY: 3,
      maxX: 4,
      maxY: 6,
      width: 3,
      height: 4,
    });
  });

  it('scales the active layer selection using nearest-neighbor sampling', () => {
    let document = createStudioDocument('pixel', 16);
    document = replaceActiveLayerCell(document, 0, 0, '#111111');
    document = replaceActiveLayerCell(document, 1, 0, '#ff00aa');
    document = replaceActiveLayerCell(document, 0, 1, '#00ffaa');
    document = replaceActiveLayerCell(document, 1, 1, '#3366ff');

    const next = scaleActiveLayerSelection(
      document,
      { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 2, height: 2 },
      4,
      4,
    );
    const preview = composeFrame(next.frames[0], next.width, next.height);

    expect(preview.cells[0].color).toBe('#111111');
    expect(preview.cells[1].color).toBe('#111111');
    expect(preview.cells[2].color).toBe('#ff00aa');
    expect(preview.cells[16].color).toBe('#111111');
    expect(preview.cells[17].color).toBe('#111111');
    expect(preview.cells[18].color).toBe('#ff00aa');
    expect(preview.cells[32].color).toBe('#00ffaa');
    expect(preview.cells[34].color).toBe('#3366ff');
  });

  it('moves the active layer selection by an offset', () => {
    let document = createStudioDocument('pixel', 16);
    document = replaceActiveLayerCell(document, 1, 1, '#111111');
    document = replaceActiveLayerCell(document, 2, 1, '#ff00aa');

    const next = moveActiveLayerSelection(
      document,
      { minX: 1, minY: 1, maxX: 2, maxY: 1, width: 2, height: 1 },
      2,
      1,
    );
    const preview = composeFrame(next.frames[0], next.width, next.height);

    expect(preview.cells[17].color).toBeNull();
    expect(preview.cells[18].color).toBeNull();
    expect(preview.cells[35].color).toBe('#111111');
    expect(preview.cells[36].color).toBe('#ff00aa');
  });
});
