import type { ConversionOptions } from '../types/pixel';
import type { EditorTool, EditorToolSettings } from '../types/studio';
import ConversionControls from './ConversionControls';
import EditingToolbar from './EditingToolbar';
import ImageUploader from './ImageUploader';

type StudioLeftDockProps = {
  activeColor: string;
  activeTool: EditorTool;
  toolSettings: EditorToolSettings;
  activePalette: readonly string[];
  conversionOptions: ConversionOptions;
  previewUrl?: string;
  onActiveColorChange: (color: string) => void;
  onActiveToolChange: (tool: EditorTool) => void;
  onToolSettingsChange: (
    updater: (current: EditorToolSettings) => EditorToolSettings,
  ) => void;
  onConversionOptionsChange: (options: ConversionOptions) => void;
  onFileSelected: (file: File | null) => void;
};

export default function StudioLeftDock({
  activeColor,
  activeTool,
  toolSettings,
  activePalette,
  conversionOptions,
  previewUrl,
  onActiveColorChange,
  onActiveToolChange,
  onToolSettingsChange,
  onConversionOptionsChange,
  onFileSelected,
}: StudioLeftDockProps) {
  return (
    <aside className="left-dock" aria-label="左侧工具栏">
      <EditingToolbar
        activeColor={activeColor}
        palette={activePalette}
        onColorChange={onActiveColorChange}
        tool={activeTool}
        toolSettings={toolSettings}
        onToolChange={onActiveToolChange}
        onToolSettingsChange={onToolSettingsChange}
      />

      <section className="panel panel--dock">
        <div className="panel__header">
          <h2>素材</h2>
        </div>
        <div className="panel__body panel__body--compact">
          <ImageUploader onFileSelected={onFileSelected} previewUrl={previewUrl} />
        </div>
      </section>

      <ConversionControls
        value={conversionOptions}
        onChange={onConversionOptionsChange}
      />
    </aside>
  );
}
