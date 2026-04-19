# Bead Print Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the bead print preview and PDF export so they render as a compact single-page chart with rulers, cell codes, stronger grid lines, and a bottom material list that matches the final exported result.

**Architecture:** Move bead print rendering to a shared canvas renderer that produces one paper-like page image. Use that same rendered page for the preview dialog and for the PDF export, so the preview is a faithful representation of the exported output. Keep the existing HTML export sheet as a fallback for non-bead scenarios while the bead path upgrades first.

**Tech Stack:** React 19, TypeScript, canvas 2D rendering, jsPDF

---

### Task 1: Add a shared bead print page renderer

**Files:**
- Create: `src/utils/beadPrintLayout.ts`
- Create: `src/utils/beadPrintPage.ts`
- Modify: `src/utils/scenarioExport.ts`

- [ ] Build pure layout helpers for orientation, margins, chart bounds, ruler slots, legend slots, and per-cell labeling.
- [ ] Add helpers that map bead hex colors to bead IDs and grouped legend tiles.
- [ ] Render a single page canvas with white transparent cells, 5-step dashed grid lines, 10-step solid grid lines, rulers on all four sides, and bead IDs inside colored cells.

### Task 2: Swap bead preview to use the rendered page image

**Files:**
- Modify: `src/components/ScenarioExportPreviewDialog.tsx`
- Modify: `src/components/ScenarioExportPanel.tsx`
- Modify: `src/styles/canvas.css`

- [ ] Generate the bead page image when the preview dialog opens.
- [ ] Show the page image inside the preview dialog paper frame instead of the loose HTML export layout.
- [ ] Keep the existing HTML export sheet for other scenarios until they get a dedicated renderer too.

### Task 3: Export the same rendered bead page to PDF

**Files:**
- Modify: `src/utils/exportPdf.ts`

- [ ] Replace the current text-and-rect PDF generation path for bead charts with `addImage` using the shared rendered canvas.
- [ ] Pick portrait vs landscape automatically based on available chart area so wide charts can rotate for a larger printable area.
- [ ] Keep crochet export behavior unchanged for now.

### Task 4: Verify the behavior

**Files:**
- Modify: `src/hooks/App.output-modes.test.tsx`

- [ ] Add checks that the dedicated preview dialog still opens for bead charts.
- [ ] Keep the export action test green after the bead renderer swap.
- [ ] Run `npm test -- --run src/hooks/App.output-modes.test.tsx`.
- [ ] Run `npm run build`.
