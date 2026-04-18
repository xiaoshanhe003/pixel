import type { BeadBrand } from '../data/beadPalettes';
import type { GridSize, PixelGrid as PixelGridModel } from '../types/pixel';
import type { ScenarioDefinition, ScenarioId, StudioFrame } from '../types/studio';
import type { CrochetPatternAnalysis } from '../utils/crochet';
import type { countBeadUsage } from '../utils/beads';
import type { countPaletteUsage } from '../utils/studio';
import CrochetPatternPanel from './CrochetPatternPanel';
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
  activeFrame?: StudioFrame;
  activeGrid: PixelGridModel | null;
  paletteCounts: ReturnType<typeof countPaletteUsage>;
  transparentCount: number;
  beadBrand: BeadBrand;
  beadUsage: ReturnType<typeof countBeadUsage>;
  crochetAnalysis: CrochetPatternAnalysis | null;
  exportMode: 'bead-chart' | 'bead-list' | 'crochet-chart' | 'crochet-rows';
  onBeadBrandChange: (brand: BeadBrand) => void;
  onExportModeChange: (
    mode: 'bead-chart' | 'bead-list' | 'crochet-chart' | 'crochet-rows',
  ) => void;
  onPrint: () => void;
};

export default function StudioRightDock({
  activeScenario,
  scenario: _scenario,
  documentWidth: _documentWidth,
  documentHeight: _documentHeight,
  activeFrame,
  activeGrid,
  paletteCounts,
  transparentCount,
  beadBrand,
  beadUsage,
  crochetAnalysis,
  exportMode,
  onBeadBrandChange,
  onExportModeChange,
  onPrint,
}: StudioRightDockProps) {
  const selectedLayerPalette = buildSelectedLayerPalette(activeFrame);

  return (
    <aside className="right-dock" aria-label="右侧属性栏">
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
          {activeScenario === 'beads' ? null : activeScenario === 'crochet' && crochetAnalysis ? (
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
        </>
      ) : (
        <section className="panel panel--sidebar">
          <div className="panel__header">
            <h2>调色板</h2>
          </div>
          <p className="panel__body panel__body--compact">
            生成草稿后，这里会显示调色板和导出建议。
          </p>
        </section>
      )}
    </aside>
  );
}
