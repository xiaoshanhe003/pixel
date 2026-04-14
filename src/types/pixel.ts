export type RGB = {
  r: number;
  g: number;
  b: number;
};

export type PixelCell = {
  x: number;
  y: number;
  color: string | null;
  source: RGB;
  alpha: number;
};

export type GridSize = 16 | 32;

export type PaletteSize = 16 | 32;

export type ConversionOptions = {
  gridSize: GridSize;
  paletteSize: PaletteSize;
  dithering: boolean;
  cleanupNoise: boolean;
  preserveSilhouette: boolean;
  simplifyShapes: boolean;
  animeMode: boolean;
  fillFrame: boolean;
};

export type PixelGrid = {
  width: GridSize;
  height: GridSize;
  cells: PixelCell[];
  palette: string[];
};
