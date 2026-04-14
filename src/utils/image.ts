import { clampByte } from './color';

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
