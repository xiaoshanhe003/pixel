import { useEffect, useMemo, useState } from 'react';
import type { BeadBrand } from '../data/beadPalettes';
import { DEFAULT_OPTIONS, SCENARIOS } from '../constants/studio';
import type { ConversionOptions, PixelGrid } from '../types/pixel';
import type {
  EditorTool,
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
  addFrameToDocument,
  addLayerToActiveFrame,
  composeFrame,
  countPaletteUsage,
  createDocumentFromGrid,
  createStudioDocument,
  deleteActiveFrame,
  deleteActiveLayer,
  drawLineOnActiveLayer,
  drawRectangleOnActiveLayer,
  duplicateActiveFrame,
  duplicateActiveLayer,
  fillActiveLayerArea,
  getTransparentCount,
  mergeActiveLayerDown,
  moveLayer,
  moveLayerToIndex,
  renameLayer,
  replaceActiveLayerCell,
  setActiveFrame,
  setActiveLayer,
  setLayerOpacity,
  toggleLayerLock,
  toggleLayerVisibility,
} from '../utils/studio';

type ExportMode = 'bead-chart' | 'bead-list' | 'crochet-chart' | 'crochet-rows';

export type StudioFramePreview = {
  frame: StudioFrame;
  preview: PixelGrid;
};

type StudioSourceState = {
  selectedFile: File | null;
  previewUrl?: string;
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
  };
  source: StudioSourceState;
  editor: {
    activeColor: string;
    activeTool: EditorTool;
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
    setCanvasZoom: (updater: (current: number) => number) => void;
    toggleGridLines: () => void;
    setPreviewFps: (fps: number) => void;
    selectFrame: (frameId: string) => void;
    createBlankCanvas: () => void;
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
    duplicateLayer: () => void;
    deleteLayer: () => void;
    mergeLayerDown: () => void;
    renameLayer: (layerId: string, name: string) => void;
    toggleLayerVisibility: (layerId: string) => void;
    toggleLayerLock: (layerId: string) => void;
    moveLayer: (layerId: string, direction: 'up' | 'down') => void;
    reorderLayer: (layerId: string, targetIndex: number) => void;
    setLayerOpacity: (layerId: string, opacity: number) => void;
  };
};

function useStudioDocumentSync(params: {
  activeScenario: ScenarioId;
  conversionOptions: ConversionOptions;
  selectedFile: File | null;
  setDocument: React.Dispatch<React.SetStateAction<StudioDocument>>;
}) {
  const { activeScenario, conversionOptions, selectedFile, setDocument } = params;
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(undefined);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    let cancelled = false;

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
          setDocument(createDocumentFromGrid(activeScenario, nextGrid));
        }
      } catch {
        if (!cancelled) {
          setDocument(createStudioDocument(activeScenario, conversionOptions.gridSize));
        }
      }
    })();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [activeScenario, conversionOptions, selectedFile, setDocument]);

  useEffect(() => {
    if (selectedFile) {
      return;
    }

    setDocument((current) => {
      if (
        current.width === conversionOptions.gridSize &&
        current.height === conversionOptions.gridSize
      ) {
        return current;
      }

      return createStudioDocument(activeScenario, conversionOptions.gridSize);
    });
  }, [activeScenario, conversionOptions.gridSize, selectedFile, setDocument]);

  useEffect(() => {
    setDocument((current) =>
      current.scenario === activeScenario
        ? current
        : { ...current, scenario: activeScenario },
    );
  }, [activeScenario, setDocument]);

  return { previewUrl, setPreviewUrl };
}

function useStudioPlayback(params: {
  activeScenario: ScenarioId;
  frameCount: number;
  previewFps: number;
  previewIsPlaying: boolean;
  setDocument: React.Dispatch<React.SetStateAction<StudioDocument>>;
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
  const [document, setDocument] = useState<StudioDocument>(
    createStudioDocument('pixel', DEFAULT_OPTIONS.gridSize),
  );
  const [activeColor, setActiveColor] = useState('#d65a31');
  const [activeTool, setActiveTool] = useState<EditorTool>('paint');
  const [canvasZoom, setCanvasZoom] = useState(1);
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

  const { previewUrl, setPreviewUrl } = useStudioDocumentSync({
    activeScenario,
    conversionOptions,
    selectedFile,
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

  function updateActiveLayer(
    updater: (current: StudioDocument) => StudioDocument,
  ) {
    if (!derived.activeFrame || !derived.activeLayer) {
      return;
    }

    setDocument(updater);
  }

  return {
    controls: {
      conversionOptions,
    },
    source: {
      selectedFile,
      previewUrl,
    },
    editor: {
      activeColor,
      activeTool,
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
      setCanvasZoom,
      toggleGridLines: () => setShowGridLines((current) => !current),
      setPreviewFps,
      selectFrame: (frameId) =>
        setDocument((current) => setActiveFrame(current, frameId)),
      createBlankCanvas: () => {
        setSelectedFile(null);
        setPreviewUrl(undefined);
        setDocument(createStudioDocument(activeScenario, conversionOptions.gridSize));
        setCanvasZoom(1);
      },
      addFrame: () => setDocument((current) => addFrameToDocument(current)),
      duplicateFrame: () => setDocument((current) => duplicateActiveFrame(current)),
      deleteFrame: () => setDocument((current) => deleteActiveFrame(current)),
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
        updateActiveLayer((current) => replaceActiveLayerCell(current, x, y, color)),
      sampleCell: (color) => {
        if (!color) {
          return;
        }

        setActiveColor(color);
        setActiveTool('paint');
      },
      fillArea: (x, y, color) =>
        updateActiveLayer((current) => fillActiveLayerArea(current, x, y, color)),
      drawLine: (startX, startY, endX, endY, color) =>
        updateActiveLayer((current) =>
          drawLineOnActiveLayer(current, startX, startY, endX, endY, color),
        ),
      drawRectangle: (startX, startY, endX, endY, color) =>
        updateActiveLayer((current) =>
          drawRectangleOnActiveLayer(current, startX, startY, endX, endY, color),
        ),
      selectLayer: (layerId) =>
        setDocument((current) => setActiveLayer(current, layerId)),
      addLayer: () => setDocument((current) => addLayerToActiveFrame(current)),
      duplicateLayer: () => setDocument((current) => duplicateActiveLayer(current)),
      deleteLayer: () => setDocument((current) => deleteActiveLayer(current)),
      mergeLayerDown: () => setDocument((current) => mergeActiveLayerDown(current)),
      renameLayer: (layerId, name) =>
        setDocument((current) => renameLayer(current, layerId, name)),
      toggleLayerVisibility: (layerId) =>
        setDocument((current) => toggleLayerVisibility(current, layerId)),
      toggleLayerLock: (layerId) =>
        setDocument((current) => toggleLayerLock(current, layerId)),
      moveLayer: (layerId, direction) =>
        setDocument((current) => moveLayer(current, layerId, direction)),
      reorderLayer: (layerId, targetIndex) =>
        setDocument((current) => moveLayerToIndex(current, layerId, targetIndex)),
      setLayerOpacity: (layerId, opacity) =>
        setDocument((current) => setLayerOpacity(current, layerId, opacity)),
    },
  };
}
