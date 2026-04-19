import { BEAD_BRANDS, BEAD_BRAND_ORDER, type BeadBrand } from '../data/beadPalettes';
import type { BeadMappedColor } from '../utils/beads';
import { Button } from './ui/button';

type BeadPalettePanelProps = {
  brand: BeadBrand;
  usage: BeadMappedColor[];
  transparentCount: number;
  onBrandChange: (brand: BeadBrand) => void;
};

export default function BeadPalettePanel({
  brand,
  usage,
  transparentCount,
  onBrandChange,
}: BeadPalettePanelProps) {
  return (
    <section className="panel panel--sidebar">
      <div className="panel__header panel__header--stack">
        <h2>拼豆色板</h2>
        <span>{BEAD_BRANDS[brand].label} 映射</span>
      </div>

      <div className="frame-strip__actions">
        {BEAD_BRAND_ORDER.map((brandId) => {
          const item = BEAD_BRANDS[brandId];

          return (
            <Button
              key={item.id}
              variant={brand === item.id ? 'primary' : 'tertiary'}
              onClick={() => onBrandChange(item.id)}
            >
              {item.label}
            </Button>
          );
        })}
      </div>

      <div className="swatches">
        {usage.map((color) => (
          <div key={color.id} className="swatch">
            <span
              className="swatch-chip"
              aria-hidden="true"
              style={{ backgroundColor: color.hex }}
            />
            <span>{color.id} {color.name}</span>
            <span>{color.count} 颗</span>
          </div>
        ))}

        {transparentCount > 0 ? (
          <div className="swatch">
            <span className="swatch-chip swatch-chip--transparent" aria-hidden="true" />
            <span>透明</span>
            <span>{transparentCount} 格</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
