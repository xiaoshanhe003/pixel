import { useEffect, useMemo, useRef, useState } from 'react';
import type { BeadBrand } from '../data/beadPalettes';
import { BEAD_BRANDS } from '../data/beadPalettes';
import { groupBeadPaletteBySeries } from '../utils/beads';
import { getPerceivedLuminance, hexToRgb } from '../utils/color';
import { Button, SwatchButton } from './ui/button';
import { Icon } from './ui/Icon';

type BeadColorLibraryProps = {
  activeColor: string;
  beadBrand: BeadBrand;
  onColorChange: (color: string) => void;
  onClose: () => void;
  variant?: 'floating' | 'popover';
};

export default function BeadColorLibrary({
  activeColor,
  beadBrand,
  onColorChange,
  onClose,
  variant = 'floating',
}: BeadColorLibraryProps) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);
  const brand = BEAD_BRANDS[beadBrand];
  const groups = useMemo(() => groupBeadPaletteBySeries(beadBrand), [beadBrand]);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) {
      return groups;
    }

    return groups
      .map((group) => {
        const groupMatches =
          group.label.toLowerCase().includes(normalizedQuery) ||
          group.description?.toLowerCase().includes(normalizedQuery);
        const colors = groupMatches
          ? group.colors
          : group.colors.filter((color) =>
              `${color.id} ${color.name} ${color.hex}`.toLowerCase().includes(normalizedQuery),
            );

        return {
          ...group,
          colors,
        };
      })
      .filter((group) => group.colors.length > 0);
  }, [groups, normalizedQuery]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    setQuery('');
  }, [beadBrand]);

  return (
    <div
      className={`bead-library bead-library--${variant}`}
      role="dialog"
      aria-modal="false"
      aria-label={`${brand.label} 品牌色板`}
    >
      <div className="bead-library__header">
        <strong className="bead-library__title">{brand.label}</strong>
        <Button
          variant="tertiary"
          icon={<Icon name="x" />}
          iconOnly
          className="bead-library__close"
          aria-label="关闭品牌色板"
          onClick={onClose}
        />
      </div>

      <div className="bead-library__search">
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索色号、名称或 HEX"
          aria-label="搜索品牌色"
        />
      </div>

      <div className="bead-library__body">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <section key={group.id} className="bead-library__group" aria-label={group.label}>
              <header className="bead-library__group-header">
                <strong>{group.label}</strong>
                {group.description ? <span>{group.description}</span> : null}
              </header>
              <div className="bead-library__swatches bead-library__swatches--stack" role="list">
                {group.colors.map((color) => {
                  const isActive = activeColor.toLowerCase() === color.hex.toLowerCase();
                  const textColor =
                    getPerceivedLuminance(hexToRgb(color.hex)) < 140 ? '#ffffff' : '#1a1a1a';

                  return (
                    <SwatchButton
                      key={color.id}
                      className={`bead-library__swatch bead-library__swatch--tile${
                        isActive ? ' is-active' : ''
                      }`}
                      active={isActive}
                      onClick={() => {
                        onColorChange(color.hex);
                        onClose();
                      }}
                      aria-label={`选择品牌色 ${color.id} ${color.name}`}
                      aria-pressed={isActive}
                      title={`${color.id} · ${color.name} · ${color.hex}`}
                      style={{
                        backgroundColor: color.hex,
                        color: textColor,
                      }}
                    >
                      <span className="bead-library__swatch-code">{color.id}</span>
                    </SwatchButton>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="bead-library__empty">没有匹配的品牌色。</div>
        )}
      </div>
    </div>
  );
}
