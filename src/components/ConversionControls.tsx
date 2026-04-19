import { BEAD_BRANDS, BEAD_BRAND_ORDER, type BeadBrand } from '../data/beadPalettes';
import type { ConversionOptions, GridSize, PaletteSize } from '../types/pixel';
import type { ScenarioId } from '../types/studio';
import { DropdownField } from './ui/dropdown';
import {
  applyDetailPreset,
  inferDetailPreset,
  type DetailPreset,
} from '../utils/conversionPresets';

type ConversionControlsProps = {
  activeScenario: ScenarioId;
  value: ConversionOptions;
  beadBrand: BeadBrand;
  onChange: (nextValue: ConversionOptions) => void;
  onBeadBrandChange: (brand: BeadBrand) => void;
  title?: string;
  className?: string;
  bodyClassName?: string;
  plain?: boolean;
  showCanvasSize?: boolean;
};

export default function ConversionControls({
  activeScenario,
  value,
  beadBrand,
  onChange,
  onBeadBrandChange,
  title = '项目设置',
  className = '',
  bodyClassName = '',
  plain = false,
  showCanvasSize = true,
}: ConversionControlsProps) {
  const gridWidth = value.gridWidth ?? value.gridSize ?? 16;
  const gridHeight = value.gridHeight ?? value.gridSize ?? 16;

  const updateValue = <Key extends keyof ConversionOptions>(
    key: Key,
    next: ConversionOptions[Key],
  ) => {
    onChange({ ...value, [key]: next } as ConversionOptions);
  };

  const paletteOptions: PaletteSize[] = [16, 32];
  const detailPreset = inferDetailPreset(value);
  const groups = (
    <div className={plain ? `conversion-controls__groups ${bodyClassName}`.trim() : `controls-card__groups ${bodyClassName}`.trim()}>
        {showCanvasSize ? (
          <fieldset className="size-control">
            <legend>画布</legend>
            <div className="size-fields">
              <label className="ui-number-field">
                <span className="ui-number-field__label">宽</span>
                <input
                  className="ui-number-field__input"
                  type="number"
                  min={1}
                  max={256}
                  step={1}
                  inputMode="numeric"
                  value={gridWidth}
                  onChange={(event) =>
                    updateValue(
                      'gridWidth',
                      Math.max(1, Number.parseInt(event.target.value || '1', 10)) as GridSize,
                    )
                  }
                />
              </label>
              <label className="ui-number-field">
                <span className="ui-number-field__label">高</span>
                <input
                  className="ui-number-field__input"
                  type="number"
                  min={1}
                  max={256}
                  step={1}
                  inputMode="numeric"
                  value={gridHeight}
                  onChange={(event) =>
                    updateValue(
                      'gridHeight',
                      Math.max(1, Number.parseInt(event.target.value || '1', 10)) as GridSize,
                    )
                  }
                />
              </label>
            </div>
          </fieldset>
        ) : null}

        {plain && activeScenario !== 'beads' ? (
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

        {plain ? (
          <div className="toggle-grid">
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
          </div>
        ) : null}

        {activeScenario === 'beads' ? (
          <fieldset className="size-control">
            <legend>拼豆色板</legend>
            <DropdownField
              label="拼豆色板"
              hideLabel
              ariaLabel="拼豆色板"
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
  );

  if (plain) {
    return (
      <div className={`conversion-controls conversion-controls--plain ${className}`.trim()}>
        {groups}
      </div>
    );
  }

  return (
    <section className={`controls-card ${className}`.trim()} aria-label={title}>
      <div className="panel__header">
        <h2>{title}</h2>
      </div>

      {groups}
    </section>
  );
}
