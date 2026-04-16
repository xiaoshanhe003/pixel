import type { BeadBrand } from '../data/beadPalettes';
import type {
  ConversionOptions,
  GridSize,
  PixelGrid as PixelGridModel,
} from '../types/pixel';
import type { ScenarioDefinition, ScenarioId, StudioFrame } from '../types/studio';
import type { CrochetPatternAnalysis } from '../utils/crochet';
import type { countBeadUsage } from '../utils/beads';
import type { countPaletteUsage } from '../utils/studio';
import BeadPalettePanel from './BeadPalettePanel';
import CrochetPatternPanel from './CrochetPatternPanel';
import InspectorPanel from './InspectorPanel';
import LayersPanel from './LayersPanel';
import PalettePanel from './PalettePanel';
import ScenarioExportPanel from './ScenarioExportPanel';

function buildSelectedLayerPalette(frame?: StudioFrame): {
  palette: string[];
  counts: Map<string, number>;
} {
  const activeLayer = frame?.layers.find((layer) => layer.id === frame.activeLayerId);

  if (!activeLayer) {
    return {
      palette: [],
      counts: new Map<string, number>(),
    };
  }

  const palette: string[] = [];
  const counts = new Map<string, number>();

  for (const cell of activeLayer.cells) {
    if (!cell.color) {
      continue;
    }

    if (!counts.has(cell.color)) {
      palette.push(cell.color);
      counts.set(cell.color, 0);
    }

    counts.set(cell.color, (counts.get(cell.color) ?? 0) + 1);
  }

  return { palette, counts };
}

type StudioRightDockProps = {
  activeScenario: ScenarioId;
  scenario: ScenarioDefinition;
  documentWidth: GridSize;
  documentHeight: GridSize;
  frameCount: number;
  activeFrame?: StudioFrame;
  activeGrid: PixelGridModel | null;
  paletteCounts: ReturnType<typeof countPaletteUsage>;
  transparentCount: number;
  beadBrand: BeadBrand;
  beadUsage: ReturnType<typeof countBeadUsage>;
  crochetAnalysis: CrochetPatternAnalysis | null;
  exportMode: 'bead-chart' | 'bead-list' | 'crochet-chart' | 'crochet-rows';
  materialCountLabel?: string;
  conversionOptions: ConversionOptions;
  onFileSelected: (file: File | null) => void;
  onLayerSelect: (layerId: string) => void;
  onLayerAdd: () => void;
  onLayerDuplicate: (layerId?: string) => void;
  onLayerDelete: (layerId?: string) => void;
  onLayerMergeDown: (layerId?: string) => void;
  onLayerRename: (layerId: string, name: string) => void;
  onLayerToggleVisibility: (layerId: string) => void;
  onLayerToggleLock: (layerId: string) => void;
  onLayerClear: (layerId: string) => void;
  onLayerMove: (layerId: string, direction: 'up' | 'down') => void;
  onLayerReorder: (layerId: string, targetIndex: number) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onBeadBrandChange: (brand: BeadBrand) => void;
  onExportModeChange: (
    mode: 'bead-chart' | 'bead-list' | 'crochet-chart' | 'crochet-rows',
  ) => void;
  onPrint: () => void;
};

export default function StudioRightDock({
  activeScenario,
  scenario,
  documentWidth,
  documentHeight,
  frameCount,
  activeFrame,
  activeGrid,
  paletteCounts,
  transparentCount,
  beadBrand,
  beadUsage,
  crochetAnalysis,
  exportMode,
  materialCountLabel,
  conversionOptions,
  onFileSelected,
  onLayerSelect,
  onLayerAdd,
  onLayerDuplicate,
  onLayerDelete,
  onLayerMergeDown,
  onLayerRename,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerClear,
  onLayerMove,
  onLayerReorder,
  onLayerOpacityChange,
  onBeadBrandChange,
  onExportModeChange,
  onPrint,
}: StudioRightDockProps) {
  const selectedLayerPalette = buildSelectedLayerPalette(activeFrame);

  return (
    <aside className="right-dock" aria-label="右侧属性栏">
      {activeScenario === 'pixel' && activeFrame ? (
        <LayersPanel
          layers={activeFrame.layers}
          width={documentWidth}
          height={documentHeight}
          activeLayerId={activeFrame.activeLayerId}
          onUploadImage={onFileSelected}
          onSelectLayer={onLayerSelect}
          onAddLayer={onLayerAdd}
          onDuplicateLayer={onLayerDuplicate}
          onDeleteLayer={onLayerDelete}
          onMergeLayerDown={onLayerMergeDown}
          onRenameLayer={onLayerRename}
          onToggleVisibility={onLayerToggleVisibility}
          onToggleLock={onLayerToggleLock}
          onClearLayer={onLayerClear}
          onMoveLayer={onLayerMove}
          onReorderLayer={onLayerReorder}
          onOpacityChange={onLayerOpacityChange}
        />
      ) : null}

      {activeScenario !== 'pixel' && activeGrid ? (
        <ScenarioExportPanel
          scenario={activeScenario}
          grid={activeGrid}
          beadBrand={activeScenario === 'beads' ? beadBrand : undefined}
          beadUsage={activeScenario === 'beads' ? beadUsage : undefined}
          crochetAnalysis={activeScenario === 'crochet' ? crochetAnalysis ?? undefined : undefined}
          exportMode={exportMode}
          onExportModeChange={(mode) =>
            onExportModeChange(
              mode as 'bead-chart' | 'bead-list' | 'crochet-chart' | 'crochet-rows',
            )
          }
          onPrint={onPrint}
        />
      ) : null}

      {activeGrid ? (
        <>
          {activeScenario === 'beads' ? (
            <BeadPalettePanel
              brand={beadBrand}
              usage={beadUsage}
              transparentCount={transparentCount}
              onBrandChange={onBeadBrandChange}
            />
          ) : activeScenario === 'crochet' && crochetAnalysis ? (
            <CrochetPatternPanel analysis={crochetAnalysis} />
          ) : (
            <PalettePanel
              palette={
                activeScenario === 'pixel'
                  ? selectedLayerPalette.palette
                  : activeGrid.palette
              }
              counts={
                activeScenario === 'pixel'
                  ? selectedLayerPalette.counts
                  : paletteCounts
              }
              transparentCount={activeScenario === 'pixel' ? 0 : transparentCount}
            />
          )}
          <InspectorPanel
            grid={activeGrid}
            options={conversionOptions}
            transparentCount={transparentCount}
            scenarioLabel={scenario.label}
            frameCount={frameCount}
            materialCountLabel={materialCountLabel}
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
  );
}
