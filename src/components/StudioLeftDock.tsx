import type { BeadBrand } from '../data/beadPalettes';
import type { ConversionOptions } from '../types/pixel';
import type { ScenarioId } from '../types/studio';
import type { CropRect } from '../utils/image';
import ConversionControls from './ConversionControls';
import ImageUploader from './ImageUploader';

type StudioLeftDockProps = {
  activeScenario: ScenarioId;
  conversionOptions: ConversionOptions;
  beadBrand: BeadBrand;
  sourceFile: File | null;
  appliedFile: File | null;
  appliedCrop: CropRect | null;
  previewUrl?: string;
  onConversionOptionsChange: (options: ConversionOptions) => void;
  onBeadBrandChange: (brand: BeadBrand) => void;
  onApplyImageSettings: (params: {
    sourceFile: File;
    appliedFile: File;
    crop: CropRect | null;
    conversionOptions: ConversionOptions;
    beadBrand: BeadBrand;
  }) => void;
  onClearImage: () => void;
};

export default function StudioLeftDock({
  activeScenario,
  conversionOptions,
  beadBrand,
  sourceFile,
  appliedFile,
  appliedCrop,
  previewUrl,
  onConversionOptionsChange,
  onBeadBrandChange,
  onApplyImageSettings,
  onClearImage,
}: StudioLeftDockProps) {
  return (
    <aside className="left-dock" aria-label="左侧边栏">
      {appliedFile ? null : (
        <ConversionControls
          activeScenario={activeScenario}
          value={conversionOptions}
          beadBrand={beadBrand}
          onChange={onConversionOptionsChange}
          onBeadBrandChange={onBeadBrandChange}
        />
      )}

      <section className="panel panel--dock">
        <div className="panel__header">
          <h2>参考图</h2>
        </div>
        <div className="panel__body panel__body--compact">
          <ImageUploader
            activeScenario={activeScenario}
            sourceFile={sourceFile}
            appliedFile={appliedFile}
            appliedCrop={appliedCrop}
            previewUrl={previewUrl}
            conversionOptions={conversionOptions}
            beadBrand={beadBrand}
            onApply={onApplyImageSettings}
            onClear={onClearImage}
          />
        </div>
      </section>
    </aside>
  );
}
