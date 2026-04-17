import type { PixelGrid as PixelGridModel } from '../types/pixel';
import type {
  EditorTool,
  EditorToolSettings,
  ScenarioDefinition,
  ScenarioId,
} from '../types/studio';
import type { CrochetPatternAnalysis } from '../utils/crochet';
import { FIT_WINDOW_ZOOM } from '../constants/studio';
import CrochetChart from './CrochetChart';
import EditingToolbar from './EditingToolbar';
import PixelGrid, { getBaseCellSize } from './PixelGrid';
import { DropdownField } from './ui/dropdown';
import type { StudioFramePreview } from '../hooks/useStudioApp';

const ZOOM_OPTIONS = [25, 50, 75, 100, 200] as const;

type StudioCanvasStageProps = {
  activeScenario: ScenarioId;
  scenario: ScenarioDefinition;
  activeGrid: PixelGridModel | null;
  isProcessingUpload: boolean;
  activeColor: string;
  activeTool: EditorTool;
  toolSettings: EditorToolSettings;
  activePalette: readonly string[];
  canvasZoom: number;
  showGridLines: boolean;
  crochetViewMode: 'color' | 'symbol';
  crochetAnalysis: CrochetPatternAnalysis | null;
  framePreviews: StudioFramePreview[];
  activeFrameId: string;
  previewIsPlaying: boolean;
  previewFps: number;
  onActiveColorChange: (color: string) => void;
  onActiveToolChange: (tool: EditorTool) => void;
  onToolSettingsChange: (
    updater: (current: EditorToolSettings) => EditorToolSettings,
  ) => void;
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
  isProcessingUpload,
  activeColor,
  activeTool,
  toolSettings,
  activePalette,
  canvasZoom,
  showGridLines,
  crochetViewMode,
  crochetAnalysis,
  framePreviews: _framePreviews,
  activeFrameId: _activeFrameId,
  previewIsPlaying: _previewIsPlaying,
  previewFps: _previewFps,
  onActiveColorChange,
  onActiveToolChange,
  onToolSettingsChange,
  onCrochetViewModeChange,
  onCanvasZoomChange,
  onToggleGridLines,
  onPaintCell,
  onFillArea,
  onDrawLine,
  onDrawRectangle,
  onSampleCell,
  onSelectFrame: _onSelectFrame,
  onAddFrame: _onAddFrame,
  onDuplicateFrame: _onDuplicateFrame,
  onDeleteFrame: _onDeleteFrame,
  onTogglePlayback: _onTogglePlayback,
  onPreviewFpsChange: _onPreviewFpsChange,
}: StudioCanvasStageProps) {
  const actualSizeZoom = activeGrid ? 1 / getBaseCellSize(activeGrid.width) : 1;
  const isFitWindowZoom = Math.abs(canvasZoom - FIT_WINDOW_ZOOM) < 0.001;
  const actualSizePercent = Math.round(actualSizeZoom * 100);
  const currentZoomPercent = isFitWindowZoom ? 100 : Math.round(canvasZoom * 100);
  const zoomDropdownValue =
    Math.abs(canvasZoom - actualSizeZoom) < 0.001
      ? 'actual'
      : isFitWindowZoom
        ? '100'
        : String(currentZoomPercent);
  const zoomOptions = [
    ...ZOOM_OPTIONS.map((value) => ({
      label: `${value}%`,
      value: String(value),
    })),
  ];

  if (
    zoomDropdownValue !== 'actual' &&
    !zoomOptions.some((option) => option.value === zoomDropdownValue)
  ) {
    const insertIndex = zoomOptions.findIndex(
      (option) => Number(option.value) > currentZoomPercent,
    );
    const currentOption = {
      label: `${currentZoomPercent}%`,
      value: zoomDropdownValue,
    };

    if (insertIndex === -1) {
      zoomOptions.push(currentOption);
    } else {
      zoomOptions.splice(insertIndex, 0, currentOption);
    }
  }

  const zoomDropdownOptions = zoomOptions.map((option) =>
    option.value === '100'
      ? { label: '100%（适配窗口）', value: option.value }
      : option,
  );
  const stepDownZoom = isFitWindowZoom ? 0.75 : Math.max(0.5, canvasZoom - 0.25);
  const stepUpZoom = isFitWindowZoom ? 1.25 : Math.min(4, canvasZoom + 0.25);

  return (
    <section className="canvas-stage" aria-label="主画布工作区">
      <EditingToolbar
        activeColor={activeColor}
        palette={activePalette}
        onColorChange={onActiveColorChange}
        tool={activeTool}
        toolSettings={toolSettings}
        onToolChange={onActiveToolChange}
        onToolSettingsChange={onToolSettingsChange}
      />

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
              onClick={() => onCanvasZoomChange(() => stepDownZoom)}
            >
              缩小
            </button>
            <DropdownField
              className="canvas-zoom-dropdown"
              selectClassName="canvas-zoom-dropdown__select"
              label="缩放比例"
              ariaLabel={`当前缩放 ${currentZoomPercent}%`}
              value={zoomDropdownValue}
              options={[
                ...zoomDropdownOptions,
                {
                  label: `${actualSizePercent}%（实际尺寸）`,
                  value: 'actual',
                },
              ]}
              onChange={(value) =>
                onCanvasZoomChange(() =>
                  value === 'actual'
                    ? actualSizeZoom
                    : value === '100'
                      ? FIT_WINDOW_ZOOM
                      : Number(value) / 100,
                )
              }
            />
            <button
              type="button"
              className="chip-button"
              onClick={() => onCanvasZoomChange(() => stepUpZoom)}
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
          {isProcessingUpload ? (
            <div aria-busy="true" />
          ) : activeGrid ? (
            activeScenario === 'crochet' && crochetAnalysis ? (
              <CrochetChart
                grid={activeGrid}
                viewMode={crochetViewMode}
                symbolByColor={crochetAnalysis.symbolByColor}
                editable
                activeColor={activeColor}
                tool={activeTool}
                toolSettings={toolSettings}
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
                toolSettings={toolSettings}
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
    </section>
  );
}
