import type { ConversionOptions, GridSize, PaletteSize } from '../types/pixel';
import { CheckboxField } from './ui/checkbox';
import { DropdownField } from './ui/dropdown';

type ConversionControlsProps = {
  value: ConversionOptions;
  onChange: (nextValue: ConversionOptions) => void;
};

export default function ConversionControls({
  value,
  onChange,
}: ConversionControlsProps) {
  const updateValue = <Key extends keyof ConversionOptions>(
    key: Key,
    next: ConversionOptions[Key],
  ) => {
    onChange({ ...value, [key]: next } as ConversionOptions);
  };

  const sizeOptions: GridSize[] = [16, 32, 64];
  const paletteOptions: PaletteSize[] = [16, 32];

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

        <fieldset className="size-control">
          <legend>调色板数量</legend>
          <DropdownField
            label="调色板数量"
            hideLabel
            value={value.paletteSize}
            options={paletteOptions.map((size) => ({
              label: `${size} 色`,
              value: size,
            }))}
            onChange={(size) => updateValue('paletteSize', size as PaletteSize)}
          />
        </fieldset>

        <fieldset className="toggle-grid">
          <legend>处理选项</legend>
          <CheckboxField
            label="启用抖动"
            checked={value.dithering}
            onCheckedChange={(checked) => updateValue('dithering', checked === true)}
          />
          <CheckboxField
            label="清理杂点"
            checked={value.cleanupNoise}
            onCheckedChange={(checked) =>
              updateValue('cleanupNoise', checked === true)
            }
          />
          <CheckboxField
            label="保留轮廓"
            checked={value.preserveSilhouette}
            onCheckedChange={(checked) =>
              updateValue('preserveSilhouette', checked === true)
            }
          />
          <CheckboxField
            label="简化形状"
            checked={value.simplifyShapes}
            onCheckedChange={(checked) =>
              updateValue('simplifyShapes', checked === true)
            }
          />
          <CheckboxField
            label="线稿角色模式"
            checked={value.animeMode}
            onCheckedChange={(checked) => updateValue('animeMode', checked === true)}
          />
          <CheckboxField
            label="主体铺满画幅"
            checked={value.fillFrame}
            onCheckedChange={(checked) => updateValue('fillFrame', checked === true)}
          />
        </fieldset>
      </div>
    </section>
  );
}
