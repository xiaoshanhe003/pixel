import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BeadBrand } from '../data/beadPalettes';
import { DEFAULT_OPTIONS, FIT_WINDOW_ZOOM, SCENARIOS } from '../constants/studio';
import type { ConversionOptions, PixelGrid } from '../types/pixel';
import type {
  EditorTool,
  EditorToolSettings,
  ScenarioDefinition,
  ScenarioId,
  StudioDocument,
  StudioFrame,
  StudioLayer,
} from '../types/studio';
import { countBeadUsage, mapGridToBeadPalette } from '../utils/beads';
import { analyzeCrochetPattern, type CrochetPatternAnalysis } from '../utils/crochet';
import { fileToImageElement, imageSourceToImageData } from '../utils/image';
import { buildPixelGrid } from '../utils/pixelPipeline';
import {
  composeFrame,
  countPaletteUsage,
  createDocumentFromGrid,
  createStudioDocument,
  getTransparentCount,
  setActiveFrame,
  setActiveLayer,
} from '../utils/studio';
import {
  applyStudioCommandToHistory,
  applyStudioTransientUpdate,
  createStudioHistoryState,
  redoStudioHistory,
  resetStudioHistory,
  undoStudioHistory,
  type StudioHistoryState,
} from '../utils/studioCommands';

type ExportMode = 'bead-chart' | 'bead-list' | 'crochet-chart' | 'crochet-rows';

export type StudioFramePreview = {
  frame: StudioFrame;
  preview: PixelGrid;
};

type StudioSourceState = {
  selectedFile: File | null;
  previewUrl?: string;
  isProcessingUpload: boolean;
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
  framePreviews: StudioFramePreview[];
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
  };
  studio: {
    document: StudioDocument;
    activeScenario: ScenarioId;
    scenario: ScenarioDefinition;
    activeFrame?: StudioFrame;
    activeLayer?: StudioLayer;
    framePreviews: StudioFramePreview[];
    activeGrid: PixelGrid | null;
    previewIsPlaying: boolean;
    previewFps: number;
  };
  output: StudioOutputState;
  stats: StudioStats;
  actions: {
    setSelectedFile: (file: File | null) => void;
    setConversionOptions: (options: ConversionOptions) => void;
    setActiveScenario: (scenarioId: ScenarioId) => void;
    setActiveColor: (color: string) => void;
    setActiveTool: (tool: EditorTool) => void;
    setToolSettings: (
      updater: (current: EditorToolSettings) => EditorToolSettings,
    ) => void;
    setCanvasZoom: (updater: (current: number) => number) => void;
    toggleGridLines: () => void;
    setPreviewFps: (fps: number) => void;
    selectFrame: (frameId: string) => void;
    createBlankCanvas: () => void;
    undo: () => void;
    redo: () => void;
    addFrame: () => void;
    duplicateFrame: () => void;
    deleteFrame: () => void;
    togglePlayback: () => void;
    printExport: () => void;
    setCrochetViewMode: (mode: 'color' | 'symbol') => void;
    setBeadBrand: (brand: BeadBrand) => void;
    setExportMode: (mode: ExportMode) => void;
    paintCell: (x: number, y: number, color: string | null) => void;
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
  selectedFile: File | null;
  resetDocument: (document: StudioDocument) => void;
  setDocument: (
    updater: (current: StudioDocument) => StudioDocument,
  ) => void;
}) {
  const { document, activeScenario, conversionOptions, selectedFile, resetDocument, setDocument } =
    params;
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setIsProcessingUpload(false);
      setPreviewUrl(undefined);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    let cancelled = false;

    setIsProcessingUpload(true);
    setPreviewUrl(nextPreviewUrl);

    void (async () => {
      try {
        const image = await fileToImageElement(selectedFile);
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
  }, [activeScenario, conversionOptions, resetDocument, selectedFile]);

  useEffect(() => {
    if (selectedFile) {
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
    selectedFile,
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

function useStudioPlayback(params: {
  activeScenario: ScenarioId;
  frameCount: number;
  previewFps: number;
  previewIsPlaying: boolean;
  setDocument: (
    updater: (current: StudioDocument) => StudioDocument,
  ) => void;
}) {
  const { activeScenario, frameCount, previewFps, previewIsPlaying, setDocument } = params;

  useEffect(() => {
    if (activeScenario !== 'pixel' || !previewIsPlaying || frameCount <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setDocument((current) => {
        if (current.frames.length <= 1) {
          return current;
        }

        const activeIndex = current.frames.findIndex(
          (frame) => frame.id === current.activeFrameId,
        );
        const nextFrame =
          current.frames[(activeIndex + 1) % current.frames.length] ?? current.frames[0];

        return {
          ...current,
          activeFrameId: nextFrame.id,
        };
      });
    }, Math.round(1000 / previewFps));

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeScenario, frameCount, previewFps, previewIsPlaying, setDocument]);
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
      document.frames.find((frame) => frame.id === document.activeFrameId) ??
      document.frames[0];
    const activeLayer =
      activeFrame?.layers.find((layer) => layer.id === activeFrame.activeLayerId) ??
      activeFrame?.layers[0];
    const framePreviews = document.frames.map((frame) => ({
      frame,
      preview: composeFrame(frame, document.width, document.height),
    }));
    const baseActiveGrid =
      framePreviews.find((item) => item.frame.id === document.activeFrameId)?.preview ??
      null;
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
      framePreviews,
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [history, setHistory] = useState<StudioHistoryState>(() =>
    createStudioHistoryState(createStudioDocument('pixel', DEFAULT_OPTIONS.gridSize)),
  );
  const [activeColor, setActiveColor] = useState('#d65a31');
  const [activeTool, setActiveTool] = useState<EditorTool>('paint');
  const [toolSettings, setToolSettings] = useState<EditorToolSettings>({
    paintSize: 1,
    eraseSize: 1,
    shapePreviewMode: 'outline',
  });
  const [canvasZoom, setCanvasZoom] = useState(FIT_WINDOW_ZOOM);
  const [showGridLines, setShowGridLines] = useState(true);
  const [previewIsPlaying, setPreviewIsPlaying] = useState(false);
  const [previewFps, setPreviewFps] = useState(6);
  const [beadBrand, setBeadBrand] = useState<BeadBrand>('perler');
  const [crochetViewMode, setCrochetViewMode] = useState<'color' | 'symbol'>('color');
  const [beadExportMode, setBeadExportMode] = useState<'bead-chart' | 'bead-list'>(
    'bead-chart',
  );
  const [crochetExportMode, setCrochetExportMode] = useState<
    'crochet-chart' | 'crochet-rows'
  >('crochet-chart');

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
    selectedFile,
    resetDocument,
    setDocument,
  });

  useStudioPlayback({
    activeScenario,
    frameCount: document.frames.length,
    previewFps,
    previewIsPlaying,
    setDocument,
  });

  useEffect(() => {
    if (activeScenario !== 'pixel' || document.frames.length <= 1) {
      setPreviewIsPlaying(false);
    }
  }, [activeScenario, document.frames.length]);

  const derived = useStudioDerivedState({
    document,
    activeScenario,
    beadBrand,
    crochetViewMode,
    beadExportMode,
    crochetExportMode,
  });

  function dispatchCommand(command: Parameters<typeof applyStudioCommandToHistory>[1]) {
    if (!derived.activeFrame || !derived.activeLayer) {
      return;
    }

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
      selectedFile,
      previewUrl,
      isProcessingUpload,
    },
    editor: {
      activeColor,
      activeTool,
      toolSettings,
      canvasZoom,
      showGridLines,
    },
    studio: {
      document,
      activeScenario,
      scenario: derived.scenario,
      activeFrame: derived.activeFrame,
      activeLayer: derived.activeLayer,
      framePreviews: derived.framePreviews,
      activeGrid: derived.activeGrid,
      previewIsPlaying,
      previewFps,
    },
    output: derived.output,
    stats: derived.stats,
    actions: {
      setSelectedFile,
      setConversionOptions,
      setActiveScenario,
      setActiveColor,
      setActiveTool,
      setToolSettings: (updater) =>
        setToolSettings((current) => updater(current)),
      setCanvasZoom,
      toggleGridLines: () => setShowGridLines((current) => !current),
      setPreviewFps,
      selectFrame: (frameId) =>
        setDocument((current) => setActiveFrame(current, frameId)),
      createBlankCanvas: () => {
        setSelectedFile(null);
        setPreviewUrl(undefined);
        resetDocument(createStudioDocument(activeScenario, conversionOptions.gridSize));
        setCanvasZoom(FIT_WINDOW_ZOOM);
      },
      undo: () => setHistory((current) => undoStudioHistory(current)),
      redo: () => setHistory((current) => redoStudioHistory(current)),
      addFrame: () => dispatchCommand({ type: 'addFrame' }),
      duplicateFrame: () => dispatchCommand({ type: 'duplicateFrame' }),
      deleteFrame: () => dispatchCommand({ type: 'deleteFrame' }),
      togglePlayback: () => {
        if (document.frames.length <= 1) {
          return;
        }

        setPreviewIsPlaying((current) => !current);
      },
      printExport: () => window.print(),
      setCrochetViewMode,
      setBeadBrand,
      setExportMode: (mode) => {
        if (activeScenario === 'beads') {
          setBeadExportMode(mode as 'bead-chart' | 'bead-list');
          return;
        }

        setCrochetExportMode(mode as 'crochet-chart' | 'crochet-rows');
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
      sampleCell: (color) => {
        if (!color) {
          return;
        }

        setActiveColor(color);
        setActiveTool('paint');
      },
      fillArea: (x, y, color) => dispatchCommand({ type: 'fillArea', x, y, color }),
      drawLine: (startX, startY, endX, endY, color) =>
        dispatchCommand({ type: 'drawLine', startX, startY, endX, endY, color }),
      drawRectangle: (startX, startY, endX, endY, color) =>
        dispatchCommand({ type: 'drawRectangle', startX, startY, endX, endY, color }),
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
