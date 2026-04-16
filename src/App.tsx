import StudioCanvasStage from './components/StudioCanvasStage';
import StudioLeftDock from './components/StudioLeftDock';
import StudioRightDock from './components/StudioRightDock';
import StudioTopbar from './components/StudioTopbar';
import { SCENARIOS } from './constants/studio';
import { useStudioApp } from './hooks/useStudioApp';

export default function App() {
  const { controls, source, editor, studio, output, stats, actions } = useStudioApp();

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
            activeColor={editor.activeColor}
            activeTool={editor.activeTool}
            conversionOptions={controls.conversionOptions}
            previewUrl={source.previewUrl}
            onActiveColorChange={actions.setActiveColor}
            onActiveToolChange={actions.setActiveTool}
            onConversionOptionsChange={actions.setConversionOptions}
            onFileSelected={actions.setSelectedFile}
          />

          <StudioCanvasStage
            activeScenario={studio.activeScenario}
            scenario={studio.scenario}
            activeGrid={studio.activeGrid}
            activeColor={editor.activeColor}
            activeTool={editor.activeTool}
            canvasZoom={editor.canvasZoom}
            showGridLines={editor.showGridLines}
            crochetViewMode={output.crochetViewMode}
            crochetAnalysis={output.crochetAnalysis}
            framePreviews={studio.framePreviews}
            activeFrameId={studio.document.activeFrameId}
            previewIsPlaying={studio.previewIsPlaying}
            previewFps={studio.previewFps}
            onCrochetViewModeChange={actions.setCrochetViewMode}
            onCanvasZoomChange={actions.setCanvasZoom}
            onToggleGridLines={actions.toggleGridLines}
            onPaintCell={actions.paintCell}
            onFillArea={actions.fillArea}
            onDrawLine={actions.drawLine}
            onDrawRectangle={actions.drawRectangle}
            onSampleCell={actions.sampleCell}
            onSelectFrame={actions.selectFrame}
            onAddFrame={actions.addFrame}
            onDuplicateFrame={actions.duplicateFrame}
            onDeleteFrame={actions.deleteFrame}
            onTogglePlayback={actions.togglePlayback}
            onPreviewFpsChange={actions.setPreviewFps}
          />

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
        </section>
      </section>
    </main>
  );
}
