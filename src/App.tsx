import { useEffect, useState } from 'react';
import BeadPalettePanel from './components/BeadPalettePanel';
import ConversionControls from './components/ConversionControls';
import CrochetChart from './components/CrochetChart';
import CrochetPatternPanel from './components/CrochetPatternPanel';
import EditingToolbar from './components/EditingToolbar';
import FrameStrip from './components/FrameStrip';
import ImageUploader from './components/ImageUploader';
import InspectorPanel from './components/InspectorPanel';
import LayersPanel from './components/LayersPanel';
import PalettePanel from './components/PalettePanel';
import PixelGrid from './components/PixelGrid';
import ScenarioExportPanel from './components/ScenarioExportPanel';
import type { ConversionOptions } from './types/pixel';
import type {
  EditorTool,
  ScenarioDefinition,
  ScenarioId,
  StudioDocument,
} from './types/studio';
import { fileToImageElement, imageSourceToImageData } from './utils/image';
import { countBeadUsage, mapGridToBeadPalette } from './utils/beads';
import { analyzeCrochetPattern } from './utils/crochet';
import { buildPixelGrid } from './utils/pixelPipeline';
import type { BeadBrand } from './data/beadPalettes';
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
  renameLayer,
  replaceActiveLayerCell,
  setActiveFrame,
  setActiveLayer,
  toggleLayerLock,
  toggleLayerVisibility,
} from './utils/studio';

const DEFAULT_OPTIONS: ConversionOptions = {
  gridSize: 16,
  paletteSize: 16,
  dithering: false,
  cleanupNoise: true,
  preserveSilhouette: true,
  simplifyShapes: true,
  animeMode: true,
  fillFrame: false,
};

const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'pixel',
    label: '像素绘画',
    exports: ['PNG', 'GIF', 'Sprite Sheet'],
  },
  {
    id: 'beads',
    label: '拼豆图纸',
    exports: ['打印图纸', '颜色清单', 'PNG'],
  },
  {
    id: 'crochet',
    label: '钩织图纸',
    exports: ['PDF 图纸', 'PNG 图样', '行列说明'],
  },
] as const;

export default function App() {
  const [conversionOptions, setConversionOptions] =
    useState<ConversionOptions>(DEFAULT_OPTIONS);
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('pixel');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>();
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
  }, [activeScenario, conversionOptions, selectedFile]);

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
  }, [activeScenario, conversionOptions.gridSize, selectedFile]);

  useEffect(() => {
    setDocument((current) =>
      current.scenario === activeScenario
        ? current
        : { ...current, scenario: activeScenario },
    );
  }, [activeScenario]);

  useEffect(() => {
    if (
      activeScenario !== 'pixel' ||
      !previewIsPlaying ||
      document.frames.length <= 1
    ) {
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
  }, [activeScenario, document.frames.length, previewFps, previewIsPlaying]);

  useEffect(() => {
    if (activeScenario !== 'pixel' || document.frames.length <= 1) {
      setPreviewIsPlaying(false);
    }
  }, [activeScenario, document.frames.length]);

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
  const scenario = SCENARIOS.find((item) => item.id === activeScenario) ?? SCENARIOS[0];

  function handlePaintCell(x: number, y: number, color: string | null) {
    if (!activeFrame || !activeLayer) {
      return;
    }

    setDocument((current) => replaceActiveLayerCell(current, x, y, color));
  }

  function handleSampleCell(color: string | null) {
    if (!color) {
      return;
    }

    setActiveColor(color);
    setActiveTool('paint');
  }

  function handleFillArea(x: number, y: number, color: string | null) {
    if (!activeFrame || !activeLayer) {
      return;
    }

    setDocument((current) => fillActiveLayerArea(current, x, y, color));
  }

  function handleDrawLine(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string | null,
  ) {
    if (!activeFrame || !activeLayer) {
      return;
    }

    setDocument((current) =>
      drawLineOnActiveLayer(current, startX, startY, endX, endY, color),
    );
  }

  function handleDrawRectangle(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string | null,
  ) {
    if (!activeFrame || !activeLayer) {
      return;
    }

    setDocument((current) =>
      drawRectangleOnActiveLayer(current, startX, startY, endX, endY, color),
    );
  }

  function handleCreateBlankCanvas() {
    setSelectedFile(null);
    setPreviewUrl(undefined);
    setDocument(createStudioDocument(activeScenario, conversionOptions.gridSize));
    setCanvasZoom(1);
  }

  function handleAddFrame() {
    setDocument((current) => addFrameToDocument(current));
  }

  function handleDuplicateFrame() {
    setDocument((current) => duplicateActiveFrame(current));
  }

  function handleDeleteFrame() {
    setDocument((current) => deleteActiveFrame(current));
  }

  function handleTogglePlayback() {
    if (document.frames.length <= 1) {
      return;
    }

    setPreviewIsPlaying((current) => !current);
  }

  function handlePrintExport() {
    window.print();
  }

  return (
    <main className="app-shell">
      <section className="studio-app">
        <header className="app-topbar">
          <div className="app-brand">
            <span className="app-kicker">Pattern Studio</span>
            <h1>像素工坊</h1>
            <p className="app-subtitle">Pixel art, beads, crochet charts</p>
          </div>

          <div className="topbar-cluster">
            <span className="topbar-cluster__label">Mode</span>
            <nav className="scenario-switcher" aria-label="创作场景">
              {SCENARIOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`scenario-tab${item.id === activeScenario ? ' is-active' : ''}`}
                  onClick={() => setActiveScenario(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="topbar-cluster topbar-actions">
            <span className="topbar-cluster__label">File</span>
            <button
              type="button"
              className="chip-button"
              onClick={handleCreateBlankCanvas}
            >
              新建空白画布
            </button>
          </div>

          <div className="topbar-cluster topbar-status">
            <span className="topbar-cluster__label">Document</span>
            <span className="info-tag">
              {document.width} x {document.height}
            </span>
            {activeScenario === 'pixel' ? (
              <span className="info-tag">{document.frames.length} 帧</span>
            ) : null}
          </div>
        </header>

        <section className="studio-layout">
          <aside className="left-dock" aria-label="左侧工具栏">
            <EditingToolbar
              activeColor={activeColor}
              onColorChange={setActiveColor}
              tool={activeTool}
              onToolChange={setActiveTool}
            />

            {activeScenario === 'pixel' && activeFrame ? (
              <LayersPanel
                layers={activeFrame.layers}
                activeLayerId={activeFrame.activeLayerId}
                onSelectLayer={(layerId) =>
                  setDocument((current) => setActiveLayer(current, layerId))
                }
                onAddLayer={() => setDocument((current) => addLayerToActiveFrame(current))}
                onDuplicateLayer={() =>
                  setDocument((current) => duplicateActiveLayer(current))
                }
                onDeleteLayer={() =>
                  setDocument((current) => deleteActiveLayer(current))
                }
                onMergeLayerDown={() =>
                  setDocument((current) => mergeActiveLayerDown(current))
                }
                onRenameLayer={(layerId, name) =>
                  setDocument((current) => renameLayer(current, layerId, name))
                }
                onToggleVisibility={(layerId) =>
                  setDocument((current) => toggleLayerVisibility(current, layerId))
                }
                onToggleLock={(layerId) =>
                  setDocument((current) => toggleLayerLock(current, layerId))
                }
                onMoveLayer={(layerId, direction) =>
                  setDocument((current) => moveLayer(current, layerId, direction))
                }
              />
            ) : null}

            <section className="panel panel--dock">
              <div className="panel__header">
                <h2>素材</h2>
              </div>
              <div className="panel__body panel__body--compact">
                <ImageUploader
                  onFileSelected={setSelectedFile}
                  previewUrl={previewUrl}
                />
              </div>
            </section>

            <ConversionControls
              value={conversionOptions}
              onChange={setConversionOptions}
            />
          </aside>

          <section className="canvas-stage" aria-label="主画布工作区">
          <section className="panel stage-canvas-panel">
              <div className="panel__header">
                <div className="panel-title-block">
                  <span className="panel-title-block__label">Canvas</span>
                  <h2>{scenario.label}</h2>
                </div>
                <div className="canvas-toolbar">
                  {activeScenario === 'crochet' ? (
                    <>
                      <button
                        type="button"
                        className={`chip-button${crochetViewMode === 'color' ? ' is-active' : ''}`}
                        onClick={() => setCrochetViewMode('color')}
                      >
                        颜色图
                      </button>
                      <button
                        type="button"
                        className={`chip-button${crochetViewMode === 'symbol' ? ' is-active' : ''}`}
                        onClick={() => setCrochetViewMode('symbol')}
                      >
                        符号图
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="chip-button"
                    onClick={() =>
                      setCanvasZoom((current) => Math.max(0.5, current - 0.25))
                    }
                  >
                    缩小
                  </button>
                  <span className="canvas-toolbar__value">
                    {Math.round(canvasZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    className="chip-button"
                    onClick={() =>
                      setCanvasZoom((current) => Math.min(4, current + 0.25))
                    }
                  >
                    放大
                  </button>
                  <button
                    type="button"
                    className={`chip-button${showGridLines ? ' is-active' : ''}`}
                    onClick={() => setShowGridLines((current) => !current)}
                  >
                    {showGridLines ? '隐藏网格' : '显示网格'}
                  </button>
                </div>
              </div>
              <div className="panel__body stage-canvas-body">
                {activeGrid ? (
                  activeScenario === 'crochet' && crochetAnalysis ? (
                    <CrochetChart
                      grid={activeGrid}
                      viewMode={crochetViewMode}
                      symbolByColor={crochetAnalysis.symbolByColor}
                      editable
                      activeColor={activeColor}
                      tool={activeTool}
                      onPaintCell={handlePaintCell}
                      onFillArea={handleFillArea}
                      onDrawLine={handleDrawLine}
                      onDrawRectangle={handleDrawRectangle}
                      onSampleCell={handleSampleCell}
                      zoom={canvasZoom}
                      showGrid={showGridLines}
                    />
                  ) : (
                    <PixelGrid
                      grid={activeGrid}
                      editable
                      activeColor={activeColor}
                      tool={activeTool}
                      onPaintCell={handlePaintCell}
                      onFillArea={handleFillArea}
                      onDrawLine={handleDrawLine}
                      onDrawRectangle={handleDrawRectangle}
                      onSampleCell={handleSampleCell}
                      zoom={canvasZoom}
                      showGrid={showGridLines}
                    />
                  )
                ) : (
                  <div className="empty-state">
                    采样完成后，这里会显示像素网格。
                  </div>
                )}
              </div>
            </section>

            {activeScenario === 'pixel' ? (
              <FrameStrip
                frames={framePreviews}
                activeFrameId={document.activeFrameId}
                isPlaying={previewIsPlaying}
                fps={previewFps}
                onSelectFrame={(frameId) =>
                  setDocument((current) => setActiveFrame(current, frameId))
                }
                onAddFrame={handleAddFrame}
                onDuplicateFrame={handleDuplicateFrame}
                onDeleteFrame={handleDeleteFrame}
                onTogglePlayback={handleTogglePlayback}
                onFpsChange={setPreviewFps}
              />
            ) : (
              activeGrid && (
                <ScenarioExportPanel
                  scenario={activeScenario}
                  grid={activeGrid}
                  beadBrand={activeScenario === 'beads' ? beadBrand : undefined}
                  beadUsage={activeScenario === 'beads' ? beadUsage : undefined}
                  crochetAnalysis={activeScenario === 'crochet' ? crochetAnalysis ?? undefined : undefined}
                  exportMode={
                    activeScenario === 'beads' ? beadExportMode : crochetExportMode
                  }
                  onExportModeChange={(mode) => {
                    if (activeScenario === 'beads') {
                      setBeadExportMode(mode as 'bead-chart' | 'bead-list');
                      return;
                    }

                    setCrochetExportMode(mode as 'crochet-chart' | 'crochet-rows');
                  }}
                  onPrint={handlePrintExport}
                />
              )
            )}
          </section>

          <aside className="right-dock" aria-label="右侧属性栏">
            {activeGrid ? (
              <>
                {activeScenario === 'beads' ? (
                  <BeadPalettePanel
                    brand={beadBrand}
                    usage={beadUsage}
                    transparentCount={transparentCount}
                    onBrandChange={setBeadBrand}
                  />
                ) : activeScenario === 'crochet' && crochetAnalysis ? (
                  <CrochetPatternPanel analysis={crochetAnalysis} />
                ) : (
                  <PalettePanel
                    palette={activeGrid.palette}
                    counts={paletteCounts}
                    transparentCount={transparentCount}
                  />
                )}
                <InspectorPanel
                  grid={activeGrid}
                  options={conversionOptions}
                  transparentCount={transparentCount}
                  scenarioLabel={scenario.label}
                  frameCount={document.frames.length}
                  materialCountLabel={
                    activeScenario === 'beads'
                      ? `材料总数：${beadUsage.reduce((sum, item) => sum + item.count, 0)} 颗`
                      : undefined
                  }
                />
              </>
            ) : (
              <section className="panel panel--sidebar">
                <div className="panel__header">
                  <h2>检查器</h2>
                </div>
                <p className="panel__body panel__body--compact">
                  生成草稿后，这里会显示调色板、参数和图纸建议。
                </p>
              </section>
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}
