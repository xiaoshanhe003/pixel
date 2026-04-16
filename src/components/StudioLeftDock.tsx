import type { ConversionOptions } from '../types/pixel';
import type { EditorTool } from '../types/studio';
import ConversionControls from './ConversionControls';
import EditingToolbar from './EditingToolbar';
import ImageUploader from './ImageUploader';

type StudioLeftDockProps = {
  activeColor: string;
  activeTool: EditorTool;
  conversionOptions: ConversionOptions;
  previewUrl?: string;
  onActiveColorChange: (color: string) => void;
  onActiveToolChange: (tool: EditorTool) => void;
  onConversionOptionsChange: (options: ConversionOptions) => void;
  onFileSelected: (file: File | null) => void;
};

export default function StudioLeftDock({
  activeColor,
  activeTool,
  conversionOptions,
  previewUrl,
  onActiveColorChange,
  onActiveToolChange,
  onConversionOptionsChange,
  onFileSelected,
}: StudioLeftDockProps) {
  return (
    <aside className="left-dock" aria-label="左侧工具栏">
      <EditingToolbar
        activeColor={activeColor}
        onColorChange={onActiveColorChange}
        tool={activeTool}
        onToolChange={onActiveToolChange}
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
