# Drawing Tool Interaction Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the left tool workflow feel like a real drawing editor by adding live tool feedback, tool-specific cursor behavior, and adjustable brush/eraser settings without breaking the current pixel/beads/crochet editor foundation.

**Architecture:** Keep the current `useStudioApp -> StudioCanvasStage -> PixelGrid` flow, but split editing into two layers: persistent tool settings in app state and transient in-progress interaction state in the canvas. Follow the repo’s existing product direction from `docs/2026-04-16-product-working-principles.md` and the earlier workspace plan: left rail remains the tool dock, while tool state becomes explicit instead of being implied by one-off event handlers.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, existing CSS modules under `src/styles/*`

---

## Design Inputs

- The current implementation already supports `paint / erase / fill / line / rectangle / sample / move`, but `src/components/PixelGrid.tsx` only commits shape results on pointer release, so users get no in-progress preview.
- `src/components/EditingToolbar.tsx` currently exposes only tool choice and color; it has no concept of brush width, eraser width, tool hints, or shape mode.
- `src/styles/canvas-foundation.css` and `src/styles/canvas.css` style the viewport cursor, but each grid cell is still a button, so hover behavior can drift away from the selected tool affordance.
- The earlier product plan in `docs/superpowers/plans/2026-04-16-multi-scenario-pattern-studio.md` already established the intended direction: left tool rail for drawing tools, right-side inspector for palette/properties, and explicit brush/tool state instead of converter-style controls.

## File Structure

- Modify: `src/types/studio.ts`
  Define persistent tool settings and transient interaction session types.
- Modify: `src/hooks/useStudioApp.ts`
  Own the canonical tool settings state and expose actions for brush/eraser sizing and shape preview options.
- Modify: `src/App.tsx`
  Thread the new tool settings props from app state into the docks and canvas stage.
- Modify: `src/components/EditingToolbar.tsx`
  Turn the current tool picker into a real tool dock with active tool summary and tool-specific controls.
- Modify: `src/components/StudioLeftDock.tsx`
  Keep the left dock coherent after the toolbar grows from simple chips into a dock + settings block.
- Modify: `src/components/StudioCanvasStage.tsx`
  Pass persistent tool settings plus transient preview state to `PixelGrid`.
- Modify: `src/components/PixelGrid.tsx`
  Render live previews, normalize cursor behavior across viewport and cells, and support multi-cell brush/eraser footprints.
- Modify: `src/styles/primitives.css`
  Add compact tool-control patterns consistent with the existing chip/button language.
- Modify: `src/styles/canvas-foundation.css`
  Ensure canvas hover/drag cursors always reflect the selected tool and preview state.
- Modify: `src/styles/canvas.css`
  Add preview overlays, brush ghost styling, and selected-tool affordance polish.
- Test: `src/components/__tests__/PixelGrid.test.tsx`
  Cover live preview, cursor consistency, and brush footprint behavior.
- Test: `src/hooks/App.canvas-editing.test.tsx`
  Cover real app flows such as changing brush size then drawing, and seeing rectangle preview before release.
- Test: `src/hooks/App.rendering.test.tsx`
  Confirm the left dock shows the new tool settings affordances.

### Task 1: Model Persistent Tool Settings In App State

**Files:**
- Modify: `src/types/studio.ts`
- Modify: `src/hooks/useStudioApp.ts`
- Modify: `src/App.tsx`
- Test: `src/hooks/App.rendering.test.tsx`

- [ ] **Step 1: Write the failing rendering test**

```ts
it('shows brush and eraser size controls for the active tool', async () => {
  renderApp();
  await createBlankCanvas();

  expect(screen.getByText(/画笔尺寸/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /橡皮/i }));
  expect(screen.getByText(/橡皮尺寸/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/App.rendering.test.tsx -t "shows brush and eraser size controls for the active tool"`
Expected: FAIL because the toolbar does not render any size controls.

- [ ] **Step 3: Define explicit tool settings types**

```ts
export type ShapePreviewMode = 'outline';

export type EditorToolSettings = {
  paintSize: 1 | 2 | 3 | 4;
  eraseSize: 1 | 2 | 3 | 4;
  shapePreviewMode: ShapePreviewMode;
};
```

- [ ] **Step 4: Store settings in `useStudioApp` and expose actions**

```ts
const [toolSettings, setToolSettings] = useState<EditorToolSettings>({
  paintSize: 1,
  eraseSize: 1,
  shapePreviewMode: 'outline',
});

setToolSettings: (updater) =>
  setToolSettings((current) => updater(current)),
```

- [ ] **Step 5: Thread settings through `App.tsx`**

```tsx
<StudioLeftDock
  toolSettings={editor.toolSettings}
  onToolSettingsChange={actions.setToolSettings}
  ...
/>

<StudioCanvasStage
  toolSettings={editor.toolSettings}
  ...
/>
```

- [ ] **Step 6: Run the rendering test to verify it passes**

Run: `npm test -- src/hooks/App.rendering.test.tsx -t "shows brush and eraser size controls for the active tool"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/types/studio.ts src/hooks/useStudioApp.ts src/App.tsx src/hooks/App.rendering.test.tsx
git commit -m "feat: model persistent drawing tool settings"
```

### Task 2: Upgrade The Left Tool Dock From Picker To Tool Settings Panel

**Files:**
- Modify: `src/components/EditingToolbar.tsx`
- Modify: `src/components/StudioLeftDock.tsx`
- Modify: `src/styles/primitives.css`
- Test: `src/hooks/App.rendering.test.tsx`

- [ ] **Step 1: Write the failing toolbar test**

```ts
it('renders tool-specific helper controls inside the left dock', async () => {
  renderApp();
  await createBlankCanvas();

  expect(screen.getByRole('button', { name: /1 px/i })).toBeInTheDocument();
  expect(screen.getByText(/拖拽预览后松开提交/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/App.rendering.test.tsx -t "renders tool-specific helper controls inside the left dock"`
Expected: FAIL because the left dock has no helper controls or guidance copy.

- [ ] **Step 3: Add tool-specific controls and copy to `EditingToolbar.tsx`**

```tsx
{tool === 'paint' ? (
  <fieldset className="tool-setting-group">
    <legend>画笔尺寸</legend>
    {[1, 2, 3, 4].map((size) => (
      <button
        key={size}
        type="button"
        className={`chip-button size-chip${toolSettings.paintSize === size ? ' is-active' : ''}`}
        onClick={() => onToolSettingsChange((current) => ({ ...current, paintSize: size }))}
      >
        {size} px
      </button>
    ))}
  </fieldset>
) : null}
```

- [ ] **Step 4: Keep the dock layout compact in `StudioLeftDock.tsx` and `primitives.css`**

```css
.tool-setting-group {
  display: grid;
  gap: var(--space-3);
}

.tool-setting-help {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
```

- [ ] **Step 5: Run the rendering test to verify it passes**

Run: `npm test -- src/hooks/App.rendering.test.tsx -t "renders tool-specific helper controls inside the left dock"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/EditingToolbar.tsx src/components/StudioLeftDock.tsx src/styles/primitives.css src/hooks/App.rendering.test.tsx
git commit -m "feat: add detailed controls to drawing tool dock"
```

### Task 3: Add Live Canvas Preview For Rectangle, Line, And Multi-Cell Brush Footprints

**Files:**
- Modify: `src/components/StudioCanvasStage.tsx`
- Modify: `src/components/PixelGrid.tsx`
- Modify: `src/styles/canvas.css`
- Test: `src/components/__tests__/PixelGrid.test.tsx`
- Test: `src/hooks/App.canvas-editing.test.tsx`

- [ ] **Step 1: Write the failing `PixelGrid` preview tests**

```ts
it('shows a rectangle preview before pointer release', () => {
  render(<PixelGrid ... tool="rectangle" toolSettings={{ paintSize: 1, eraseSize: 1, shapePreviewMode: 'outline' }} />);

  fireEvent.pointerDown(screen.getByLabelText(/像素 1,1 透明/i), { pointerId: 7 });
  fireEvent.pointerEnter(screen.getByLabelText(/像素 3,3 透明/i), { pointerId: 7 });

  expect(screen.getByLabelText(/预览矩形 1,1 到 3,3/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/__tests__/PixelGrid.test.tsx -t "shows a rectangle preview before pointer release"`
Expected: FAIL because preview markup and `toolSettings` props do not exist.

- [ ] **Step 3: Add transient interaction state in `PixelGrid.tsx`**

```ts
const [interactionPreview, setInteractionPreview] = useState<{
  cells: Array<{ x: number; y: number }>;
  label: string;
} | null>(null);
```

- [ ] **Step 4: Update drag logic to compute preview cells before commit**

```ts
if (tool === 'line' || tool === 'rectangle') {
  const previewCells =
    tool === 'line'
      ? buildLinePreview(startX, startY, cell.x, cell.y)
      : buildRectanglePreview(startX, startY, cell.x, cell.y);

  setInteractionPreview({
    cells: previewCells,
    label: `预览${tool === 'line' ? '线条' : '矩形'} ${startX},${startY} 到 ${cell.x},${cell.y}`,
  });
}
```

- [ ] **Step 5: Expand brush and eraser to respect size**

```ts
const footprint = getBrushFootprint(cell.x, cell.y, tool === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize);

for (const target of footprint) {
  paintCell(target.x, target.y, nextColor);
}
```

- [ ] **Step 6: Render preview cells without mutating the document before release**

```tsx
const previewLookup = new Set(interactionPreview?.cells.map((cell) => `${cell.x}-${cell.y}`) ?? []);

className={`pixel-cell ...${previewLookup.has(`${cell.x}-${cell.y}`) ? ' is-preview' : ''}`}
```

- [ ] **Step 7: Add app-level regression coverage**

```ts
it('lets the user see rectangle preview before commit and draws after release', async () => {
  renderApp();
  await createBlankCanvas();
  await userEvent.click(screen.getByRole('button', { name: /矩形/i }));

  fireEvent.pointerDown(screen.getByLabelText(/像素 1,1 透明/i), { pointerId: 8 });
  fireEvent.pointerEnter(screen.getByLabelText(/像素 3,3 透明/i), { pointerId: 8 });

  expect(screen.getByLabelText(/预览矩形 1,1 到 3,3/i)).toBeInTheDocument();
});
```

- [ ] **Step 8: Run tests to verify preview and footprint behavior pass**

Run: `npm test -- src/components/__tests__/PixelGrid.test.tsx src/hooks/App.canvas-editing.test.tsx`
Expected: PASS with preview and multi-cell drawing behavior covered.

- [ ] **Step 9: Commit**

```bash
git add src/components/StudioCanvasStage.tsx src/components/PixelGrid.tsx src/styles/canvas.css src/components/__tests__/PixelGrid.test.tsx src/hooks/App.canvas-editing.test.tsx
git commit -m "feat: add live drawing previews and brush footprints"
```

### Task 4: Make Canvas Cursor Feedback Match The Selected Tool Everywhere

**Files:**
- Modify: `src/components/PixelGrid.tsx`
- Modify: `src/styles/canvas-foundation.css`
- Modify: `src/styles/canvas.css`
- Test: `src/components/__tests__/PixelGrid.test.tsx`

- [ ] **Step 1: Write the failing cursor test**

```ts
it('keeps the rectangle cursor while hovering editable cells', () => {
  render(<PixelGrid ... editable tool="rectangle" toolSettings={{ paintSize: 1, eraseSize: 1, shapePreviewMode: 'outline' }} />);

  const cell = screen.getByLabelText(/像素 0,0 透明/i);
  expect(cell).toHaveStyle({ cursor: expect.stringContaining('data:image/svg+xml') });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/PixelGrid.test.tsx -t "keeps the rectangle cursor while hovering editable cells"`
Expected: FAIL because only the viewport sets cursor style right now.

- [ ] **Step 3: Apply tool cursor style to both viewport and cells**

```tsx
const toolCursor = getCursorForTool(tool);

<div className="pixel-grid-viewport" style={{ cursor: toolCursor }}>
  ...
  <button
    ...
    style={{
      ...(presentation === 'color' && cell.color ? { backgroundColor: cell.color } : undefined),
      cursor: toolCursor,
    }}
  />
</div>
```

- [ ] **Step 4: Preserve move-tool drag affordance in CSS**

```css
.pixel-grid-viewport[data-active-tool='move'] {
  cursor: grab;
}

.pixel-grid-viewport[data-active-tool='move']:active,
.pixel-cell[data-active-tool='move']:active {
  cursor: grabbing;
}
```

- [ ] **Step 5: Run cursor tests to verify they pass**

Run: `npm test -- src/components/__tests__/PixelGrid.test.tsx -t "cursor"`
Expected: PASS with viewport and cell cursor assertions aligned.

- [ ] **Step 6: Commit**

```bash
git add src/components/PixelGrid.tsx src/styles/canvas-foundation.css src/styles/canvas.css src/components/__tests__/PixelGrid.test.tsx
git commit -m "fix: align canvas hover cursor with selected tool"
```

### Task 5: Verify The Full Interaction Slice And Document The Rules

**Files:**
- Modify: `src/hooks/App.canvas-editing.test.tsx`
- Modify: `README.md`

- [ ] **Step 1: Add a focused interaction regression test**

```ts
it('uses brush size controls to paint a larger footprint', async () => {
  renderApp();
  await createBlankCanvas();

  await userEvent.click(screen.getByRole('button', { name: /2 px/i }));
  await userEvent.click(screen.getByLabelText(/像素 5,5 透明/i));

  expect(screen.getByLabelText(/像素 5,5 #d65a31/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/像素 6,5 #d65a31/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the interaction suite**

Run: `npm test -- src/hooks/App.canvas-editing.test.tsx src/hooks/App.rendering.test.tsx src/components/__tests__/PixelGrid.test.tsx`
Expected: PASS

- [ ] **Step 3: Update `README.md` with the new interaction rules**

```md
- Left tool dock now includes tool-specific settings such as brush size and eraser size.
- Shape tools preview the affected cells during drag and only commit on pointer release.
- Canvas hover cursor follows the selected tool instead of falling back to generic button hover.
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test -- --runInBand`
Expected: PASS across the repo with no regressions in blank-canvas editing.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/App.canvas-editing.test.tsx src/hooks/App.rendering.test.tsx src/components/__tests__/PixelGrid.test.tsx README.md
git commit -m "test: verify refined drawing tool interactions"
```

## Self-Review

- Spec coverage: covers the user-reported issues directly:
  - rectangle only visible after release -> Task 3
  - hover cursor not matching tool icon -> Task 4
  - missing brush/eraser size controls -> Tasks 1, 2, 5
  - left-side tool interaction too coarse -> Tasks 1 and 2
- Placeholder scan: no `TODO`, `TBD`, or “handle later” language remains.
- Type consistency: all tasks use `EditorToolSettings`, `toolSettings`, and `shapePreviewMode` consistently.

Plan complete and saved to `docs/superpowers/plans/2026-04-16-drawing-tool-interaction-refinement.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
