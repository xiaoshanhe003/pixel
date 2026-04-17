import type { ConversionOptions } from '../types/pixel';
import ConversionControls from './ConversionControls';
import ImageUploader from './ImageUploader';

type StudioLeftDockProps = {
  conversionOptions: ConversionOptions;
  selectedFile: File | null;
  previewUrl?: string;
  onConversionOptionsChange: (options: ConversionOptions) => void;
  onFileSelected: (file: File | null) => void;
};

export default function StudioLeftDock({
  conversionOptions,
  selectedFile,
  previewUrl,
  onConversionOptionsChange,
  onFileSelected,
}: StudioLeftDockProps) {
  return (
    <aside className="left-dock" aria-label="左侧边栏">
      <section className="panel panel--dock">
        <div className="panel__header">
          <h2>素材</h2>
        </div>
        <div className="panel__body panel__body--compact">
          <ImageUploader
            selectedFile={selectedFile}
            onFileSelected={onFileSelected}
            previewUrl={previewUrl}
          />
        </div>
      </section>

      <ConversionControls
        value={conversionOptions}
        onChange={onConversionOptionsChange}
      />
    </aside>
  );
}
