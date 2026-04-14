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
    <section className="controls-card" aria-label="conversion controls">
      <div className="controls-card__header">
        <p className="eyebrow">Conversion controls</p>
        <p className="controls-card__note">
          Tune the reduction pass before the canvas becomes a grid.
        </p>
      </div>

      <div className="controls-card__groups">
        <fieldset className="size-control">
          <legend>Grid Size</legend>
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
          <legend>Palette Size</legend>
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
                {size} colors
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="toggle-grid">
          <legend>Processing</legend>
          <p className="control-help">
            Dithering helps gradients. Cleanup removes stray pixels. Preserve
            silhouette keeps tiny edge shapes from being over-smoothed.
          </p>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={value.dithering}
              onChange={(event) => updateValue('dithering', event.target.checked)}
            />
            Enable dithering
          </label>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={value.cleanupNoise}
              onChange={(event) =>
                updateValue('cleanupNoise', event.target.checked)
              }
            />
            Clean stray pixels
          </label>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={value.preserveSilhouette}
              onChange={(event) =>
                updateValue('preserveSilhouette', event.target.checked)
              }
            />
            Preserve silhouette
          </label>
        </fieldset>
      </div>
    </section>
  );
}
