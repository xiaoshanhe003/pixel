import type { RGB } from '../types/pixel';
import { clampByte, colorDistance } from './color';

function createImageData(width: number, height: number, data?: Uint8ClampedArray): ImageData {
  const pixels = data ?? new Uint8ClampedArray(width * height * 4);

  if (typeof ImageData !== 'undefined') {
    try {
      return new ImageData(pixels as never, width, height);
    } catch {
      // Fall through to the jsdom-friendly object shape below.
    }
  }

  return {
    data: pixels,
    width,
    height,
  } as ImageData;
}

function copyPixel(
  source: ImageData,
  sourceX: number,
  sourceY: number,
  target: ImageData,
  targetX: number,
  targetY: number,
): void {
  const sourceIndex = (sourceY * source.width + sourceX) * 4;
  const targetIndex = (targetY * target.width + targetX) * 4;

  for (let channel = 0; channel < 4; channel += 1) {
    target.data[targetIndex + channel] = source.data[sourceIndex + channel] ?? 0;
  }
}

function readPixelRgb(imageData: ImageData, x: number, y: number): RGB {
  const index = (y * imageData.width + x) * 4;

  return {
    r: imageData.data[index] ?? 0,
    g: imageData.data[index + 1] ?? 0,
    b: imageData.data[index + 2] ?? 0,
  };
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    throw new Error('Canvas helpers require a document to be available.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function getCanvas2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new Error('Canvas 2D context unavailable.');
  }

  return context;
}

export function drawImageToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  smoothing = false
): HTMLCanvasElement {
  const canvas = createCanvas(width, height);
  const context = getCanvas2DContext(canvas);

  context.imageSmoothingEnabled = smoothing;
  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);

  return canvas;
}

export function imageSourceToImageData(
  source: CanvasImageSource,
  width: number,
  height: number,
  smoothing = false
): ImageData {
  const canvas = drawImageToCanvas(source, width, height, smoothing);
  const context = getCanvas2DContext(canvas);

  return context.getImageData(0, 0, width, height);
}

export async function fileToImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = 'async';

    await new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => reject(new Error(`Failed to load image file: ${file.name}`)), {
        once: true,
      });
      image.src = url;
    });

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function resizeImageDataNearest(imageData: ImageData, width: number, height: number): ImageData {
  const resized = createImageData(width, height);

  if (imageData.width === 0 || imageData.height === 0 || width === 0 || height === 0) {
    return resized;
  }

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(imageData.height - 1, Math.floor((y + 0.5) * imageData.height / height));

    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(imageData.width - 1, Math.floor((x + 0.5) * imageData.width / width));
      const sourceIndex = (sourceY * imageData.width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;

      resized.data[targetIndex] = clampByte(imageData.data[sourceIndex] ?? 0);
      resized.data[targetIndex + 1] = clampByte(imageData.data[sourceIndex + 1] ?? 0);
      resized.data[targetIndex + 2] = clampByte(imageData.data[sourceIndex + 2] ?? 0);
      resized.data[targetIndex + 3] = clampByte(imageData.data[sourceIndex + 3] ?? 255);
    }
  }

  return resized;
}

export function resizeImageDataBilinear(imageData: ImageData, width: number, height: number): ImageData {
  const resized = createImageData(width, height);

  if (imageData.width === 0 || imageData.height === 0 || width === 0 || height === 0) {
    return resized;
  }

  const xRatio = imageData.width / width;
  const yRatio = imageData.height / height;

  for (let y = 0; y < height; y += 1) {
    const sourceY = (y + 0.5) * yRatio - 0.5;
    const y0 = Math.max(0, Math.floor(sourceY));
    const y1 = Math.min(imageData.height - 1, y0 + 1);
    const yWeight = sourceY - y0;

    for (let x = 0; x < width; x += 1) {
      const sourceX = (x + 0.5) * xRatio - 0.5;
      const x0 = Math.max(0, Math.floor(sourceX));
      const x1 = Math.min(imageData.width - 1, x0 + 1);
      const xWeight = sourceX - x0;
      const targetIndex = (y * width + x) * 4;

      for (let channel = 0; channel < 4; channel += 1) {
        const topLeft = imageData.data[(y0 * imageData.width + x0) * 4 + channel] ?? 0;
        const topRight = imageData.data[(y0 * imageData.width + x1) * 4 + channel] ?? 0;
        const bottomLeft = imageData.data[(y1 * imageData.width + x0) * 4 + channel] ?? 0;
        const bottomRight = imageData.data[(y1 * imageData.width + x1) * 4 + channel] ?? 0;
        const top = topLeft + (topRight - topLeft) * xWeight;
        const bottom = bottomLeft + (bottomRight - bottomLeft) * xWeight;

        resized.data[targetIndex + channel] = clampByte(top + (bottom - top) * yWeight);
      }
    }
  }

  return resized;
}

export function trimTransparentBounds(
  imageData: ImageData,
  alphaThreshold = 24,
): ImageData {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const alpha = imageData.data[(y * imageData.width + x) * 4 + 3] ?? 0;

      if (alpha < alphaThreshold) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX === -1 || maxY === -1) {
    return createImageData(1, 1);
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const trimmed = createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      copyPixel(imageData, minX + x, minY + y, trimmed, x, y);
    }
  }

  return trimmed;
}

export function estimateEdgeBackgroundColor(imageData: ImageData): RGB {
  const samples: RGB[] = [];

  for (let x = 0; x < imageData.width; x += 1) {
    samples.push(readPixelRgb(imageData, x, 0));
    if (imageData.height > 1) {
      samples.push(readPixelRgb(imageData, x, imageData.height - 1));
    }
  }

  for (let y = 1; y < imageData.height - 1; y += 1) {
    samples.push(readPixelRgb(imageData, 0, y));
    if (imageData.width > 1) {
      samples.push(readPixelRgb(imageData, imageData.width - 1, y));
    }
  }

  const total = samples.reduce(
    (sum, sample) => ({
      r: sum.r + sample.r,
      g: sum.g + sample.g,
      b: sum.b + sample.b,
    }),
    { r: 0, g: 0, b: 0 },
  );
  const count = Math.max(1, samples.length);

  return {
    r: clampByte(total.r / count),
    g: clampByte(total.g / count),
    b: clampByte(total.b / count),
  };
}

export function trimSolidBackgroundBounds(
  imageData: ImageData,
  backgroundColor: RGB,
  tolerance = 0.04,
): ImageData {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const alpha = imageData.data[(y * imageData.width + x) * 4 + 3] ?? 255;
      const rgb = readPixelRgb(imageData, x, y);

      if (alpha >= 24 && colorDistance(rgb, backgroundColor) > tolerance) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX === -1 || maxY === -1) {
    return imageData;
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const trimmed = createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      copyPixel(imageData, minX + x, minY + y, trimmed, x, y);
    }
  }

  return trimmed;
}

export function fitImageDataContain(
  imageData: ImageData,
  width: number,
  height: number,
  padding = 0,
): ImageData {
  const fitted = createImageData(width, height);

  if (imageData.width === 0 || imageData.height === 0) {
    return fitted;
  }

  const innerWidth = Math.max(1, width - padding * 2);
  const innerHeight = Math.max(1, height - padding * 2);
  const scale = Math.min(innerWidth / imageData.width, innerHeight / imageData.height);
  const targetWidth = Math.max(1, Math.round(imageData.width * scale));
  const targetHeight = Math.max(1, Math.round(imageData.height * scale));
  const resized = resizeImageDataBilinear(imageData, targetWidth, targetHeight);
  const offsetX = Math.floor((width - targetWidth) / 2);
  const offsetY = Math.floor((height - targetHeight) / 2);

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      copyPixel(resized, x, y, fitted, offsetX + x, offsetY + y);
    }
  }

  return fitted;
}

export function fitImageDataCover(
  imageData: ImageData,
  width: number,
  height: number,
  padding = 0,
): ImageData {
  const fitted = createImageData(width, height);

  if (imageData.width === 0 || imageData.height === 0) {
    return fitted;
  }

  const innerWidth = Math.max(1, width - padding * 2);
  const innerHeight = Math.max(1, height - padding * 2);
  const scale = Math.max(innerWidth / imageData.width, innerHeight / imageData.height);
  const targetWidth = Math.max(1, Math.round(imageData.width * scale));
  const targetHeight = Math.max(1, Math.round(imageData.height * scale));
  const resized = resizeImageDataBilinear(imageData, targetWidth, targetHeight);
  const cropX = Math.max(0, Math.floor((targetWidth - innerWidth) / 2));
  const cropY = Math.max(0, Math.floor((targetHeight - innerHeight) / 2));

  for (let y = 0; y < innerHeight; y += 1) {
    for (let x = 0; x < innerWidth; x += 1) {
      copyPixel(resized, cropX + x, cropY + y, fitted, padding + x, padding + y);
    }
  }

  return fitted;
}
