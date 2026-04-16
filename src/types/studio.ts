import type { GridSize, PixelCell } from './pixel';

export type ScenarioId = 'pixel' | 'beads' | 'crochet';

export type EditorTool =
  | 'paint'
  | 'erase'
  | 'fill'
  | 'line'
  | 'rectangle'
  | 'sample'
  | 'move';

export type ShapePreviewMode = 'outline';

export type EditorToolSettings = {
  paintSize: 1 | 2 | 3 | 4;
  eraseSize: 1 | 2 | 3 | 4;
  shapePreviewMode: ShapePreviewMode;
};

export type StudioLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  cells: PixelCell[];
};

export type StudioFrame = {
  id: string;
  name: string;
  layers: StudioLayer[];
  activeLayerId: string;
};

export type StudioDocument = {
  scenario: ScenarioId;
  width: GridSize;
  height: GridSize;
  frames: StudioFrame[];
  activeFrameId: string;
};

export type ScenarioDefinition = {
  id: ScenarioId;
  label: string;
  exports: string[];
};
