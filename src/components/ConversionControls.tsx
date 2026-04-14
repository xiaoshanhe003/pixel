import type { ConversionOptions, GridSize, PaletteSize } from '../types/pixel';

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

  const sizeOptions: GridSize[] = [16, 32];
  const paletteOptions: PaletteSize[] = [16, 32];

  return (
    <section className="controls-card" aria-label="转换控制">
      <div className="controls-card__header">
        <p className="eyebrow">转换控制</p>
        <p className="controls-card__note">
          在生成像素网格前调整缩减策略。
        </p>
      </div>

      <div className="controls-card__groups">
        <fieldset className="size-control">
          <legend>网格尺寸</legend>
          <div className="choice-row">
            {sizeOptions.map((size) => (
              <label key={size} className="size-control__option">
                <input
                  type="radio"
                  name="grid-size"
                  value={size}
                  checked={value.gridSize === size}
                  onChange={() => updateValue('gridSize', size)}
                />
                {size} x {size}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="size-control">
          <legend>调色板数量</legend>
          <div className="choice-row">
            {paletteOptions.map((size) => (
              <label key={size} className="size-control__option">
                <input
                  type="radio"
                  name="palette-size"
                  value={size}
                  checked={value.paletteSize === size}
                  onChange={() => updateValue('paletteSize', size)}
                />
                {size} 色
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="toggle-grid">
          <legend>处理选项</legend>
          <p className="control-help">
            抖动更适合渐变。清理会去掉零散杂点。保留轮廓能避免边缘小形状被过度抹平。
          </p>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={value.dithering}
              onChange={(event) => updateValue('dithering', event.target.checked)}
            />
            启用抖动
          </label>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={value.cleanupNoise}
              onChange={(event) =>
                updateValue('cleanupNoise', event.target.checked)
              }
            />
            清理杂点
          </label>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={value.preserveSilhouette}
              onChange={(event) =>
                updateValue('preserveSilhouette', event.target.checked)
              }
            />
            保留轮廓
          </label>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={value.simplifyShapes}
              onChange={(event) =>
                updateValue('simplifyShapes', event.target.checked)
              }
            />
            简化形状
          </label>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={value.animeMode}
              onChange={(event) =>
                updateValue('animeMode', event.target.checked)
              }
            />
            线稿角色模式
          </label>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={value.fillFrame}
              onChange={(event) =>
                updateValue('fillFrame', event.target.checked)
              }
            />
            主体铺满画幅
          </label>
        </fieldset>
      </div>
    </section>
  );
}
