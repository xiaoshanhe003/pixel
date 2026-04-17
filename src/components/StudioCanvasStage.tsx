import { useMemo, useState } from 'react';
import type { PixelGrid as PixelGridModel } from '../types/pixel';
import type {
  EditorSelection,
  EditorTool,
  EditorToolSettings,
  ScenarioDefinition,
  ScenarioId,
  StudioLayer,
} from '../types/studio';
import type { CrochetPatternAnalysis } from '../utils/crochet';
import { ACTUAL_SIZE_ZOOM, FIT_WINDOW_ZOOM } from '../constants/studio';
import { ZOOM_IN_SVG, ZOOM_OUT_SVG } from '../utils/toolIcons';
import CrochetChart from './CrochetChart';
import EditingToolbar from './EditingToolbar';
import PixelGrid, { getBaseCellSize } from './PixelGrid';
import { CheckboxField } from './ui/checkbox';
import { DropdownField } from './ui/dropdown';
import type { StudioFramePreview } from '../hooks/useStudioApp';

const ZOOM_OPTIONS = [25, 50, 75, 100, 200] as const;
const FIT_WINDOW_SAFE_MARGIN = 24;

function clampZoom(zoom: number) {
  return Math.max(0.25, Math.min(4, zoom));
}

function computeFitWindowZoom(
  grid: PixelGridModel | null,
  viewportWidth: number,
  viewportHeight: number,
) {
  if (!grid) {
    return FIT_WINDOW_ZOOM;
  }

  const baseCellSize = getBaseCellSize(grid.width);
  const availableWidth = Math.max(0, viewportWidth - FIT_WINDOW_SAFE_MARGIN * 2);
  const availableHeight = Math.max(0, viewportHeight - FIT_WINDOW_SAFE_MARGIN * 2);

  if (availableWidth === 0 || availableHeight === 0) {
    return FIT_WINDOW_ZOOM;
  }

  return clampZoom(
    Math.min(
      availableWidth / (grid.width * baseCellSize),
      availableHeight / (grid.height * baseCellSize),
    ),
  );
}

type StudioCanvasStageProps = {
  activeScenario: ScenarioId;
  scenario: ScenarioDefinition;
  activeGrid: PixelGridModel | null;
  activeLayer?: StudioLayer;
  isProcessingUpload: boolean;
  activeColor: string;
  activeTool: EditorTool;
  toolSettings: EditorToolSettings;
  activePalette: readonly string[];
  canvasZoom: number;
  showGridLines: boolean;
  selection: EditorSelection | null;
  crochetViewMode: 'color' | 'symbol';
  crochetAnalysis: CrochetPatternAnalysis | null;
  framePreviews: StudioFramePreview[];
  activeFrameId: string;
  previewIsPlaying: boolean;
  previewFps: number;
  canUndo: boolean;
  canRedo: boolean;
  onActiveColorChange: (color: string) => void;
  onActiveToolChange: (tool: EditorTool) => void;
  onToolSettingsChange: (
    updater: (current: EditorToolSettings) => EditorToolSettings,
  ) => void;
  onUndo: () => void;
  onRedo: () => void;
  onCrochetViewModeChange: (mode: 'color' | 'symbol') => void;
  onCanvasZoomChange: (updater: (current: number) => number) => void;
  onToggleGridLines: () => void;
  onPreviewPaintStroke: (
    points: Array<{ x: number; y: number }>,
    color: string | null,
  ) => void;
  onCommitPaintStroke: (
    points: Array<{ x: number; y: number }>,
    color: string | null,
  ) => void;
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
  onSelectionChange: (selection: EditorSelection | null) => void;
  onPreviewMoveSelection: (offsetX: number, offsetY: number) => void;
  onCommitMoveSelection: (offsetX: number, offsetY: number) => void;
  onPreviewScaleSelection: (targetWidth: number, targetHeight: number) => void;
  onCommitScaleSelection: (targetWidth: number, targetHeight: number) => void;
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
  activeLayer,
  isProcessingUpload,
  activeColor,
  activeTool,
  toolSettings,
  activePalette,
  canvasZoom,
  showGridLines,
  selection,
  crochetViewMode,
  crochetAnalysis,
  framePreviews: _framePreviews,
  activeFrameId: _activeFrameId,
  previewIsPlaying: _previewIsPlaying,
  previewFps: _previewFps,
  canUndo,
  canRedo,
  onActiveColorChange,
  onActiveToolChange,
  onToolSettingsChange,
  onUndo,
  onRedo,
  onCrochetViewModeChange,
  onCanvasZoomChange,
  onToggleGridLines,
  onPreviewPaintStroke,
  onCommitPaintStroke,
  onFillArea,
  onDrawLine,
  onDrawRectangle,
  onSelectionChange,
  onPreviewMoveSelection,
  onCommitMoveSelection,
  onPreviewScaleSelection,
  onCommitScaleSelection,
  onSampleCell,
  onSelectFrame: _onSelectFrame,
  onAddFrame: _onAddFrame,
  onDuplicateFrame: _onDuplicateFrame,
  onDeleteFrame: _onDeleteFrame,
  onTogglePlayback: _onTogglePlayback,
  onPreviewFpsChange: _onPreviewFpsChange,
}: StudioCanvasStageProps) {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 640 });
  const handleViewportSizeChange = useMemo(
    () => (size: { width: number; height: number }) => {
      setViewportSize((current) =>
        current.width === size.width && current.height === size.height
          ? current
          : size,
      );
    },
    [],
  );

  const fitWindowZoom = useMemo(
    () => computeFitWindowZoom(activeGrid, viewportSize.width, viewportSize.height),
    [activeGrid, viewportSize.height, viewportSize.width],
  );
  const actualSizeZoom = activeGrid ? 1 / getBaseCellSize(activeGrid.width) : 1;
  const actualZoomFactor = fitWindowZoom > 0 ? actualSizeZoom / fitWindowZoom : 1;
  const isActualZoom = canvasZoom === ACTUAL_SIZE_ZOOM;
  const appliedZoom = isActualZoom ? actualSizeZoom : fitWindowZoom * canvasZoom;
  const zoomFactor = isActualZoom ? actualZoomFactor : canvasZoom;
  const isFitWindowZoom = Math.abs(zoomFactor - FIT_WINDOW_ZOOM) < 0.001;
  const actualSizePercent = Math.round(actualSizeZoom * 100);
  const currentZoomPercent = isActualZoom ? actualSizePercent : Math.round(zoomFactor * 100);
  const zoomDropdownValue = isActualZoom ? 'actual' : String(currentZoomPercent);
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
  const stepDownZoom = isFitWindowZoom ? 0.75 : clampZoom(zoomFactor - 0.25);
  const stepUpZoom = isFitWindowZoom ? 1.25 : clampZoom(zoomFactor + 0.25);
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
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        extraControls={
          <>
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
              className="chip-button tool-button"
              onClick={() => onCanvasZoomChange(() => stepDownZoom)}
              aria-label="缩小"
            >
              <span
                className="tool-button__icon"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: ZOOM_OUT_SVG }}
              />
              <span className="tool-button__tooltip" aria-hidden="true">
                缩小
              </span>
            </button>
            <button
              type="button"
              className="chip-button tool-button"
              onClick={() => onCanvasZoomChange(() => stepUpZoom)}
              aria-label="放大"
            >
              <span
                className="tool-button__icon"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: ZOOM_IN_SVG }}
              />
              <span className="tool-button__tooltip" aria-hidden="true">
                放大
              </span>
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
                    ? ACTUAL_SIZE_ZOOM
                    : value === '100'
                      ? FIT_WINDOW_ZOOM
                      : Number(value) / 100,
                )
              }
            />
            <CheckboxField
              checked={showGridLines}
              onCheckedChange={onToggleGridLines}
              label="网格"
              wrapperClassName="canvas-grid-toggle"
            />
          </>
        }
      />

      <section className="panel stage-canvas-panel">
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
                onPreviewPaintStroke={onPreviewPaintStroke}
                onCommitPaintStroke={onCommitPaintStroke}
                onFillArea={onFillArea}
                onDrawLine={onDrawLine}
                onDrawRectangle={onDrawRectangle}
                onSelectionChange={onSelectionChange}
                onPreviewMoveSelection={onPreviewMoveSelection}
                onCommitMoveSelection={onCommitMoveSelection}
                onPreviewScaleSelection={onPreviewScaleSelection}
                onCommitScaleSelection={onCommitScaleSelection}
                onSampleCell={onSampleCell}
                zoom={appliedZoom}
                showGrid={showGridLines}
                onViewportSizeChange={handleViewportSizeChange}
                selectionBounds={selection}
              />
            ) : (
              <PixelGrid
                grid={activeGrid}
                editable
                activeColor={activeColor}
                tool={activeTool}
                toolSettings={toolSettings}
                onPreviewPaintStroke={onPreviewPaintStroke}
                onCommitPaintStroke={onCommitPaintStroke}
                onFillArea={onFillArea}
                onDrawLine={onDrawLine}
                onDrawRectangle={onDrawRectangle}
                onSelectionChange={onSelectionChange}
                onPreviewMoveSelection={onPreviewMoveSelection}
                onCommitMoveSelection={onCommitMoveSelection}
                onPreviewScaleSelection={onPreviewScaleSelection}
                onCommitScaleSelection={onCommitScaleSelection}
                onSampleCell={onSampleCell}
                zoom={appliedZoom}
                showGrid={showGridLines}
                onViewportSizeChange={handleViewportSizeChange}
                selectionBounds={selection}
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
