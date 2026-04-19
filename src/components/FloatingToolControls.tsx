import { useEffect, useMemo, useRef, useState } from 'react';
import type { BeadBrand } from '../data/beadPalettes';
import type { EditorTool, EditorToolSettings } from '../types/studio';
import { hexToRgb } from '../utils/color';
import BeadColorLibrary from './BeadColorLibrary';
import { SwatchButton } from './ui/button';

type FloatingToolControlsProps = {
  activeColor: string;
  activeColorLabel: string;
  beadBrand?: BeadBrand;
  palette: readonly string[];
  tool: EditorTool;
  toolSettings: EditorToolSettings;
  useBeadLibrary?: boolean;
  onColorChange: (color: string) => void;
  onToolSettingsChange: (
    updater: (current: EditorToolSettings) => EditorToolSettings,
  ) => void;
};

const TOOL_SIZE_OPTIONS = [1, 2, 3, 4] as const;

function getHueAndLightness(color: string) {
  const { r, g, b } = hexToRgb(color);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) {
    return { hue: 361, lightness };
  }

  let hue = 0;

  if (max === red) {
    hue = ((green - blue) / delta) % 6;
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return {
    hue: hue * 60 < 0 ? hue * 60 + 360 : hue * 60,
    lightness,
  };
}

export default function FloatingToolControls({
  activeColor,
  activeColorLabel,
  beadBrand,
  palette,
  tool,
  toolSettings,
  useBeadLibrary = false,
  onColorChange,
  onToolSettingsChange,
}: FloatingToolControlsProps) {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sortedPalette = useMemo(
    () =>
      [...palette].sort((left, right) => {
        const leftColor = getHueAndLightness(left);
        const rightColor = getHueAndLightness(right);

        if (leftColor.hue !== rightColor.hue) {
          return leftColor.hue - rightColor.hue;
        }

        return leftColor.lightness - rightColor.lightness;
      }),
    [palette],
  );

  useEffect(() => {
    if (!isLibraryOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsLibraryOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsLibraryOpen(false);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLibraryOpen]);

  const activeSize = tool === 'erase' ? toolSettings.eraseSize : toolSettings.paintSize;
  function updateSize(nextSize: number) {
    onToolSettingsChange((current) =>
      tool === 'erase'
        ? { ...current, eraseSize: nextSize as EditorToolSettings['eraseSize'] }
        : { ...current, paintSize: nextSize as EditorToolSettings['paintSize'] },
    );
  }

  return (
    <div
      ref={rootRef}
      className="bead-floating-panel"
      aria-label={tool === 'paint' ? '画笔设置' : tool === 'fill' ? '填充设置' : '橡皮设置'}
    >
      {(tool === 'paint' || tool === 'erase') ? (
        <div
          className="floating-size-slider bead-floating-panel__size"
          aria-label={tool === 'paint' ? '画笔尺寸' : '橡皮尺寸'}
        >
          <div className="floating-size-slider__body">
            <div className="floating-size-slider__track">
              <div className="floating-size-slider__rail">
                <input
                  className="floating-size-slider__input"
                  type="range"
                  min={TOOL_SIZE_OPTIONS[0]}
                  max={TOOL_SIZE_OPTIONS[TOOL_SIZE_OPTIONS.length - 1]}
                  step={1}
                  value={activeSize}
                  aria-label={tool === 'paint' ? '画笔尺寸' : '橡皮尺寸'}
                  onChange={(event) => updateSize(Number(event.target.value))}
                />
              </div>
            </div>
            <strong className="floating-size-slider__value" aria-label={`当前尺寸 ${activeSize} px`}>
              {activeSize}px
            </strong>
          </div>
        </div>
      ) : null}

      {tool !== 'erase' ? <div className="bead-floating-panel__divider" aria-hidden="true" /> : null}

      {tool !== 'erase' ? (
        useBeadLibrary && beadBrand ? (
          <button
            type="button"
            className={`bead-library__trigger bead-floating-panel__current${
              isLibraryOpen ? ' is-active' : ''
            }`}
            aria-expanded={isLibraryOpen}
            aria-label={`当前颜色 ${activeColorLabel}，打开 ${beadBrand} 品牌色板`}
            onClick={() => setIsLibraryOpen((current) => !current)}
          >
            <span className="bead-library__current" style={{ backgroundColor: activeColor }} />
            <code>{activeColorLabel}</code>
          </button>
        ) : (
          <label
            className="bead-floating-panel__current bead-floating-panel__current--picker"
            htmlFor="floating-active-color"
            aria-label="颜色"
          >
            <span className="bead-library__current" style={{ backgroundColor: activeColor }} />
            <input
              id="floating-active-color"
              type="color"
              value={activeColor}
              onChange={(event) => onColorChange(event.target.value)}
            />
            <code>{activeColorLabel}</code>
          </label>
        )
      ) : null}

      {tool !== 'erase' && palette.length > 0 ? (
        <div className="color-palette color-palette--floating" role="list" aria-label="当前色板">
          {sortedPalette.map((color) => {
            const isActive = activeColor.toLowerCase() === color.toLowerCase();

            return (
              <SwatchButton
                key={color}
                className={`color-palette__swatch${isActive ? ' is-active' : ''}`}
                active={isActive}
                onClick={() => onColorChange(color)}
                aria-label={`选择颜色 ${color}`}
                aria-pressed={isActive}
                title={color}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
      ) : null}

      {tool !== 'erase' && useBeadLibrary && beadBrand && isLibraryOpen ? (
        <BeadColorLibrary
          activeColor={activeColor}
          beadBrand={beadBrand}
          onColorChange={onColorChange}
          onClose={() => setIsLibraryOpen(false)}
          variant="popover"
        />
      ) : null}
    </div>
  );
}
