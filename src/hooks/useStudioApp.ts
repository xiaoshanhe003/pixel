import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BeadBrand } from '../data/beadPalettes';
import { DEFAULT_OPTIONS, FIT_WINDOW_ZOOM, SCENARIOS } from '../constants/studio';
import type { ConversionOptions, PixelGrid } from '../types/pixel';
import type {
  EditorSelection,
  EditorTool,
  EditorToolSettings,
  ScenarioDefinition,
  ScenarioId,
  StudioDocument,
  StudioFrame,
  StudioLayer,
} from '../types/studio';
import type { SquareCrop } from '../utils/image';
import {
  buildBeadNoiseCleanupMap,
  countBeadUsage,
  mapColorToBeadPalette,
  mapGridToBeadPalette,
} from '../utils/beads';
import { analyzeCrochetPattern, type CrochetPatternAnalysis } from '../utils/crochet';
import { fileToImageElement, imageSourceToImageData } from '../utils/image';
import { buildPixelGrid } from '../utils/pixelPipeline';
import { printScenarioExport } from '../utils/printScenario';
import { measureOccupiedGridSize } from '../utils/scenarioExport';
import {
  type BrushPoint,
  composeFrame,
  countPaletteUsage,
  createDocumentFromGrid,
  createStudioDocument,
  getTransparentCount,
  setActiveLayer,
} from '../utils/studio';
import {
  applyStudioCommandToHistory,
  applyStudioCommandFromBaseToHistory,
  executeStudioCommand,
  applyStudioTransientUpdate,
  createStudioHistoryState,
  redoStudioHistory,
  resetStudioHistory,
  undoStudioHistory,
  type StudioHistoryState,
} from '../utils/studioCommands';

type ExportMode = 'bead-chart' | 'bead-list' | 'crochet-chart' | 'crochet-rows';

function clampSelectionToDocument(
  selection: EditorSelection,
  document: StudioDocument,
): EditorSelection {
  const minX = Math.max(0, Math.min(document.width - selection.width, selection.minX));
  const minY = Math.max(0, Math.min(document.height - selection.height, selection.minY));
  const width = Math.max(1, Math.min(selection.width, document.width - minX));
  const height = Math.max(1, Math.min(selection.height, document.height - minY));

  return {
    minX,
    minY,
    maxX: minX + width - 1,
    maxY: minY + height - 1,
    width,
    height,
  };
}

type StudioSourceState = {
  sourceFile: File | null;
  appliedFile: File | null;
  previewUrl?: string;
  isProcessingUpload: boolean;
  appliedCrop: SquareCrop | null;
};

type StudioOutputState = {
  beadBrand: BeadBrand;
  beadUsage: ReturnType<typeof countBeadUsage>;
  crochetAnalysis: CrochetPatternAnalysis | null;
  crochetViewMode: 'color' | 'symbol';
  beadExportMode: 'bead-chart' | 'bead-list';
  crochetExportMode: 'crochet-chart' | 'crochet-rows';
};

type StudioStats = {
  paletteCounts: ReturnType<typeof countPaletteUsage>;
  transparentCount: number;
  materialCountLabel?: string;
};

type StudioDerivedState = {
  scenario: ScenarioDefinition;
  activeFrame?: StudioFrame;
  activeLayer?: StudioLayer;
  activeGrid: PixelGrid | null;
  output: StudioOutputState;
  stats: StudioStats;
};

export type UseStudioAppResult = {
  controls: {
    conversionOptions: ConversionOptions;
    canUndo: boolean;
    canRedo: boolean;
  };
  source: StudioSourceState;
  editor: {
    activeColor: string;
    activeTool: EditorTool;
    toolSettings: EditorToolSettings;
    canvasZoom: number;
    showGridLines: boolean;
    selection: EditorSelection | null;
  };
  studio: {
    document: StudioDocument;
    activeScenario: ScenarioId;
    scenario: ScenarioDefinition;
    activeFrame?: StudioFrame;
    activeLayer?: StudioLayer;
    activeGrid: PixelGrid | null;
  };
  output: StudioOutputState;
  stats: StudioStats;
  actions: {
    applySourceImage: (params: {
      sourceFile: File;
      appliedFile: File;
      crop: SquareCrop | null;
      conversionOptions: ConversionOptions;
      beadBrand: BeadBrand;
    }) => void;
    clearSourceImage: () => void;
    setConversionOptions: (options: ConversionOptions) => void;
    setActiveScenario: (scenarioId: ScenarioId) => void;
    setActiveColor: (color: string) => void;
    setActiveTool: (tool: EditorTool) => void;
    setToolSettings: (
      updater: (current: EditorToolSettings) => EditorToolSettings,
    ) => void;
    setCanvasZoom: (updater: (current: number) => number) => void;
    toggleGridLines: () => void;
    createBlankCanvas: () => void;
    undo: () => void;
    redo: () => void;
    printExport: () => void;
    setCrochetViewMode: (mode: 'color' | 'symbol') => void;
    setBeadBrand: (brand: BeadBrand) => void;
    setExportMode: (mode: ExportMode) => void;
    cleanupBeadNoise: () => void;
    paintCell: (x: number, y: number, color: string | null) => void;
    previewPaintStroke: (
      points: BrushPoint[],
      color: string | null,
    ) => void;
    commitPaintStroke: (
      points: BrushPoint[],
      color: string | null,
    ) => void;
    sampleCell: (color: string | null) => void;
    fillArea: (x: number, y: number, color: string | null) => void;
    drawLine: (
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      color: string | null,
    ) => void;
    drawRectangle: (
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      color: string | null,
    ) => void;
    setSelection: (selection: EditorSelection | null) => void;
    previewMoveSelection: (offsetX: number, offsetY: number) => void;
    commitMoveSelection: (offsetX: number, offsetY: number) => void;
    previewScaleSelection: (targetWidth: number, targetHeight: number) => void;
    commitScaleSelection: (targetWidth: number, targetHeight: number) => void;
    selectLayer: (layerId: string) => void;
    addLayer: () => void;
    duplicateLayer: (layerId?: string) => void;
    deleteLayer: (layerId?: string) => void;
    mergeLayerDown: (layerId?: string) => void;
    renameLayer: (layerId: string, name: string) => void;
    toggleLayerVisibility: (layerId: string) => void;
    toggleLayerLock: (layerId: string) => void;
    clearLayer: (layerId: string) => void;
    moveLayer: (layerId: string, direction: 'up' | 'down') => void;
    reorderLayer: (layerId: string, targetIndex: number) => void;
    setLayerOpacity: (layerId: string, opacity: number) => void;
  };
};

function useStudioDocumentSync(params: {
  document: StudioDocument;
  activeScenario: ScenarioId;
  conversionOptions: ConversionOptions;
  appliedFile: File | null;
  resetDocument: (document: StudioDocument) => void;
  setDocument: (
    updater: (current: StudioDocument) => StudioDocument,
  ) => void;
}) {
  const { document, activeScenario, conversionOptions, appliedFile, resetDocument, setDocument } =
    params;
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  useEffect(() => {
    if (!appliedFile) {
      setIsProcessingUpload(false);
      setPreviewUrl(undefined);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(appliedFile);
    let cancelled = false;

    setIsProcessingUpload(true);
    setPreviewUrl(nextPreviewUrl);

    void (async () => {
      try {
        const image = await fileToImageElement(appliedFile);
        const imageData = imageSourceToImageData(
          image,
          image.naturalWidth || image.width,
          image.naturalHeight || image.height,
          true,
        );
        const nextGrid = buildPixelGrid(imageData, conversionOptions);

        if (!cancelled) {
          resetDocument(createDocumentFromGrid(activeScenario, nextGrid));
          setIsProcessingUpload(false);
        }
      } catch {
        if (!cancelled) {
          resetDocument(createStudioDocument(activeScenario, conversionOptions.gridSize));
          setIsProcessingUpload(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      setIsProcessingUpload(false);
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [activeScenario, appliedFile, conversionOptions, resetDocument]);

  useEffect(() => {
    if (appliedFile) {
      return;
    }

    if (
      document.width === conversionOptions.gridSize &&
      document.height === conversionOptions.gridSize
    ) {
      return;
    }

    resetDocument(createStudioDocument(activeScenario, conversionOptions.gridSize));
  }, [
    activeScenario,
    conversionOptions.gridSize,
    document.height,
    document.width,
    resetDocument,
    appliedFile,
  ]);

  useEffect(() => {
    setDocument((current) =>
      current.scenario === activeScenario
        ? current
        : { ...current, scenario: activeScenario },
    );
  }, [activeScenario, setDocument]);

  return { previewUrl, setPreviewUrl, isProcessingUpload };
}

function useStudioDerivedState(params: {
  document: StudioDocument;
  activeScenario: ScenarioId;
  beadBrand: BeadBrand;
  crochetViewMode: 'color' | 'symbol';
  beadExportMode: 'bead-chart' | 'bead-list';
  crochetExportMode: 'crochet-chart' | 'crochet-rows';
}): StudioDerivedState {
  const { document, activeScenario, beadBrand, crochetViewMode, beadExportMode, crochetExportMode } =
    params;

  return useMemo(() => {
    const activeFrame =
      document.frames.find((frame) => frame.id === document.activeFrameId) ?? document.frames[0];
    const activeLayer =
      activeFrame?.layers.find((layer) => layer.id === activeFrame.activeLayerId) ?? activeFrame?.layers[0];
    const baseActiveGrid = activeFrame
      ? composeFrame(activeFrame, document.width, document.height)
      : null;
    const activeGrid =
      activeScenario === 'beads' && baseActiveGrid
        ? mapGridToBeadPalette(baseActiveGrid, beadBrand)
        : baseActiveGrid;
    const paletteCounts = countPaletteUsage(activeGrid);
    const transparentCount = getTransparentCount(activeGrid);
    const beadUsage =
      activeScenario === 'beads' && activeGrid
        ? countBeadUsage(activeGrid, beadBrand)
        : [];
    const crochetAnalysis =
      activeScenario === 'crochet' && activeGrid
        ? analyzeCrochetPattern(activeGrid)
        : null;
    const scenario =
      SCENARIOS.find((item) => item.id === activeScenario) ?? SCENARIOS[0];
    const materialCountLabel =
      activeScenario === 'beads'
        ? `材料总数：${beadUsage.reduce((sum, item) => sum + item.count, 0)} 颗`
        : undefined;

    return {
      scenario,
      activeFrame,
      activeLayer,
      activeGrid,
      output: {
        beadBrand,
        beadUsage,
        crochetAnalysis,
        crochetViewMode,
        beadExportMode,
        crochetExportMode,
      },
      stats: {
        paletteCounts,
        transparentCount,
        materialCountLabel,
      },
    };
  }, [
    activeScenario,
    beadBrand,
    beadExportMode,
    crochetExportMode,
    crochetViewMode,
    document,
  ]);
}

export function useStudioApp(): UseStudioAppResult {
  const [conversionOptions, setConversionOptions] =
    useState<ConversionOptions>(DEFAULT_OPTIONS);
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('pixel');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [appliedFile, setAppliedFile] = useState<File | null>(null);
  const [appliedCrop, setAppliedCrop] = useState<SquareCrop | null>(null);
  const [history, setHistory] = useState<StudioHistoryState>(() =>
    createStudioHistoryState(createStudioDocument('pixel', DEFAULT_OPTIONS.gridSize)),
  );
  const [activeColor, setActiveColor] = useState('#000000');
  const [activeTool, setActiveTool] = useState<EditorTool>('move');
  const [toolSettings, setToolSettings] = useState<EditorToolSettings>({
    paintSize: 1,
    eraseSize: 1,
    shapePreviewMode: 'outline',
  });
  const [canvasZoom, setCanvasZoom] = useState(FIT_WINDOW_ZOOM);
  const [showGridLines, setShowGridLines] = useState(true);
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [beadBrand, setBeadBrand] = useState<BeadBrand>('mard');
  const [crochetViewMode, setCrochetViewMode] = useState<'color' | 'symbol'>('color');
  const [beadExportMode, setBeadExportMode] = useState<'bead-chart' | 'bead-list'>(
    'bead-chart',
  );
  const [crochetExportMode, setCrochetExportMode] = useState<
    'crochet-chart' | 'crochet-rows'
  >('crochet-chart');
  const strokeBaseDocumentRef = useRef<StudioDocument | null>(null);
  const selectionBaseDocumentRef = useRef<StudioDocument | null>(null);

  const document = history.present;

  const setDocument = useCallback(
    (updater: (current: StudioDocument) => StudioDocument) => {
      setHistory((current) => applyStudioTransientUpdate(current, updater));
    },
    [],
  );

  const resetDocument = useCallback((nextDocument: StudioDocument) => {
    setHistory(resetStudioHistory(nextDocument));
  }, []);

  const { previewUrl, setPreviewUrl, isProcessingUpload } = useStudioDocumentSync({
    document,
    activeScenario,
    conversionOptions,
    appliedFile,
    resetDocument,
    setDocument,
  });

  const derived = useStudioDerivedState({
    document,
    activeScenario,
    beadBrand,
    crochetViewMode,
    beadExportMode,
    crochetExportMode,
  });
  const effectiveActiveColor =
    activeScenario === 'beads'
      ? mapColorToBeadPalette(activeColor, beadBrand)
      : activeColor;

  useEffect(() => {
    if (activeScenario !== 'beads') {
      return;
    }

    setActiveColor((current) => {
      const mapped = mapColorToBeadPalette(current, beadBrand);
      return mapped === current ? current : mapped;
    });
  }, [activeScenario, beadBrand]);

  useEffect(() => {
    setSelection(null);
    selectionBaseDocumentRef.current = null;
  }, [document.activeFrameId, document.width, document.height, derived.activeLayer?.id]);

  function dispatchCommand(command: Parameters<typeof applyStudioCommandToHistory>[1]) {
    if (!derived.activeLayer) {
      return;
    }

    strokeBaseDocumentRef.current = null;
    selectionBaseDocumentRef.current = null;
    setHistory((current) => applyStudioCommandToHistory(current, command));
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (!isModifierPressed || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        setHistory((current) => undoStudioHistory(current));
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        setHistory((current) => redoStudioHistory(current));
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return {
    controls: {
      conversionOptions,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    },
    source: {
      sourceFile,
      appliedFile,
      previewUrl,
      isProcessingUpload,
      appliedCrop,
    },
    editor: {
      activeColor: effectiveActiveColor,
      activeTool,
      toolSettings,
      canvasZoom,
      showGridLines,
      selection,
    },
    studio: {
      document,
      activeScenario,
      scenario: derived.scenario,
      activeFrame: derived.activeFrame,
      activeLayer: derived.activeLayer,
      activeGrid: derived.activeGrid,
    },
    output: derived.output,
    stats: derived.stats,
    actions: {
      applySourceImage: ({
        sourceFile: nextSourceFile,
        appliedFile: nextAppliedFile,
        crop,
        conversionOptions: nextConversionOptions,
        beadBrand: nextBeadBrand,
      }) => {
        strokeBaseDocumentRef.current = null;
        selectionBaseDocumentRef.current = null;
        setSelection(null);
        setSourceFile(nextSourceFile);
        setAppliedFile(nextAppliedFile);
        setAppliedCrop(crop);
        setConversionOptions(nextConversionOptions);
        setBeadBrand(nextBeadBrand);
        setCanvasZoom(FIT_WINDOW_ZOOM);
      },
      clearSourceImage: () => {
        strokeBaseDocumentRef.current = null;
        selectionBaseDocumentRef.current = null;
        setSelection(null);
        setSourceFile(null);
        setAppliedFile(null);
        setAppliedCrop(null);
      },
      setConversionOptions,
      setActiveScenario,
      setActiveColor: (color) =>
        setActiveColor(
          activeScenario === 'beads' ? mapColorToBeadPalette(color, beadBrand) : color,
        ),
      setActiveTool,
      setSelection: (nextSelection) => {
        selectionBaseDocumentRef.current = null;
        setSelection(nextSelection);
      },
      setToolSettings: (updater) =>
        setToolSettings((current) => updater(current)),
      setCanvasZoom,
      toggleGridLines: () => setShowGridLines((current) => !current),
      createBlankCanvas: () => {
        setSourceFile(null);
        setAppliedFile(null);
        setAppliedCrop(null);
        setPreviewUrl(undefined);
        strokeBaseDocumentRef.current = null;
        selectionBaseDocumentRef.current = null;
        setSelection(null);
        resetDocument(createStudioDocument(activeScenario, conversionOptions.gridSize));
        setCanvasZoom(FIT_WINDOW_ZOOM);
      },
      undo: () => {
        strokeBaseDocumentRef.current = null;
        selectionBaseDocumentRef.current = null;
        setSelection(null);
        setHistory((current) => undoStudioHistory(current));
      },
      redo: () => {
        strokeBaseDocumentRef.current = null;
        selectionBaseDocumentRef.current = null;
        setSelection(null);
        setHistory((current) => redoStudioHistory(current));
      },
      printExport: () => {
        if (!derived.activeGrid) {
          window.print();
          return;
        }

        const occupiedSize = measureOccupiedGridSize(derived.activeGrid);

        if (occupiedSize.rows === 0 || occupiedSize.columns === 0) {
          return;
        }

        if (activeScenario === 'beads') {
          printScenarioExport({
            scenario: 'beads',
            grid: derived.activeGrid,
            beadBrand,
            beadUsage: derived.output.beadUsage,
          });
          return;
        }

        printScenarioExport({
          scenario: 'crochet',
          grid: derived.activeGrid,
          crochetAnalysis: derived.output.crochetAnalysis,
        });
      },
      setCrochetViewMode,
      setBeadBrand,
      setExportMode: (mode) => {
        if (activeScenario === 'beads') {
          setBeadExportMode(mode as 'bead-chart' | 'bead-list');
          return;
        }

        setCrochetExportMode(mode as 'crochet-chart' | 'crochet-rows');
      },
      cleanupBeadNoise: () => {
        if (activeScenario !== 'beads' || !derived.activeGrid) {
          return;
        }

        const replacements = buildBeadNoiseCleanupMap(derived.activeGrid, 3);

        if (replacements.size === 0) {
          return;
        }

        dispatchCommand({
          type: 'remapBeadColors',
          brand: beadBrand,
          replacements: [...replacements.entries()].map(([from, to]) => ({ from, to })),
        });
      },
      paintCell: (x, y, color) =>
        dispatchCommand(
          activeTool === 'paint' || activeTool === 'erase'
            ? {
                type: 'paintCell',
                x,
                y,
                size: activeTool === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize,
                color,
              }
            : { type: 'replaceCell', x, y, color },
        ),
      previewPaintStroke: (points, color) => {
        if (
          !derived.activeFrame ||
          !derived.activeLayer ||
          (activeTool !== 'paint' && activeTool !== 'erase') ||
          points.length === 0
        ) {
          return;
        }

        const size = activeTool === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize;

        setHistory((current) => {
          const baseDocument =
            strokeBaseDocumentRef.current ?? structuredClone(current.present);
          strokeBaseDocumentRef.current = baseDocument;

          return applyStudioTransientUpdate(current, () =>
            executeStudioCommand(baseDocument, {
              type: 'paintStroke',
              points,
              size,
              color,
            }),
          );
        });
      },
      commitPaintStroke: (points, color) => {
        if (
          !derived.activeFrame ||
          !derived.activeLayer ||
          (activeTool !== 'paint' && activeTool !== 'erase') ||
          points.length === 0
        ) {
          return;
        }

        const size = activeTool === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize;

        setHistory((current) => {
          const baseDocument = strokeBaseDocumentRef.current ?? current.present;
          strokeBaseDocumentRef.current = null;

          return applyStudioCommandFromBaseToHistory(current, baseDocument, {
            type: 'paintStroke',
            points,
            size,
            color,
          });
        });
      },
      sampleCell: (color) => {
        if (!color) {
          return;
        }

        setActiveColor(
          activeScenario === 'beads' ? mapColorToBeadPalette(color, beadBrand) : color,
        );
        setActiveTool('paint');
      },
      fillArea: (x, y, color) => dispatchCommand({ type: 'fillArea', x, y, color }),
      drawLine: (startX, startY, endX, endY, color) =>
        dispatchCommand({ type: 'drawLine', startX, startY, endX, endY, color }),
      drawRectangle: (startX, startY, endX, endY, color) =>
        dispatchCommand({ type: 'drawRectangle', startX, startY, endX, endY, color }),
      previewMoveSelection: (offsetX, offsetY) => {
        if (!derived.activeLayer || !selection) {
          return;
        }

        setHistory((current) => {
          const baseDocument =
            selectionBaseDocumentRef.current ?? structuredClone(current.present);
          selectionBaseDocumentRef.current = baseDocument;

          return applyStudioTransientUpdate(current, () =>
            executeStudioCommand(baseDocument, {
              type: 'moveSelection',
              bounds: selection,
              offsetX,
              offsetY,
            }),
          );
        });
      },
      commitMoveSelection: (offsetX, offsetY) => {
        const baseDocument = selectionBaseDocumentRef.current ?? history.present;
        selectionBaseDocumentRef.current = null;

        if (!selection) {
          return;
        }

        setHistory((current) =>
          applyStudioCommandFromBaseToHistory(current, baseDocument, {
            type: 'moveSelection',
            bounds: selection,
            offsetX,
            offsetY,
          }),
        );
        setSelection(
          clampSelectionToDocument(
            {
              ...selection,
              minX: selection.minX + offsetX,
              minY: selection.minY + offsetY,
            },
            document,
          ),
        );
      },
      previewScaleSelection: (targetWidth, targetHeight) => {
        if (!derived.activeLayer || !selection) {
          return;
        }

        setHistory((current) => {
          const baseDocument =
            selectionBaseDocumentRef.current ?? structuredClone(current.present);
          selectionBaseDocumentRef.current = baseDocument;

          return applyStudioTransientUpdate(current, () =>
            executeStudioCommand(baseDocument, {
              type: 'scaleSelection',
              bounds: selection,
              targetWidth,
              targetHeight,
            }),
          );
        });
      },
      commitScaleSelection: (targetWidth, targetHeight) => {
        const baseDocument = selectionBaseDocumentRef.current ?? history.present;
        selectionBaseDocumentRef.current = null;

        if (!selection) {
          return;
        }

        setHistory((current) =>
          applyStudioCommandFromBaseToHistory(current, baseDocument, {
            type: 'scaleSelection',
            bounds: selection,
            targetWidth,
            targetHeight,
          }),
        );
        setSelection(
          clampSelectionToDocument(
            {
              ...selection,
              width: targetWidth,
              height: targetHeight,
            },
            document,
          ),
        );
      },
      selectLayer: (layerId) =>
        setDocument((current) => setActiveLayer(current, layerId)),
      addLayer: () => dispatchCommand({ type: 'addLayer' }),
      duplicateLayer: (layerId) => dispatchCommand({ type: 'duplicateLayer', layerId }),
      deleteLayer: (layerId) => dispatchCommand({ type: 'deleteLayer', layerId }),
      mergeLayerDown: (layerId) => dispatchCommand({ type: 'mergeLayerDown', layerId }),
      renameLayer: (layerId, name) => dispatchCommand({ type: 'renameLayer', layerId, name }),
      toggleLayerVisibility: (layerId) =>
        dispatchCommand({ type: 'toggleLayerVisibility', layerId }),
      toggleLayerLock: (layerId) => dispatchCommand({ type: 'toggleLayerLock', layerId }),
      clearLayer: (layerId) => dispatchCommand({ type: 'clearLayer', layerId }),
      moveLayer: (layerId, direction) =>
        dispatchCommand({ type: 'moveLayer', layerId, direction }),
      reorderLayer: (layerId, targetIndex) =>
        dispatchCommand({ type: 'reorderLayer', layerId, targetIndex }),
      setLayerOpacity: (layerId, opacity) =>
        dispatchCommand({ type: 'setLayerOpacity', layerId, opacity }),
    },
  };
}
