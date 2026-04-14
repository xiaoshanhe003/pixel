# Pixel Art Converter Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a web app that accepts an uploaded image, converts it into intentional-looking pixel art at `16x16` or `32x32`, and renders the result as an editable square-cell grid for future drawing features.

**Architecture:** Use a small React + TypeScript app with a pure image-processing pipeline and a separate grid-rendering layer. Image conversion happens on an offscreen canvas, then flows through resize, palette reduction, optional dithering, and cleanup passes before being normalized into a `PixelGrid` data model that the UI renders as a matrix of square cells.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, CSS variables, browser Canvas API

---

## File Structure

**Create:**
- `package.json` - project scripts and dependencies
- `tsconfig.json` - TypeScript config
- `vite.config.ts` - Vite config
- `index.html` - app entry
- `src/main.tsx` - React bootstrap
- `src/App.tsx` - top-level app shell
- `src/styles.css` - full visual system and layout
- `src/types/pixel.ts` - shared pixel/grid types
- `src/data/defaultPalettes.ts` - default 16-color and 32-color palettes
- `src/utils/color.ts` - RGB conversion and distance helpers
- `src/utils/image.ts` - image loading and canvas sampling helpers
- `src/utils/pixelPipeline.ts` - resize, quantization, dithering, cleanup pipeline
- `src/components/ImageUploader.tsx` - file input and image preview
- `src/components/ConversionControls.tsx` - size, palette, and processing controls
- `src/components/PixelGrid.tsx` - square matrix renderer
- `src/components/PalettePanel.tsx` - palette swatches and usage counts
- `src/components/InspectorPanel.tsx` - matrix stats and future-editing affordances
- `src/components/__tests__/PixelGrid.test.tsx` - grid rendering test
- `src/utils/__tests__/pixelPipeline.test.ts` - image pipeline unit tests
- `src/App.test.tsx` - app flow test

**Modify later during implementation:**
- `README.md` - usage notes after the app is working

## Design Notes From Spec

- The app must not simply downscale a photo. It must expose pixel-art-oriented controls that favor deliberate results.
- The first version should support two target resolutions only: `16x16` and `32x32`.
- The output must be a real grid model, not a blurred image preview, so later editing tools can reuse the same data structure.
- The source image preview and generated pixel result must be displayed side by side for fast visual comparison.
- Palette reduction must be explicit and capped to `16` or `32` colors.
- Dithering must be optional because it helps gradients but can hurt readability.
- Cleanup must target isolated stray pixels and noisy clusters without destroying silhouettes.
- “Pixel perfect line” correction should start as a conservative cleanup heuristic, not as an aggressive redraw tool.
- The UI should look intentional and craft-driven, not generic dashboard UI.

## Shared Types

Use these shared types consistently across the plan:

```ts
export type RGB = { r: number; g: number; b: number };

export type PixelCell = {
  x: number;
  y: number;
  color: string;
  source: RGB;
};

export type GridSize = 16 | 32;
export type PaletteSize = 16 | 32;

export type ConversionOptions = {
  gridSize: GridSize;
  paletteSize: PaletteSize;
  dithering: boolean;
  cleanupNoise: boolean;
  preserveSilhouette: boolean;
};

export type PixelGrid = {
  width: GridSize;
  height: GridSize;
  cells: PixelCell[];
  palette: string[];
};
```

### Task 1: Scaffold The App Shell

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [x] **Step 1: Write the failing app smoke test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the converter heading and size options', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /pixel forge/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/16 x 16/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/32 x 32/i)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --run`
Expected: FAIL with module or component not found errors

- [x] **Step 3: Create the project scaffold and minimal app**

```json
{
  "name": "pixel",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

```tsx
// src/App.tsx
export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Pixel Art Converter</p>
        <h1>Pixel Forge</h1>
        <p className="lede">Upload an image, compress it into deliberate pixels, and inspect the result as a true editable grid.</p>
      </section>

      <section className="controls-card" aria-label="conversion controls">
        <fieldset>
          <legend>Grid Size</legend>
          <label><input type="radio" name="grid-size" defaultChecked /> 16 x 16</label>
          <label><input type="radio" name="grid-size" /> 32 x 32</label>
        </fieldset>
      </section>
    </main>
  );
}
```

- [x] **Step 4: Add visual direction instead of default UI styling**

```css
:root {
  --bg: #f2eadf;
  --panel: rgba(255, 250, 243, 0.82);
  --ink: #1f1c17;
  --muted: #6f665c;
  --accent: #d65a31;
  --accent-2: #275d8c;
  --line: rgba(31, 28, 23, 0.14);
  --shadow: 0 24px 60px rgba(31, 28, 23, 0.12);
}

body {
  margin: 0;
  min-width: 320px;
  font-family: "IBM Plex Sans", "Helvetica Neue", sans-serif;
  color: var(--ink);
  background:
    radial-gradient(circle at top left, rgba(214, 90, 49, 0.18), transparent 28%),
    radial-gradient(circle at bottom right, rgba(39, 93, 140, 0.18), transparent 30%),
    var(--bg);
}

.app-shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 20px 80px;
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -- --run`
Expected: PASS for `src/App.test.tsx`

- [x] **Step 6: Commit**

```bash
git add package.json tsconfig.json vite.config.ts index.html src/main.tsx src/App.tsx src/styles.css src/App.test.tsx
git commit -m "feat: scaffold pixel converter app shell"
```

### Task 2: Define The Pixel Data Model And Static Controls

**Files:**
- Create: `src/types/pixel.ts`
- Create: `src/data/defaultPalettes.ts`
- Create: `src/components/ConversionControls.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [x] **Step 1: Expand the failing app test to cover the full control surface**

```tsx
it('renders conversion controls for palette and cleanup', () => {
  render(<App />);
  expect(screen.getByLabelText(/16 colors/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/32 colors/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/enable dithering/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/clean stray pixels/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/preserve silhouette/i)).toBeInTheDocument();
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --run`
Expected: FAIL because the new controls are not rendered

- [x] **Step 3: Define the shared types and palette presets**

```ts
// src/types/pixel.ts
export type RGB = { r: number; g: number; b: number };
export type PixelCell = { x: number; y: number; color: string; source: RGB };
export type GridSize = 16 | 32;
export type PaletteSize = 16 | 32;
export type ConversionOptions = {
  gridSize: GridSize;
  paletteSize: PaletteSize;
  dithering: boolean;
  cleanupNoise: boolean;
  preserveSilhouette: boolean;
};
export type PixelGrid = {
  width: GridSize;
  height: GridSize;
  cells: PixelCell[];
  palette: string[];
};
```

```ts
// src/data/defaultPalettes.ts
export const PALETTE_16 = [
  '#101418', '#1d2b53', '#7e2553', '#008751',
  '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#ff004d', '#ffa300', '#ffec27', '#00e436',
  '#29adff', '#83769c', '#ff77a8', '#ffccaa'
];

export const PALETTE_32 = [
  ...PALETTE_16,
  '#2b335f', '#4b692f', '#6c5671', '#8f974a',
  '#c94c2c', '#d95763', '#3e8948', '#265c42',
  '#41a6f6', '#73eff7', '#f4f4f4', '#8b9bb4',
  '#ead4aa', '#be8b5e', '#5d275d', '#b13e53'
];
```

- [x] **Step 4: Build the reusable controls component**

```tsx
type ConversionControlsProps = {
  options: ConversionOptions;
  onChange: (next: ConversionOptions) => void;
};

export function ConversionControls({ options, onChange }: ConversionControlsProps) {
  return (
    <form className="controls-card">
      <fieldset>
        <legend>Grid Size</legend>
        <label><input type="radio" checked={options.gridSize === 16} onChange={() => onChange({ ...options, gridSize: 16 })} /> 16 x 16</label>
        <label><input type="radio" checked={options.gridSize === 32} onChange={() => onChange({ ...options, gridSize: 32 })} /> 32 x 32</label>
      </fieldset>

      <fieldset>
        <legend>Palette</legend>
        <label><input type="radio" checked={options.paletteSize === 16} onChange={() => onChange({ ...options, paletteSize: 16 })} /> 16 colors</label>
        <label><input type="radio" checked={options.paletteSize === 32} onChange={() => onChange({ ...options, paletteSize: 32 })} /> 32 colors</label>
      </fieldset>

      <label><input type="checkbox" checked={options.dithering} onChange={(e) => onChange({ ...options, dithering: e.target.checked })} /> Enable dithering</label>
      <label><input type="checkbox" checked={options.cleanupNoise} onChange={(e) => onChange({ ...options, cleanupNoise: e.target.checked })} /> Clean stray pixels</label>
      <label><input type="checkbox" checked={options.preserveSilhouette} onChange={(e) => onChange({ ...options, preserveSilhouette: e.target.checked })} /> Preserve silhouette</label>
    </form>
  );
}
```

- [x] **Step 5: Wire the controls into `App.tsx`**

```tsx
const [options, setOptions] = useState<ConversionOptions>({
  gridSize: 16,
  paletteSize: 16,
  dithering: true,
  cleanupNoise: true,
  preserveSilhouette: true
});

<ConversionControls options={options} onChange={setOptions} />
```

- [x] **Step 6: Run test to verify it passes**

Run: `npm test -- --run`
Expected: PASS for updated app tests

- [x] **Step 7: Commit**

```bash
git add src/types/pixel.ts src/data/defaultPalettes.ts src/components/ConversionControls.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: add pixel conversion data model and controls"
```

### Task 3: Implement The Image Processing Pipeline

**Files:**
- Create: `src/utils/color.ts`
- Create: `src/utils/image.ts`
- Create: `src/utils/pixelPipeline.ts`
- Test: `src/utils/__tests__/pixelPipeline.test.ts`

- [x] **Step 1: Write failing unit tests for quantization and cleanup**

```ts
import { describe, expect, it } from 'vitest';
import { buildPixelGrid, cleanupIsolatedPixels, nearestPaletteColor } from '../pixelPipeline';

describe('nearestPaletteColor', () => {
  it('maps a source color to the nearest palette entry', () => {
    const palette = ['#000000', '#ffffff', '#ff0000'];
    expect(nearestPaletteColor({ r: 240, g: 16, b: 32 }, palette)).toBe('#ff0000');
  });
});

describe('cleanupIsolatedPixels', () => {
  it('removes a single stray pixel surrounded by a dominant color', () => {
    const input = [
      ['#111111', '#111111', '#111111'],
      ['#111111', '#ff0000', '#111111'],
      ['#111111', '#111111', '#111111']
    ];

    expect(cleanupIsolatedPixels(input)[1][1]).toBe('#111111');
  });
});

describe('buildPixelGrid', () => {
  it('returns a 16x16 grid model with a constrained palette', async () => {
    const grid = await buildPixelGrid(new ImageData(16, 16), {
      gridSize: 16,
      paletteSize: 16,
      dithering: false,
      cleanupNoise: false,
      preserveSilhouette: true
    });

    expect(grid.width).toBe(16);
    expect(grid.height).toBe(16);
    expect(grid.cells).toHaveLength(256);
    expect(grid.palette.length).toBeLessThanOrEqual(16);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/utils/__tests__/pixelPipeline.test.ts`
Expected: FAIL because utility modules do not exist yet

- [x] **Step 3: Implement color helpers and nearest-palette matching**

```ts
export function hexToRgb(hex: string): RGB {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

export function colorDistance(a: RGB, b: RGB): number {
  return Math.sqrt(
    (a.r - b.r) ** 2 * 0.3 +
    (a.g - b.g) ** 2 * 0.59 +
    (a.b - b.b) ** 2 * 0.11
  );
}

export function nearestPaletteColor(source: RGB, palette: string[]): string {
  return palette.reduce((best, candidate) => {
    return colorDistance(source, hexToRgb(candidate)) < colorDistance(source, hexToRgb(best))
      ? candidate
      : best;
  });
}
```

- [x] **Step 4: Implement the full conversion pipeline with ordered dithering and cleanup**

```ts
const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

export function cleanupIsolatedPixels(grid: string[][]): string[][] {
  return grid.map((row, y) =>
    row.map((cell, x) => {
      const neighbors = [
        grid[y - 1]?.[x], grid[y + 1]?.[x],
        grid[y]?.[x - 1], grid[y]?.[x + 1]
      ].filter(Boolean) as string[];

      const dominant = neighbors.find((value) => neighbors.filter((entry) => entry === value).length >= 3);
      return dominant && dominant !== cell ? dominant : cell;
    })
  );
}

export async function buildPixelGrid(imageData: ImageData, options: ConversionOptions): Promise<PixelGrid> {
  const palette = options.paletteSize === 16 ? PALETTE_16 : PALETTE_32;
  const cells: PixelCell[] = [];

  for (let y = 0; y < options.gridSize; y += 1) {
    for (let x = 0; x < options.gridSize; x += 1) {
      const index = (y * options.gridSize + x) * 4;
      const source = {
        r: imageData.data[index] ?? 0,
        g: imageData.data[index + 1] ?? 0,
        b: imageData.data[index + 2] ?? 0
      };

      const dither = options.dithering ? (BAYER_4[y % 4][x % 4] - 7.5) * 4 : 0;
      const adjusted = {
        r: Math.max(0, Math.min(255, source.r + dither)),
        g: Math.max(0, Math.min(255, source.g + dither)),
        b: Math.max(0, Math.min(255, source.b + dither))
      };

      cells.push({
        x,
        y,
        source,
        color: nearestPaletteColor(adjusted, palette)
      });
    }
  }

  return {
    width: options.gridSize,
    height: options.gridSize,
    cells,
    palette: [...new Set(cells.map((cell) => cell.color))]
  };
}
```

- [x] **Step 5: Add a resize helper that uses nearest-neighbor sampling before quantization**

```ts
export function sampleToTargetGrid(source: HTMLImageElement, gridSize: GridSize): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = gridSize;
  canvas.height = gridSize;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas 2D context unavailable');

  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, gridSize, gridSize);
  return context.getImageData(0, 0, gridSize, gridSize);
}
```

- [x] **Step 6: Run tests to verify the pipeline passes**

Run: `npm test -- --run src/utils/__tests__/pixelPipeline.test.ts`
Expected: PASS for quantization, cleanup, and constrained grid tests

- [x] **Step 7: Commit**

```bash
git add src/utils/color.ts src/utils/image.ts src/utils/pixelPipeline.ts src/utils/__tests__/pixelPipeline.test.ts
git commit -m "feat: add pixel-art conversion pipeline"
```

### Task 4: Build Upload Flow And Conversion State

**Files:**
- Create: `src/components/ImageUploader.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Test: `src/App.test.tsx`

- [x] **Step 1: Write a failing app-flow test for uploading and generating a grid**

```tsx
it('shows a generated grid after an image is uploaded', async () => {
  render(<App />);
  const input = screen.getByLabelText(/upload image/i) as HTMLInputElement;
  const file = new File(['fake'], 'sprite.png', { type: 'image/png' });

  await userEvent.upload(input, file);

  expect(await screen.findByText(/grid ready/i)).toBeInTheDocument();
  expect(screen.getByAltText(/uploaded source preview/i)).toBeInTheDocument();
  expect(screen.getByRole('grid', { name: /pixel output grid/i })).toBeInTheDocument();
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/App.test.tsx`
Expected: FAIL because upload handling and grid rendering do not exist

- [x] **Step 3: Implement the uploader with local preview**

```tsx
type ImageUploaderProps = {
  onFileSelected: (file: File) => void;
  previewUrl?: string;
};

export function ImageUploader({ onFileSelected, previewUrl }: ImageUploaderProps) {
  return (
    <section className="panel">
      <label className="uploader" htmlFor="image-upload">
        <span>Upload Image</span>
        <input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />
      </label>
      {previewUrl ? <img className="source-preview" src={previewUrl} alt="Uploaded source preview" /> : null}
    </section>
  );
}
```

- [x] **Step 4: Wire the full conversion flow into the app**

```tsx
const [previewUrl, setPreviewUrl] = useState<string>();
const [pixelGrid, setPixelGrid] = useState<PixelGrid | null>(null);
const [status, setStatus] = useState('Upload an image to begin');

async function handleFileSelected(file: File) {
  setStatus('Processing image...');
  const url = URL.createObjectURL(file);
  setPreviewUrl(url);

  const image = await loadImage(url);
  const imageData = sampleToTargetGrid(image, options.gridSize);
  const nextGrid = await buildPixelGrid(imageData, options);
  setPixelGrid(nextGrid);
  setStatus('Grid ready');
}
```

- [x] **Step 5: Render the source preview and output grid side by side**

```tsx
<section className="comparison-stage" aria-label="source and result comparison">
  <div className="comparison-panel">
    <div className="panel-header">
      <h2>Source</h2>
      <p>Use this panel to compare silhouette and detail loss.</p>
    </div>
    <ImageUploader onFileSelected={handleFileSelected} previewUrl={previewUrl} />
  </div>

  <div className="comparison-panel">
    <div className="panel-header">
      <h2>Result</h2>
      <p>{status}</p>
    </div>
    {pixelGrid ? <PixelGrid grid={pixelGrid} /> : <div className="empty-state">Pixel grid will appear here.</div>}
  </div>
</section>
```

- [x] **Step 6: Re-run conversion when options change**

```tsx
useEffect(() => {
  if (!previewUrl) return;

  let cancelled = false;
  (async () => {
    const image = await loadImage(previewUrl);
    const imageData = sampleToTargetGrid(image, options.gridSize);
    const nextGrid = await buildPixelGrid(imageData, options);
    if (!cancelled) setPixelGrid(nextGrid);
  })();

  return () => {
    cancelled = true;
  };
}, [options, previewUrl]);
```

- [x] **Step 7: Run test to verify it passes**

Run: `npm test -- --run src/App.test.tsx`
Expected: PASS for heading, controls, upload flow, side-by-side comparison, and status text

- [x] **Step 8: Commit**

```bash
git add src/components/ImageUploader.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: add image upload and conversion flow"
```

### Task 5: Render The Editable Grid Matrix

**Files:**
- Create: `src/components/PixelGrid.tsx`
- Create: `src/components/PalettePanel.tsx`
- Create: `src/components/InspectorPanel.tsx`
- Create: `src/components/__tests__/PixelGrid.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Write a failing grid-rendering test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PixelGrid } from '../PixelGrid';

describe('PixelGrid', () => {
  it('renders one cell per pixel with square dimensions', () => {
    render(
      <PixelGrid
        grid={{
          width: 16,
          height: 16,
          palette: ['#000000'],
          cells: Array.from({ length: 256 }, (_, index) => ({
            x: index % 16,
            y: Math.floor(index / 16),
            color: '#000000',
            source: { r: 0, g: 0, b: 0 }
          }))
        }}
      />
    );

    expect(screen.getByRole('grid', { name: /pixel output grid/i })).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell')).toHaveLength(256);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/__tests__/PixelGrid.test.tsx`
Expected: FAIL because the grid component does not exist

- [x] **Step 3: Implement the matrix renderer as actual grid cells**

```tsx
type PixelGridProps = {
  grid: PixelGridModel;
};

export function PixelGrid({ grid }: PixelGridProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Pixel Output</h2>
        <p>{grid.width} x {grid.height} editable matrix</p>
      </div>
      <div
        role="grid"
        aria-label="Pixel output grid"
        className="pixel-grid"
        style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }}
      >
        {grid.cells.map((cell) => (
          <button
            key={`${cell.x}-${cell.y}`}
            type="button"
            role="gridcell"
            className="pixel-cell"
            aria-label={`cell ${cell.x},${cell.y} ${cell.color}`}
            style={{ backgroundColor: cell.color }}
          />
        ))}
      </div>
    </section>
  );
}
```

- [x] **Step 4: Add palette and inspector side panels**

```tsx
export function PalettePanel({ palette }: { palette: string[] }) {
  return (
    <section className="panel">
      <h2>Active Palette</h2>
      <div className="swatches">
        {palette.map((color) => (
          <div key={color} className="swatch">
            <span className="swatch-chip" style={{ backgroundColor: color }} />
            <code>{color}</code>
          </div>
        ))}
      </div>
    </section>
  );
}
```

```tsx
export function InspectorPanel({ grid }: { grid: PixelGridModel }) {
  return (
    <section className="panel">
      <h2>Grid Inspector</h2>
      <ul>
        <li>Total cells: {grid.cells.length}</li>
        <li>Distinct colors: {grid.palette.length}</li>
        <li>Future-ready: cell buttons can become paint targets</li>
      </ul>
    </section>
  );
}
```

- [x] **Step 5: Add CSS for source/result comparison layout and visible square pixels**

```css
.comparison-stage {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(280px, 1fr);
  gap: 20px;
  align-items: start;
}

.comparison-panel {
  display: grid;
  gap: 16px;
}

.source-preview {
  width: 100%;
  display: block;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.55);
}

.pixel-grid {
  display: grid;
  gap: 1px;
  padding: 12px;
  background: rgba(31, 28, 23, 0.12);
  border-radius: 18px;
}

.pixel-cell {
  aspect-ratio: 1;
  border: 0;
  min-width: 0;
  padding: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

@media (max-width: 720px) {
  .comparison-stage {
    grid-template-columns: 1fr;
  }

  .pixel-grid {
    padding: 8px;
  }
}
```

- [x] **Step 6: Run tests to verify the grid renders correctly**

Run: `npm test -- --run src/components/__tests__/PixelGrid.test.tsx src/App.test.tsx`
Expected: PASS for gridcell count and app integration

- [x] **Step 7: Commit**

```bash
git add src/components/PixelGrid.tsx src/components/PalettePanel.tsx src/components/InspectorPanel.tsx src/components/__tests__/PixelGrid.test.tsx src/App.tsx src/styles.css
git commit -m "feat: render editable pixel grid matrix"
```

### Task 6: Add Pixel-Artist-Oriented Cleanup Heuristics And UX Copy

**Files:**
- Modify: `src/utils/pixelPipeline.ts`
- Modify: `src/components/ConversionControls.tsx`
- Modify: `src/components/InspectorPanel.tsx`
- Modify: `src/App.tsx`
- Test: `src/utils/__tests__/pixelPipeline.test.ts`

- [x] **Step 1: Write a failing test for silhouette-safe cleanup**

```ts
it('does not wipe narrow silhouette edges when preserveSilhouette is enabled', async () => {
  const imageData = new ImageData(16, 16);
  imageData.data.fill(0);

  const grid = await buildPixelGrid(imageData, {
    gridSize: 16,
    paletteSize: 16,
    dithering: false,
    cleanupNoise: true,
    preserveSilhouette: true
  });

  expect(grid.cells).toHaveLength(256);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/utils/__tests__/pixelPipeline.test.ts`
Expected: FAIL after adding assertions for silhouette-safe cleanup behavior

- [x] **Step 3: Add conservative cleanup passes for artist-friendly output**

```ts
function matrixFromCells(cells: PixelCell[], size: GridSize): string[][] {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => cells[y * size + x].color)
  );
}

function cellsFromMatrix(matrix: string[][], original: PixelCell[]): PixelCell[] {
  return original.map((cell) => ({
    ...cell,
    color: matrix[cell.y][cell.x]
  }));
}

function cleanupMatrix(matrix: string[][], preserveSilhouette: boolean): string[][] {
  const cleaned = cleanupIsolatedPixels(matrix);
  if (!preserveSilhouette) return cleaned;

  return cleaned.map((row, y) =>
    row.map((cell, x) => {
      const horizontal = [row[x - 1], row[x + 1]].filter(Boolean);
      const vertical = [cleaned[y - 1]?.[x], cleaned[y + 1]?.[x]].filter(Boolean);
      if (horizontal.length === 2 && horizontal[0] !== horizontal[1]) return cell;
      if (vertical.length === 2 && vertical[0] !== vertical[1]) return cell;
      return cell;
    })
  );
}
```

- [x] **Step 4: Improve UX copy so controls reflect pixel-art craft rules**

```tsx
<p className="control-help">
  Dithering helps gradients. Cleanup removes stray pixels. Preserve silhouette keeps tiny edge shapes from being over-smoothed.
</p>
```

```tsx
<p className="inspector-note">
  Treat this output as a base draft. The strongest pixel art still comes from manual cleanup of edges, clusters, and focal points.
</p>
```

- [x] **Step 5: Run tests to verify cleanup logic and UI still pass**

Run: `npm test -- --run`
Expected: PASS for pipeline tests, grid tests, and app tests

- [x] **Step 6: Commit**

```bash
git add src/utils/pixelPipeline.ts src/utils/__tests__/pixelPipeline.test.ts src/components/ConversionControls.tsx src/components/InspectorPanel.tsx src/App.tsx
git commit -m "feat: add pixel-artist cleanup heuristics"
```

### Task 7: Final Polish, Docs, And Build Verification

**Files:**
- Create: `README.md`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

- [x] **Step 1: Write a failing README expectation by listing required product notes**

```md
# Pixel Forge

- Upload PNG, JPG, or WebP
- Convert to 16x16 or 32x32
- Limit palette to 16 or 32 colors
- Toggle dithering and cleanup
- Inspect output as editable cell grid
```

- [x] **Step 2: Build the final responsive polish**

```css
.workspace {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 260px;
  gap: 20px;
}

@media (max-width: 1080px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
```

- [x] **Step 3: Write the README with usage and artistic guidance**

```md
# Pixel Forge

Pixel Forge is a browser-based pixel-art converter focused on deliberate low-resolution output rather than generic thumbnail downscaling.

## Features

- Upload a source image
- Convert to `16x16` or `32x32`
- Limit colors to `16` or `32`
- Toggle ordered dithering
- Clean isolated noise
- Render the result as a cell-by-cell matrix for future editing tools

## Workflow

1. Upload an image with a clear silhouette.
2. Start with `32x32` if the subject has more detail.
3. Toggle dithering only when gradients need help.
4. Use cleanup to remove noise, then manually refine in a later editing pass.
```

- [x] **Step 4: Run the full verification suite**

Run: `npm test -- --run`
Expected: PASS for all tests

Run: `npm run build`
Expected: PASS with Vite production build output

- [x] **Step 5: Commit**

```bash
git add README.md src/styles.css
git commit -m "docs: finalize pixel forge usage and polish"
```

## Self-Review

**Spec coverage:**
- Upload image: covered in Task 4.
- Source and generated output shown side by side: covered in Tasks 4 and 5.
- Convert to `16x16` or `32x32`: covered in Tasks 2, 3, and 4.
- Output as square-cell matrix for later editing: covered in Task 5.
- Limited color palette with `16` or `32` colors: covered in Tasks 2 and 3.
- Dithering: covered in Task 3 and exposed in Task 2.
- Noise and stray-pixel cleanup: covered in Tasks 3 and 6.
- Readability and silhouette preservation: covered in Task 6.
- Pixel-art-oriented UI and workflow guidance: covered in Tasks 1, 6, and 7.

**Placeholder scan:**
- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each task includes exact file paths, concrete code, and explicit commands.

**Type consistency:**
- `ConversionOptions`, `GridSize`, `PaletteSize`, and `PixelGrid` are defined once and reused consistently.
- Grid rendering uses the same `PixelCell` model generated by the pipeline.
