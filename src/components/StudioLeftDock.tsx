import type { BeadBrand } from '../data/beadPalettes';
import type { ConversionOptions } from '../types/pixel';
import type { ScenarioId } from '../types/studio';
import ConversionControls from './ConversionControls';
import ImageUploader from './ImageUploader';

type StudioLeftDockProps = {
  activeScenario: ScenarioId;
  conversionOptions: ConversionOptions;
  beadBrand: BeadBrand;
  selectedFile: File | null;
  previewUrl?: string;
  onConversionOptionsChange: (options: ConversionOptions) => void;
  onBeadBrandChange: (brand: BeadBrand) => void;
  onFileSelected: (file: File | null) => void;
};

export default function StudioLeftDock({
  activeScenario,
  conversionOptions,
  beadBrand,
  selectedFile,
  previewUrl,
  onConversionOptionsChange,
  onBeadBrandChange,
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
        activeScenario={activeScenario}
        value={conversionOptions}
        beadBrand={beadBrand}
        onChange={onConversionOptionsChange}
        onBeadBrandChange={onBeadBrandChange}
      />
    </aside>
  );
}
