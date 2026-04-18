import { BEAD_BRANDS, BEAD_BRAND_ORDER, type BeadBrand } from '../data/beadPalettes';
import type { ConversionOptions, GridSize, PaletteSize } from '../types/pixel';
import type { ScenarioId } from '../types/studio';
import { DropdownField } from './ui/dropdown';
import {
  applyDetailPreset,
  applyFramingPreset,
  applyImageKindPreset,
  inferDetailPreset,
  inferFramingPreset,
  inferImageKindPreset,
  type DetailPreset,
  type FramingPreset,
  type ImageKindPreset,
} from '../utils/conversionPresets';

type ConversionControlsProps = {
  activeScenario: ScenarioId;
  value: ConversionOptions;
  beadBrand: BeadBrand;
  onChange: (nextValue: ConversionOptions) => void;
  onBeadBrandChange: (brand: BeadBrand) => void;
};

export default function ConversionControls({
  activeScenario,
  value,
  beadBrand,
  onChange,
  onBeadBrandChange,
}: ConversionControlsProps) {
  const updateValue = <Key extends keyof ConversionOptions>(
    key: Key,
    next: ConversionOptions[Key],
  ) => {
    onChange({ ...value, [key]: next } as ConversionOptions);
  };

  const sizeOptions: GridSize[] = [16, 32, 50, 64, 100];
  const paletteOptions: PaletteSize[] = [16, 32];
  const detailPreset = inferDetailPreset(value);
  const imageKindPreset = inferImageKindPreset(value);
  const framingPreset = inferFramingPreset(value);

  return (
    <section className="controls-card" aria-label="项目设置">
      <div className="controls-card__header">
        <p className="eyebrow">项目设置</p>
      </div>

      <div className="controls-card__groups">
        <fieldset className="size-control">
          <legend>网格尺寸</legend>
          <DropdownField
            label="网格尺寸"
            hideLabel
            value={value.gridSize}
            options={sizeOptions.map((size) => ({
              label: `${size} x ${size}`,
              value: size,
            }))}
            onChange={(size) => updateValue('gridSize', size as GridSize)}
          />
        </fieldset>

        {activeScenario !== 'beads' ? (
          <fieldset className="size-control">
            <legend>颜色数量</legend>
            <DropdownField
              label="颜色数量"
              hideLabel
              value={value.paletteSize}
              options={paletteOptions.map((size) => ({
                label: `${size} 色`,
                value: size,
              }))}
              onChange={(size) => updateValue('paletteSize', size as PaletteSize)}
            />
          </fieldset>
        ) : null}

        <fieldset className="toggle-grid">
          <legend>转绘偏好</legend>
          <DropdownField
            label="细节等级"
            value={detailPreset}
            options={[
              { label: '简洁', value: 'clean' satisfies DetailPreset },
              { label: '平衡', value: 'balanced' satisfies DetailPreset },
              { label: '细节', value: 'detailed' satisfies DetailPreset },
            ]}
            onChange={(preset) => onChange(applyDetailPreset(value, preset as DetailPreset))}
          />
          <DropdownField
            label="图像类型"
            value={imageKindPreset}
            options={[
              { label: '通用图像', value: 'general' satisfies ImageKindPreset },
              {
                label: '角色线稿',
                value: 'line-art-character' satisfies ImageKindPreset,
              },
            ]}
            onChange={(preset) =>
              onChange(applyImageKindPreset(value, preset as ImageKindPreset))
            }
          />
          <DropdownField
            label="画面构图"
            value={framingPreset}
            options={[
              {
                label: '完整构图',
                value: 'full-composition' satisfies FramingPreset,
              },
              {
                label: '主体突出',
                value: 'subject-focus' satisfies FramingPreset,
              },
            ]}
            onChange={(preset) =>
              onChange(applyFramingPreset(value, preset as FramingPreset))
            }
          />
        </fieldset>

        {activeScenario === 'beads' ? (
          <fieldset className="size-control">
            <legend>拼豆色板</legend>
            <DropdownField
              label="选择拼豆品牌映射"
              value={beadBrand}
              options={BEAD_BRAND_ORDER.map((brandId) => ({
                value: brandId,
                label: BEAD_BRANDS[brandId].label,
              }))}
              onChange={(brand) => onBeadBrandChange(brand as BeadBrand)}
            />
          </fieldset>
        ) : null}
      </div>
    </section>
  );
}
