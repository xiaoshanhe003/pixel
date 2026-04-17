import { useState } from 'react';
import StudioCanvasStage from './components/StudioCanvasStage';
import StudioLeftDock from './components/StudioLeftDock';
import StudioRightDock from './components/StudioRightDock';
import StudioTopbar from './components/StudioTopbar';
import { SCENARIOS } from './constants/studio';
import { DEFAULT_PALETTES } from './data/defaultPalettes';
import { useStudioApp } from './hooks/useStudioApp';

export default function App() {
  const [isTabletInspectorOpen, setIsTabletInspectorOpen] = useState(false);
  const { controls, source, editor, studio, output, stats, actions } = useStudioApp();
  const activePalette = DEFAULT_PALETTES[controls.conversionOptions.paletteSize];

  return (
    <main className="app-shell">
      <section className="studio-app">
        <StudioTopbar
          document={studio.document}
          activeScenario={studio.activeScenario}
          scenarios={SCENARIOS}
          onScenarioChange={actions.setActiveScenario}
          onCreateBlankCanvas={actions.createBlankCanvas}
        />

        <section className="studio-layout">
          <StudioLeftDock
            conversionOptions={controls.conversionOptions}
            selectedFile={source.selectedFile}
            previewUrl={source.previewUrl}
            onConversionOptionsChange={actions.setConversionOptions}
            onFileSelected={actions.setSelectedFile}
          />

          <section className="canvas-column">
            <div className="tablet-inspector-toggle">
              <button
                type="button"
                className={`chip-button${isTabletInspectorOpen ? ' is-active' : ''}`}
                aria-expanded={isTabletInspectorOpen}
                aria-controls="tablet-inspector-panel"
                onClick={() => setIsTabletInspectorOpen((current) => !current)}
              >
                {isTabletInspectorOpen ? '收起右侧面板' : '打开右侧面板'}
              </button>
            </div>

            {isTabletInspectorOpen ? (
              <div
                id="tablet-inspector-panel"
                className="tablet-inspector-panel"
              >
                <StudioRightDock
                  activeScenario={studio.activeScenario}
                  scenario={studio.scenario}
                  documentWidth={studio.document.width}
                  documentHeight={studio.document.height}
                  frameCount={studio.document.frames.length}
                  activeFrame={studio.activeFrame}
                  activeGrid={studio.activeGrid}
                  paletteCounts={stats.paletteCounts}
                  transparentCount={stats.transparentCount}
                  beadBrand={output.beadBrand}
                  beadUsage={output.beadUsage}
                  crochetAnalysis={output.crochetAnalysis}
                  exportMode={
                    studio.activeScenario === 'beads'
                      ? output.beadExportMode
                      : output.crochetExportMode
                  }
                  materialCountLabel={stats.materialCountLabel}
                  conversionOptions={controls.conversionOptions}
                  onFileSelected={actions.setSelectedFile}
                  onLayerSelect={actions.selectLayer}
                  onLayerAdd={actions.addLayer}
                  onLayerDuplicate={actions.duplicateLayer}
                  onLayerDelete={actions.deleteLayer}
                  onLayerMergeDown={actions.mergeLayerDown}
                  onLayerRename={actions.renameLayer}
                  onLayerToggleVisibility={actions.toggleLayerVisibility}
                  onLayerToggleLock={actions.toggleLayerLock}
                  onLayerClear={actions.clearLayer}
                  onLayerMove={actions.moveLayer}
                  onLayerReorder={actions.reorderLayer}
                  onLayerOpacityChange={actions.setLayerOpacity}
                  onBeadBrandChange={actions.setBeadBrand}
                  onExportModeChange={actions.setExportMode}
                  onPrint={actions.printExport}
                />
              </div>
            ) : null}

            <StudioCanvasStage
              activeScenario={studio.activeScenario}
              scenario={studio.scenario}
              activeGrid={studio.activeGrid}
              activeLayer={studio.activeLayer}
              isProcessingUpload={source.isProcessingUpload}
              activeColor={editor.activeColor}
              activeTool={editor.activeTool}
              toolSettings={editor.toolSettings}
              activePalette={activePalette}
              canvasZoom={editor.canvasZoom}
              showGridLines={editor.showGridLines}
              selection={editor.selection}
              crochetViewMode={output.crochetViewMode}
              crochetAnalysis={output.crochetAnalysis}
              framePreviews={studio.framePreviews}
              activeFrameId={studio.document.activeFrameId}
              previewIsPlaying={studio.previewIsPlaying}
              previewFps={studio.previewFps}
              canUndo={controls.canUndo}
              canRedo={controls.canRedo}
              onActiveColorChange={actions.setActiveColor}
              onActiveToolChange={actions.setActiveTool}
              onToolSettingsChange={actions.setToolSettings}
              onUndo={actions.undo}
              onRedo={actions.redo}
              onCrochetViewModeChange={actions.setCrochetViewMode}
              onCanvasZoomChange={actions.setCanvasZoom}
              onToggleGridLines={actions.toggleGridLines}
              onPreviewPaintStroke={actions.previewPaintStroke}
              onCommitPaintStroke={actions.commitPaintStroke}
              onFillArea={actions.fillArea}
              onDrawLine={actions.drawLine}
              onDrawRectangle={actions.drawRectangle}
              onSelectionChange={actions.setSelection}
              onPreviewMoveSelection={actions.previewMoveSelection}
              onCommitMoveSelection={actions.commitMoveSelection}
              onPreviewScaleSelection={actions.previewScaleSelection}
              onCommitScaleSelection={actions.commitScaleSelection}
              onSampleCell={actions.sampleCell}
              onSelectFrame={actions.selectFrame}
              onAddFrame={actions.addFrame}
              onDuplicateFrame={actions.duplicateFrame}
              onDeleteFrame={actions.deleteFrame}
              onTogglePlayback={actions.togglePlayback}
              onPreviewFpsChange={actions.setPreviewFps}
            />
          </section>

          <div className="desktop-right-dock">
            <StudioRightDock
              activeScenario={studio.activeScenario}
              scenario={studio.scenario}
              documentWidth={studio.document.width}
              documentHeight={studio.document.height}
              frameCount={studio.document.frames.length}
              activeFrame={studio.activeFrame}
              activeGrid={studio.activeGrid}
              paletteCounts={stats.paletteCounts}
              transparentCount={stats.transparentCount}
              beadBrand={output.beadBrand}
              beadUsage={output.beadUsage}
              crochetAnalysis={output.crochetAnalysis}
              exportMode={
                studio.activeScenario === 'beads'
                  ? output.beadExportMode
                  : output.crochetExportMode
              }
              materialCountLabel={stats.materialCountLabel}
              conversionOptions={controls.conversionOptions}
              onFileSelected={actions.setSelectedFile}
              onLayerSelect={actions.selectLayer}
              onLayerAdd={actions.addLayer}
              onLayerDuplicate={actions.duplicateLayer}
              onLayerDelete={actions.deleteLayer}
              onLayerMergeDown={actions.mergeLayerDown}
              onLayerRename={actions.renameLayer}
              onLayerToggleVisibility={actions.toggleLayerVisibility}
              onLayerToggleLock={actions.toggleLayerLock}
              onLayerClear={actions.clearLayer}
              onLayerMove={actions.moveLayer}
              onLayerReorder={actions.reorderLayer}
              onLayerOpacityChange={actions.setLayerOpacity}
              onBeadBrandChange={actions.setBeadBrand}
              onExportModeChange={actions.setExportMode}
              onPrint={actions.printExport}
            />
          </div>
        </section>
      </section>
    </main>
  );
}
