# Multi-Scenario Pattern Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current single-purpose pixel converter into a browser-based pattern studio that supports pixel art, fuse bead charts, and crochet charts with both image conversion and direct editing.

**Architecture:** Keep the product as a responsive React + Vite web app optimized for desktop and tablet. Build a shared editable grid core, then layer scenario presets and scenario-specific inspector/export guidance on top so the UI stays simple while the domain behavior stays explicit.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS

---

## Product Shape

- Web app is the right default because it works on PC and tablet without install friction and matches the current codebase.
- Primary target devices: desktop and 11"+ tablets with pointer support.
- Mobile should remain readable, but not be the primary authoring experience.

## Research Notes

- `Piskel` shows the baseline for approachable pixel workflows: frame strip, onion-skin/preview mindset, and direct drawing on a grid. Source: https://piskel.fit/
- `PerlerBeads.net` highlights what bead users care about after conversion: brand-matched palettes, automatic bead counts, and printable planning. Source: https://perlerbeads.net/
- `Stitch Fiddle` validates that crochet users want multiple chart-entry paths such as empty chart, from picture, and printable chart views. Source: https://www.stitchfiddle.com/en/chart/create/crochet/colors?productCategory=none

## Scope For This Plan

- Phase 1 ships a shared editor with:
  - scenario switcher
  - image-to-grid conversion
  - direct cell editing
  - frame workflow for pixel art
  - scenario-specific side panels for beads and crochet
- Phase 2 can add richer export, symbol libraries, board splitting, yarn calculations, and animation preview controls.

## Progress Snapshot

### Done

- Multi-scenario workspace shell is in place
- Pixel mode supports:
  - blank canvas creation
  - image conversion into the document
  - direct drawing
  - continuous drag painting
  - bucket fill
  - continuous drag erasing
  - line tool
  - rectangle tool
  - frame playback preview
  - layer basics
  - layer delete
  - merge active layer down
  - frame timeline with thumbnails
  - zoom controls
  - grid visibility toggle
  - basic pan via move tool

### Next Priority

- Pixel mode:
- Then scenario-specific production features:
  - crochet row / column and symbol views
  - printable exports for beads and crochet

### Newly Completed In This Iteration

- Bead mode now supports:
  - brand palette mapping
  - Perler / Hama / Artkal switching
  - per-color bead counts
  - material total summary

## Design Review Amendments

After reviewing the plan from a drawing-tool interaction perspective, the current scope needs these structural corrections before more feature work:

### 1. Pixel art mode must support two entry paths

- `New blank canvas` is a first-class action, not a fallback state after no image is uploaded.
- `Import image to convert` is an optional starting action layered onto the same document model.
- Recommendation: the top-left primary actions for pixel mode should be:
  - `新建空白画布`
  - `导入图片转绘`
  - `复制当前帧`
  - `播放预览`

### 2. Add a real document model with layers

- The current simplified `PixelGrid[]` frame array is not sufficient for a drawing tool.
- The minimum durable model should be:

```ts
type StudioDocument = {
  scenario: 'pixel' | 'beads' | 'crochet';
  width: 16 | 32;
  height: 16 | 32;
  frames: StudioFrame[];
  activeFrameId: string;
};

type StudioFrame = {
  id: string;
  name: string;
  layers: StudioLayer[];
  activeLayerId: string;
  thumbnail?: string;
};

type StudioLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  cells: PixelCell[];
};
```

- For pixel mode, this enables the workflows users actually expect:
  - sketch on one layer
  - clean line art on one layer
  - flat colors on another layer
  - temporary guide layers
- For beads and crochet, layers can start more constrained, but the same document model still helps:
  - annotation layer
  - symbol overlay layer
  - numbering / guide layer

### 3. Frame cards must show thumbnails, not metadata-only tiles

- The frame strip should work more like Procreate Animation Assist: a horizontal timeline with visible thumbnails for each frame. Source: https://help.procreate.com/procreate/handbook/animation/animation-interface
- Recommendation:
  - every frame card shows a tiny rendered preview of the composited frame
  - selected frame is visually stronger than unselected frames
  - frame actions belong on frame context or mini-toolbar: duplicate, delete, hold
  - bottom strip can scroll horizontally

### 4. Separate tool dock, layers panel, and properties panel

- Figma’s detached canvas model is the right baseline: left navigation/tools, central canvas, right properties. Source: https://help.figma.com/hc/en-us/articles/360039831974 and https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar
- But for a drawing product, the left area should be split conceptually:
  - tool dock: paint / erase / sample / move / zoom
  - asset or import area
  - layers list
- The right area should become the property inspector:
  - palette
  - brush/tool state
  - scenario export settings
  - document info
- Recommendation: layers should not live buried in scenario guidance. They need to be a persistent panel.

### 5. Blank-canvas UX needs presets

- When users start from zero, forcing only `16x16` or `32x32` in hidden controls is too limiting.
- Recommendation for pixel mode presets:
  - `16x16`
  - `32x32`
  - `48x48`
  - `64x64`
- If keeping implementation smaller, ship `16 / 32 / 64` first.

### 6. Layer operations should be minimal but real

- The first version does not need Photoshop-level complexity, but it does need:
  - add layer
  - duplicate layer
  - rename layer
  - show / hide layer
  - lock layer
  - reorder layers
- Optional later:
  - merge down
  - opacity slider
  - blend modes

### 7. Animation should reuse layers correctly

- Important interaction choice:
  - either each frame owns independent layers
  - or some layers can persist across frames as shared guides
- Recommendation for v1:
  - each frame owns its own layers
  - duplication copies the active frame including all layers
  - onion skin preview is planned next, not required in the first implementation
- This keeps the model understandable and matches user expectation from pixel animation tools.

### 8. Beads and crochet should not copy pixel mode verbatim

- Pixel mode is canvas-first.
- Beads and crochet should gradually pivot toward `chart-first` behaviors after the shared editor base is stable.
- Recommendation:
  - beads: emphasize palette brand mapping, counts, board segmentation, printable legend
  - crochet: emphasize row/column numbering, symbol overlay, repeated block readability, export to print-first layouts

### 9. Product hierarchy recommendation

- The product should be structured as:
  - top bar: file actions, scenario switch, playback / export
  - left tool rail: drawing tools
  - left secondary panel: import / layers
  - center: canvas
  - right inspector: palette / properties / export
  - bottom strip: frames or pages depending on scenario

This is a better long-term foundation than continuing to expand a converter-style page.

## Plan Corrections

- Replace the shared state work in Task 1 with a document model that includes frames and layers.
- Replace the current frame workflow in Task 4 with a thumbnail timeline implementation.
- Add a new task before direct editing for `blank canvas creation + document presets`.
- Add a new task for a persistent `LayersPanel`.
- Move scenario guidance lower in priority than layers, frame workflow, and document controls.

## Implementation Continuation Notes

- Treat pixel mode as the primary editor foundation. New drawing features should land here first before being generalized.
- Do not add UI for a drawing tool unless the actual behavior is implemented and test-covered.
- Preserve the current workspace hierarchy:
  - top bar
  - left tool / layers / asset stack
  - center canvas
  - right palette / inspector
  - bottom frame strip
- If context is lost, resume from `Next Priority` above in order, one verified feature slice at a time.

### Task 1: Define shared studio state

**Files:**
- Create: `src/types/studio.ts`
- Create: `src/utils/studio.ts`
- Test: `src/utils/__tests__/studio.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createBlankGrid, replaceCellColor } from '../studio';

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/utils/__tests__/studio.test.ts`
Expected: FAIL with module resolution errors for `../studio`

- [ ] **Step 3: Write minimal implementation**

```ts
import type { PixelCell, PixelGrid } from '../types/pixel';

export function createBlankGrid(size: 16 | 32): PixelGrid {
  const cells: PixelCell[] = Array.from({ length: size * size }, (_, index) => ({
    x: index % size,
    y: Math.floor(index / size),
    color: null,
    source: { r: 255, g: 255, b: 255 },
    alpha: 0,
  }));

  return { width: size, height: size, cells, palette: [] };
}

export function replaceCellColor(
  grid: PixelGrid,
  x: number,
  y: number,
  color: string | null,
): PixelGrid {
  const cells = grid.cells.map((cell) =>
    cell.x === x && cell.y === y ? { ...cell, color, alpha: color ? 255 : 0 } : cell,
  );
  const palette = [...new Set(cells.map((cell) => cell.color).filter(Boolean))] as string[];
  return { ...grid, cells, palette };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/utils/__tests__/studio.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/studio.ts src/utils/studio.ts src/utils/__tests__/studio.test.ts
git commit -m "feat: add shared studio grid helpers"
```

### Task 2: Build the multi-scenario workspace shell

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';

it('renders three scenario tabs', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /像素绘画/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /拼豆图纸/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /钩织图纸/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/App.test.tsx`
Expected: FAIL because the current app only renders the converter layout

- [ ] **Step 3: Write minimal implementation**

```tsx
const SCENARIOS = [
  { id: 'pixel', label: '像素绘画' },
  { id: 'beads', label: '拼豆图纸' },
  { id: 'crochet', label: '钩织图纸' },
] as const;

<nav className="scenario-switcher" aria-label="创作场景">
  {SCENARIOS.map((scenario) => (
    <button
      key={scenario.id}
      type="button"
      className={scenario.id === activeScenario ? 'scenario-tab is-active' : 'scenario-tab'}
      onClick={() => setActiveScenario(scenario.id)}
    >
      {scenario.label}
    </button>
  ))}
</nav>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/styles.css src/App.test.tsx
git commit -m "feat: add multi-scenario studio shell"
```

### Task 3: Add direct editing and scenario-aware panels

**Files:**
- Modify: `src/components/PixelGrid.tsx`
- Create: `src/components/ScenarioPanel.tsx`
- Create: `src/components/EditingToolbar.tsx`
- Test: `src/components/__tests__/PixelGrid.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import PixelGrid from '../PixelGrid';

it('lets the user paint a cell', async () => {
  const user = userEvent.setup();
  const handlePaint = vi.fn();
  render(<PixelGrid grid={grid} editable activeColor="#ff00aa" tool="paint" onPaintCell={handlePaint} />);
  await user.click(screen.getByLabelText(/像素 0,0/i));
  expect(handlePaint).toHaveBeenCalledWith(0, 0, '#ff00aa');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/__tests__/PixelGrid.test.tsx`
Expected: FAIL because `PixelGrid` is read-only today

- [ ] **Step 3: Write minimal implementation**

```tsx
type PixelGridProps = {
  grid: PixelGridModel;
  editable?: boolean;
  activeColor?: string;
  tool?: 'paint' | 'erase' | 'sample';
  onPaintCell?: (x: number, y: number, color: string | null) => void;
};

const nextColor =
  tool === 'erase' ? null : tool === 'sample' ? cell.color : activeColor ?? null;

<button
  type="button"
  onClick={() => {
    if (editable && onPaintCell && tool !== 'sample') {
      onPaintCell(cell.x, cell.y, nextColor);
    }
  }}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/__tests__/PixelGrid.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PixelGrid.tsx src/components/ScenarioPanel.tsx src/components/EditingToolbar.tsx src/components/__tests__/PixelGrid.test.tsx
git commit -m "feat: add direct editing controls"
```

### Task 4: Add frame workflow for pixel art

**Files:**
- Create: `src/components/FrameStrip.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import App from './App';

it('adds a duplicate frame in pixel mode', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /复制当前帧/i }));
  expect(screen.getAllByRole('button', { name: /第 .* 帧/i }).length).toBeGreaterThan(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/App.test.tsx`
Expected: FAIL because the app has no frame strip or actions

- [ ] **Step 3: Write minimal implementation**

```tsx
const [frames, setFrames] = useState([createBlankGrid(conversionOptions.gridSize)]);
const [activeFrameIndex, setActiveFrameIndex] = useState(0);

function duplicateFrame() {
  setFrames((current) => {
    const source = structuredClone(current[activeFrameIndex]);
    return [...current, source];
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/FrameStrip.tsx src/App.test.tsx
git commit -m "feat: add pixel animation frame workflow"
```

### Task 5: Verification and docs refresh

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the product description**

```md
# Pixel Forge

Pixel Forge is a browser-based pattern studio for pixel art, fuse bead charts, and crochet chart planning.
```

- [ ] **Step 2: Run the focused verification**

Run: `npm test -- --run`
Expected: PASS

Run: `npm run build`
Expected: PASS with Vite production build output

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: refresh studio positioning"
```

## Self-Review

- Spec coverage:
  - multi-scenario product shape: covered in Tasks 2-4
  - image conversion plus direct editing: covered in Tasks 1 and 3
  - pixel animation: covered in Task 4
  - beads and crochet scenario specialization: covered in Task 3 and Task 5 copy refresh
- Placeholder scan: no `TODO`, `TBD`, or unresolved placeholders remain
- Type consistency: shared grid state remains based on `PixelGrid`; editor actions use explicit `paint | erase | sample`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-16-multi-scenario-pattern-studio.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
