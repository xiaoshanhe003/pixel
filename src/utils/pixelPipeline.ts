import { DEFAULT_PALETTES } from '../data/defaultPalettes';
import type { ConversionOptions, PixelCell, PixelGrid, RGB } from '../types/pixel';
import {
  clampByte,
  colorDistance,
  findNearestPaletteMatch,
  getPerceivedLuminance,
  getRgbSaturation,
  hexToRgb,
  rgbToHex,
  shiftRgb,
} from './color';
import {
  estimateEdgeBackgroundColor,
  fitImageDataContain,
  fitImageDataCover,
  resizeImageDataBilinear,
  trimSolidBackgroundBounds,
  trimTransparentBounds,
} from './image';

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

const DEFAULT_DITHER_STRENGTH = 16;

export type CleanupOptions = {
  preserveSilhouette?: boolean;
  minimumNeighborAgreement?: number;
};

type SampledCell = {
  source: RGB;
  alpha: number;
  color: string | null;
};

const TRANSPARENT_ALPHA_THRESHOLD = 24;
const CLUSTER_MERGE_CONTRAST_THRESHOLD = 0.03;
const FEATURE_LUMINANCE_THRESHOLD = 52;
const FEATURE_WEIGHT_AVERAGE_THRESHOLD = 0.028;
const FEATURE_WEIGHT_PEAK_THRESHOLD = 0.05;
const LOWER_BODY_FEATURE_START = 0.58;
const OUTLINE_ARTIFACT_LUMINANCE_THRESHOLD = 42;
const ANIME_LINE_ARTIFACT_LUMINANCE_THRESHOLD = 58;

type ColorGrid = Array<Array<string | null>>;
type FeatureGrid = number[][];
type ClusterPixel = { x: number; y: number };
type Cluster = {
  color: string;
  pixels: ClusterPixel[];
  touchesTransparency: boolean;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

function getPaletteForOptions(options: Pick<ConversionOptions, 'paletteSize'>): readonly string[] {
  return DEFAULT_PALETTES[options.paletteSize];
}

function readRgbAt(imageData: ImageData, x: number, y: number): RGB {
  const index = (y * imageData.width + x) * 4;

  return {
    r: imageData.data[index] ?? 0,
    g: imageData.data[index + 1] ?? 0,
    b: imageData.data[index + 2] ?? 0,
  };
}

function readAlphaAt(imageData: ImageData, x: number, y: number): number {
  const index = (y * imageData.width + x) * 4;

  return imageData.data[index + 3] ?? 255;
}

function sampleImageData(
  imageData: ImageData,
  gridSize: number,
  fillFrame: boolean,
): SampledCell[][] {
  const transparentTrimmed = trimTransparentBounds(imageData, TRANSPARENT_ALPHA_THRESHOLD);
  const baseImage =
    transparentTrimmed.width === imageData.width &&
    transparentTrimmed.height === imageData.height
      ? trimSolidBackgroundBounds(
          imageData,
          estimateEdgeBackgroundColor(imageData),
        )
      : transparentTrimmed;
  const padding = fillFrame
    ? Math.max(0, Math.round(gridSize * 0.03))
    : Math.max(1, Math.round(gridSize * 0.08));
  const source =
    baseImage.width === gridSize && baseImage.height === gridSize
      ? baseImage
      : fillFrame
        ? fitImageDataCover(baseImage, gridSize, gridSize, padding)
        : fitImageDataContain(baseImage, gridSize, gridSize, padding);

  return Array.from({ length: gridSize }, (_, y) =>
    Array.from({ length: gridSize }, (_, x) => {
      const sourceRgb = readRgbAt(source, x, y);
      const alpha = readAlphaAt(source, x, y);

      return {
        source: sourceRgb,
        alpha,
        color: null,
      };
    })
  );
}

function getDitherBias(x: number, y: number): number {
  return (BAYER_4X4[y % 4][x % 4] + 0.5) / 16 - 0.5;
}

function getAdaptiveDitherStrength(source: RGB): number {
  const luminance = getPerceivedLuminance(source);
  const saturation = getRgbSaturation(source);

  if (luminance > 230) {
    return 4;
  }

  if (saturation < 0.12) {
    return 6;
  }

  return DEFAULT_DITHER_STRENGTH;
}

type WeightedColor = {
  rgb: RGB;
  count: number;
};

type ColorBucket = {
  colors: WeightedColor[];
};

function getChannelRange(colors: WeightedColor[], channel: keyof RGB): number {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const color of colors) {
    const value = color.rgb[channel];
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  return max - min;
}

function getDominantChannel(colors: WeightedColor[]): keyof RGB {
  const channels: (keyof RGB)[] = ['r', 'g', 'b'];

  return channels.reduce((best, candidate) =>
    getChannelRange(colors, candidate) > getChannelRange(colors, best) ? candidate : best,
  );
}

function averageBucket(colors: WeightedColor[]): RGB {
  let totalWeight = 0;
  let r = 0;
  let g = 0;
  let b = 0;

  for (const color of colors) {
    totalWeight += color.count;
    r += color.rgb.r * color.count;
    g += color.rgb.g * color.count;
    b += color.rgb.b * color.count;
  }

  if (totalWeight === 0) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: clampByte(r / totalWeight),
    g: clampByte(g / totalWeight),
    b: clampByte(b / totalWeight),
  };
}

function splitBucket(bucket: ColorBucket): ColorBucket[] {
  if (bucket.colors.length <= 1) {
    return [bucket];
  }

  const channel = getDominantChannel(bucket.colors);
  const sorted = [...bucket.colors].sort((left, right) => left.rgb[channel] - right.rgb[channel]);
  const totalWeight = sorted.reduce((sum, color) => sum + color.count, 0);
  let runningWeight = 0;
  let splitIndex = 1;

  for (let index = 0; index < sorted.length; index += 1) {
    runningWeight += sorted[index].count;

    if (runningWeight >= totalWeight / 2) {
      splitIndex = Math.min(sorted.length - 1, index + 1);
      break;
    }
  }

  return [
    { colors: sorted.slice(0, splitIndex) },
    { colors: sorted.slice(splitIndex) },
  ].filter((candidate) => candidate.colors.length > 0);
}

function generateAdaptivePalette(
  sampledCells: SampledCell[][],
  paletteSize: ConversionOptions['paletteSize'],
): string[] {
  const counts = new Map<string, WeightedColor>();

  for (const row of sampledCells) {
    for (const cell of row) {
      if (cell.alpha < TRANSPARENT_ALPHA_THRESHOLD) {
        continue;
      }

      const key = rgbToHex(cell.source);
      const existing = counts.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { rgb: cell.source, count: 1 });
      }
    }
  }

  if (counts.size === 0) {
    return [];
  }

  let buckets: ColorBucket[] = [{ colors: [...counts.values()] }];

  while (buckets.length < paletteSize) {
    const nextBucketIndex = buckets.findIndex((bucket) => bucket.colors.length > 1);

    if (nextBucketIndex === -1) {
      break;
    }

    const [bucket] = buckets.splice(nextBucketIndex, 1);
    buckets = [...buckets, ...splitBucket(bucket)];
  }

  const palette = buckets.map((bucket) => averageBucket(bucket.colors)).map(rgbToHex);
  const fallbackPalette = [...getPaletteForOptions({ paletteSize })];

  for (const color of fallbackPalette) {
    if (palette.length >= paletteSize) {
      break;
    }

    if (!palette.includes(color)) {
      palette.push(color);
    }
  }

  return palette;
}

function quantizeSample(
  source: RGB,
  alpha: number,
  palette: readonly string[],
  x: number,
  y: number,
  dithering: boolean
): string | null {
  if (alpha < TRANSPARENT_ALPHA_THRESHOLD) {
    return null;
  }

  const ditheredSource = dithering
    ? shiftRgb(source, getDitherBias(x, y) * getAdaptiveDitherStrength(source))
    : source;

  return findNearestPaletteMatch(ditheredSource, palette).color;
}

export function cleanupIsolatedPixels(
  grid: ColorGrid,
  options: CleanupOptions = {},
): ColorGrid {
  const preserveSilhouette = options.preserveSilhouette ?? true;
  const minimumNeighborAgreement = options.minimumNeighborAgreement ?? (preserveSilhouette ? 3 : 2);

  return grid.map((row, y) =>
    row.map((cell, x) => {
      if (cell === null) {
        return null;
      }

      const sameColorNeighbors = [
        grid[y - 1]?.[x],
        grid[y + 1]?.[x],
        row[x - 1],
        row[x + 1],
      ].filter((value) => value === cell);

      if (preserveSilhouette && sameColorNeighbors.length > 0) {
        return cell;
      }

      const neighbors = [
        grid[y - 1]?.[x],
        grid[y + 1]?.[x],
        row[x - 1],
        row[x + 1],
      ].filter((value): value is string => typeof value === 'string');

      if (neighbors.length < 4) {
        return cell;
      }

      const counts = new Map<string, number>();

      for (const neighbor of neighbors) {
        counts.set(neighbor, (counts.get(neighbor) ?? 0) + 1);
      }

      let dominantColor = cell;
      let dominantCount = 0;

      for (const [color, count] of counts) {
        if (count > dominantCount) {
          dominantColor = color;
          dominantCount = count;
        }
      }

      if (dominantColor === cell) {
        return cell;
      }

      if (dominantCount < minimumNeighborAgreement) {
        return cell;
      }

      return dominantColor;
    })
  );
}

function getOrthogonalNeighbors(x: number, y: number): ClusterPixel[] {
  return [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
  ];
}

function getOpaqueOrthogonalNeighbors(
  sampledCells: SampledCell[][],
  x: number,
  y: number,
): SampledCell[] {
  return [
    sampledCells[y - 1]?.[x],
    sampledCells[y + 1]?.[x],
    sampledCells[y]?.[x - 1],
    sampledCells[y]?.[x + 1],
  ].filter(
    (cell): cell is SampledCell =>
      Boolean(cell) && cell.alpha >= TRANSPARENT_ALPHA_THRESHOLD,
  );
}

function collectCluster(
  grid: ColorGrid,
  startX: number,
  startY: number,
  visited: boolean[][],
): Cluster | null {
  const color = grid[startY]?.[startX];

  if (!color || visited[startY]?.[startX]) {
    return null;
  }

  const stack: ClusterPixel[] = [{ x: startX, y: startY }];
  const pixels: ClusterPixel[] = [];
  let touchesTransparency = false;
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;
  visited[startY][startX] = true;

  while (stack.length > 0) {
    const current = stack.pop() as ClusterPixel;
    pixels.push(current);
    minX = Math.min(minX, current.x);
    maxX = Math.max(maxX, current.x);
    minY = Math.min(minY, current.y);
    maxY = Math.max(maxY, current.y);

    for (const neighbor of getOrthogonalNeighbors(current.x, current.y)) {
      const neighborColor = grid[neighbor.y]?.[neighbor.x];

      if (neighborColor === null) {
        touchesTransparency = true;
        continue;
      }

      if (neighborColor !== color) {
        continue;
      }

      if (visited[neighbor.y]?.[neighbor.x]) {
        continue;
      }

      visited[neighbor.y][neighbor.x] = true;
      stack.push(neighbor);
    }
  }

  return {
    color,
    pixels,
    touchesTransparency,
    bounds: { minX, minY, maxX, maxY },
  };
}

function getClusterSurroundingCounts(grid: ColorGrid, cluster: Cluster): Map<string, number> {
  const counts = new Map<string, number>();
  const clusterPixels = new Set(cluster.pixels.map((pixel) => `${pixel.x},${pixel.y}`));

  for (const pixel of cluster.pixels) {
    for (const neighbor of getOrthogonalNeighbors(pixel.x, pixel.y)) {
      const neighborColor = grid[neighbor.y]?.[neighbor.x];

      if (!neighborColor || neighborColor === cluster.color) {
        continue;
      }

      if (clusterPixels.has(`${neighbor.x},${neighbor.y}`)) {
        continue;
      }

      counts.set(neighborColor, (counts.get(neighborColor) ?? 0) + 1);
    }
  }

  return counts;
}

function getDominantSurroundingColor(counts: Map<string, number>): string | null {
  let bestColor: string | null = null;
  let bestCount = 0;

  for (const [color, count] of counts) {
    if (count > bestCount) {
      bestColor = color;
      bestCount = count;
    }
  }

  return bestColor;
}

function isCentralFeature(cluster: Cluster, width: number, height: number): boolean {
  const centerX = (cluster.bounds.minX + cluster.bounds.maxX) / 2;
  const centerY = (cluster.bounds.minY + cluster.bounds.maxY) / 2;
  const minX = width * 0.2;
  const maxX = width * 0.8;
  const minY = height * 0.2;
  const maxY = height * 0.8;

  return centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY;
}

function isLowerBodyFeature(cluster: Cluster, width: number, height: number): boolean {
  const centerX = (cluster.bounds.minX + cluster.bounds.maxX) / 2;
  const centerY = (cluster.bounds.minY + cluster.bounds.maxY) / 2;
  const minX = width * 0.28;
  const maxX = width * 0.72;

  return centerX >= minX && centerX <= maxX && centerY >= height * LOWER_BODY_FEATURE_START;
}

function isAnimeFaceFeature(cluster: Cluster, width: number, height: number): boolean {
  const centerX = (cluster.bounds.minX + cluster.bounds.maxX) / 2;
  const centerY = (cluster.bounds.minY + cluster.bounds.maxY) / 2;
  const minX = width * 0.26;
  const maxX = width * 0.74;
  const minY = height * 0.32;
  const maxY = height * 0.78;

  return centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY;
}

function isOutlineArtifactCluster(
  cluster: Cluster,
  width: number,
  height: number,
): boolean {
  const luminance = getPerceivedLuminance(hexToRgb(cluster.color));

  return (
    cluster.touchesTransparency &&
    cluster.pixels.length <= 2 &&
    luminance <= OUTLINE_ARTIFACT_LUMINANCE_THRESHOLD &&
    !isCentralFeature(cluster, width, height) &&
    !isLowerBodyFeature(cluster, width, height)
  );
}

function buildFeatureWeightGrid(sampledCells: SampledCell[][]): FeatureGrid {
  return sampledCells.map((row, y) =>
    row.map((cell, x) => {
      if (cell.alpha < TRANSPARENT_ALPHA_THRESHOLD) {
        return 0;
      }

      const neighbors = getOpaqueOrthogonalNeighbors(sampledCells, x, y);

      if (neighbors.length === 0) {
        return 0;
      }

      const colorContrast =
        neighbors.reduce((sum, neighbor) => sum + colorDistance(cell.source, neighbor.source), 0) /
        neighbors.length;
      const luminanceContrast =
        neighbors.reduce(
          (sum, neighbor) =>
            sum +
            Math.abs(
              getPerceivedLuminance(cell.source) -
                getPerceivedLuminance(neighbor.source),
            ) /
              255,
          0,
        ) / neighbors.length;
      const alphaEdgeBoost =
        getOrthogonalNeighbors(x, y).some(({ x: neighborX, y: neighborY }) => {
          const neighbor = sampledCells[neighborY]?.[neighborX];
          return !neighbor || neighbor.alpha < TRANSPARENT_ALPHA_THRESHOLD;
        })
          ? 0.015
          : 0;

      return colorContrast * 0.65 + luminanceContrast * 0.35 + alphaEdgeBoost;
    }),
  );
}

export function simplifyShapeClusters(
  grid: ColorGrid,
  options: Pick<ConversionOptions, 'gridSize' | 'preserveSilhouette' | 'animeMode'>,
  featureWeights?: FeatureGrid,
): ColorGrid {
  const nextGrid = grid.map((row) => [...row]);
  const visited = nextGrid.map((row) => row.map(() => false));
  const smallClusterLimit = options.gridSize === 16 ? 2 : 3;
  const gridHeight = nextGrid.length;
  const gridWidth = nextGrid[0]?.length ?? 0;

  for (let y = 0; y < nextGrid.length; y += 1) {
    for (let x = 0; x < nextGrid[y].length; x += 1) {
      const cluster = collectCluster(nextGrid, x, y, visited);

      if (!cluster) {
        continue;
      }

      if (cluster.pixels.length > smallClusterLimit) {
        continue;
      }

      if (
        options.preserveSilhouette &&
        cluster.touchesTransparency &&
        !isOutlineArtifactCluster(cluster, gridWidth, gridHeight)
      ) {
        continue;
      }

      const surroundingCounts = getClusterSurroundingCounts(nextGrid, cluster);
      const replacementColor = getDominantSurroundingColor(surroundingCounts);

      if (!replacementColor) {
        continue;
      }

      const contrast = colorDistance(hexToRgb(cluster.color), hexToRgb(replacementColor));
      const luminanceContrast = Math.abs(
        getPerceivedLuminance(hexToRgb(cluster.color)) -
          getPerceivedLuminance(hexToRgb(replacementColor)),
      );
      const clusterFeatureWeights = cluster.pixels.map(
        (pixel) => featureWeights?.[pixel.y]?.[pixel.x] ?? 0,
      );
      const averageFeatureWeight =
        clusterFeatureWeights.reduce((sum, value) => sum + value, 0) /
        Math.max(1, clusterFeatureWeights.length);
      const peakFeatureWeight = Math.max(0, ...clusterFeatureWeights);
      const preserveAsFeature =
        cluster.pixels.length <= 3 &&
        (
          (
            isCentralFeature(cluster, gridWidth, gridHeight) &&
            (contrast >= CLUSTER_MERGE_CONTRAST_THRESHOLD ||
              (cluster.pixels.length === 1 &&
                luminanceContrast >= FEATURE_LUMINANCE_THRESHOLD))
          ) ||
          (
            isLowerBodyFeature(cluster, gridWidth, gridHeight) &&
            luminanceContrast >= FEATURE_LUMINANCE_THRESHOLD * 0.7
          ) ||
          averageFeatureWeight >= FEATURE_WEIGHT_AVERAGE_THRESHOLD ||
          peakFeatureWeight >= FEATURE_WEIGHT_PEAK_THRESHOLD
        );

      if (preserveAsFeature) {
        continue;
      }

      for (const pixel of cluster.pixels) {
        nextGrid[pixel.y][pixel.x] = replacementColor;
      }
    }
  }

  return nextGrid;
}

export function cleanupAnimeLineArtifacts(
  grid: ColorGrid,
  options: Pick<ConversionOptions, 'gridSize' | 'animeMode'>,
  featureWeights?: FeatureGrid,
): ColorGrid {
  if (!options.animeMode) {
    return grid;
  }

  const nextGrid = grid.map((row) => [...row]);
  const visited = nextGrid.map((row) => row.map(() => false));
  const gridHeight = nextGrid.length;
  const gridWidth = nextGrid[0]?.length ?? 0;

  for (let y = 0; y < nextGrid.length; y += 1) {
    for (let x = 0; x < nextGrid[y].length; x += 1) {
      const cluster = collectCluster(nextGrid, x, y, visited);

      if (!cluster) {
        continue;
      }

      const luminance = getPerceivedLuminance(hexToRgb(cluster.color));
      const replacementColor = getDominantSurroundingColor(
        getClusterSurroundingCounts(nextGrid, cluster),
      );
      const peakFeatureWeight = Math.max(
        0,
        ...cluster.pixels.map((pixel) => featureWeights?.[pixel.y]?.[pixel.x] ?? 0),
      );

      const shouldMerge =
        cluster.pixels.length <= 3 &&
        luminance <= ANIME_LINE_ARTIFACT_LUMINANCE_THRESHOLD &&
        peakFeatureWeight < FEATURE_WEIGHT_PEAK_THRESHOLD &&
        !isAnimeFaceFeature(cluster, gridWidth, gridHeight) &&
        !isLowerBodyFeature(cluster, gridWidth, gridHeight) &&
        replacementColor !== null;

      if (!shouldMerge) {
        continue;
      }

      for (const pixel of cluster.pixels) {
        nextGrid[pixel.y][pixel.x] = replacementColor;
      }
    }
  }

  return nextGrid;
}

export function buildPixelGrid(imageData: ImageData, options: ConversionOptions): PixelGrid {
  const sampledCells = sampleImageData(
    imageData,
    options.gridSize,
    options.fillFrame,
  );
  const featureWeights = buildFeatureWeightGrid(sampledCells);
  const palette = generateAdaptivePalette(sampledCells, options.paletteSize);
  const colorGrid = sampledCells.map((row, y) =>
    row.map((cell, x) => ({
      ...cell,
      color: quantizeSample(cell.source, cell.alpha, palette, x, y, options.dithering),
    }))
  );
  const noiseCleanedGrid = options.cleanupNoise
    ? cleanupIsolatedPixels(
        colorGrid.map((row) => row.map((cell) => cell.color)),
        { preserveSilhouette: options.preserveSilhouette }
      )
    : colorGrid.map((row) => row.map((cell) => cell.color));
  const cleanedColorGrid = options.simplifyShapes
    ? simplifyShapeClusters(noiseCleanedGrid, {
        gridSize: options.gridSize,
        preserveSilhouette: options.preserveSilhouette,
        animeMode: options.animeMode,
      }, featureWeights)
    : noiseCleanedGrid;
  const animeCleanedGrid = cleanupAnimeLineArtifacts(
    cleanedColorGrid,
    {
      gridSize: options.gridSize,
      animeMode: options.animeMode,
    },
    featureWeights,
  );

  const cells: PixelCell[] = [];

  for (let y = 0; y < options.gridSize; y += 1) {
    for (let x = 0; x < options.gridSize; x += 1) {
      const sampledCell = colorGrid[y][x];

      cells.push({
        x,
        y,
        source: sampledCell.source,
        alpha: sampledCell.alpha,
        color: animeCleanedGrid[y][x],
      });
    }
  }

  const activePalette = [
    ...new Set(
      cells
        .map((cell) => cell.color)
        .filter((color): color is string => typeof color === 'string'),
    ),
  ];

  return {
    width: options.gridSize,
    height: options.gridSize,
    cells,
    palette: activePalette,
  };
}

export function toSourceRgb(hex: string): RGB {
  return hexToRgb(hex);
}

export function normalizeAlpha(alpha: number): number {
  return clampByte(alpha);
}
