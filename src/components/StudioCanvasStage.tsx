import type { PixelGrid as PixelGridModel } from '../types/pixel';
import type { EditorTool, ScenarioDefinition, ScenarioId } from '../types/studio';
import type { CrochetPatternAnalysis } from '../utils/crochet';
import CrochetChart from './CrochetChart';
import FrameStrip from './FrameStrip';
import PixelGrid from './PixelGrid';
import type { StudioFramePreview } from '../hooks/useStudioApp';

type StudioCanvasStageProps = {
  activeScenario: ScenarioId;
  scenario: ScenarioDefinition;
  activeGrid: PixelGridModel | null;
  activeColor: string;
  activeTool: EditorTool;
  canvasZoom: number;
  showGridLines: boolean;
  crochetViewMode: 'color' | 'symbol';
  crochetAnalysis: CrochetPatternAnalysis | null;
  framePreviews: StudioFramePreview[];
  activeFrameId: string;
  previewIsPlaying: boolean;
  previewFps: number;
  onCrochetViewModeChange: (mode: 'color' | 'symbol') => void;
  onCanvasZoomChange: (updater: (current: number) => number) => void;
  onToggleGridLines: () => void;
  onPaintCell: (x: number, y: number, color: string | null) => void;
  onFillArea: (x: number, y: number, color: string | null) => void;
  onDrawLine: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string | null,
  ) => void;
  onDrawRectangle: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string | null,
  ) => void;
  onSampleCell: (color: string | null) => void;
  onSelectFrame: (frameId: string) => void;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onDeleteFrame: () => void;
  onTogglePlayback: () => void;
  onPreviewFpsChange: (fps: number) => void;
};

export default function StudioCanvasStage({
  activeScenario,
  scenario,
  activeGrid,
  activeColor,
  activeTool,
  canvasZoom,
  showGridLines,
  crochetViewMode,
  crochetAnalysis,
  framePreviews,
  activeFrameId,
  previewIsPlaying,
  previewFps,
  onCrochetViewModeChange,
  onCanvasZoomChange,
  onToggleGridLines,
  onPaintCell,
  onFillArea,
  onDrawLine,
  onDrawRectangle,
  onSampleCell,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onTogglePlayback,
  onPreviewFpsChange,
}: StudioCanvasStageProps) {
  return (
    <section className="canvas-stage" aria-label="主画布工作区">
      <section className="panel stage-canvas-panel">
        <div className="panel__header">
          <div className="canvas-toolbar">
            <span className="canvas-toolbar__context">{scenario.label}</span>
            {activeScenario === 'crochet' ? (
              <>
                <button
                  type="button"
                  className={`chip-button${crochetViewMode === 'color' ? ' is-active' : ''}`}
                  onClick={() => onCrochetViewModeChange('color')}
                >
                  颜色图
                </button>
                <button
                  type="button"
                  className={`chip-button${crochetViewMode === 'symbol' ? ' is-active' : ''}`}
                  onClick={() => onCrochetViewModeChange('symbol')}
                >
                  符号图
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="chip-button"
              onClick={() => onCanvasZoomChange((current) => Math.max(0.5, current - 0.25))}
            >
              缩小
            </button>
            <span
              className="canvas-toolbar__value"
              aria-label={`当前缩放 ${Math.round(canvasZoom * 100)}%`}
            >
              {Math.round(canvasZoom * 100)}%
            </span>
            <button
              type="button"
              className="chip-button"
              onClick={() => onCanvasZoomChange((current) => Math.min(4, current + 0.25))}
            >
              放大
            </button>
            <button
              type="button"
              className={`chip-button${showGridLines ? ' is-active' : ''}`}
              onClick={onToggleGridLines}
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
                onPaintCell={onPaintCell}
                onFillArea={onFillArea}
                onDrawLine={onDrawLine}
                onDrawRectangle={onDrawRectangle}
                onSampleCell={onSampleCell}
                zoom={canvasZoom}
                showGrid={showGridLines}
              />
            ) : (
              <PixelGrid
                grid={activeGrid}
                editable
                activeColor={activeColor}
                tool={activeTool}
                onPaintCell={onPaintCell}
                onFillArea={onFillArea}
                onDrawLine={onDrawLine}
                onDrawRectangle={onDrawRectangle}
                onSampleCell={onSampleCell}
                zoom={canvasZoom}
                showGrid={showGridLines}
              />
            )
          ) : (
            <div className="empty-state">采样完成后，这里会显示像素网格。</div>
          )}
        </div>
      </section>

      {activeScenario === 'pixel' ? (
        <FrameStrip
          frames={framePreviews}
          activeFrameId={activeFrameId}
          isPlaying={previewIsPlaying}
          fps={previewFps}
          onSelectFrame={onSelectFrame}
          onAddFrame={onAddFrame}
          onDuplicateFrame={onDuplicateFrame}
          onDeleteFrame={onDeleteFrame}
          onTogglePlayback={onTogglePlayback}
          onFpsChange={onPreviewFpsChange}
        />
      ) : null}
    </section>
  );
}
