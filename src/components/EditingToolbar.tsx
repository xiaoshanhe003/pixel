import type { EditorTool, EditorToolSettings } from '../types/studio';
import { TOOL_ICON_SVGS } from '../utils/toolIcons';

type EditingToolbarProps = {
  activeColor: string;
  palette: readonly string[];
  onColorChange: (color: string) => void;
  tool: EditorTool;
  toolSettings: EditorToolSettings;
  onToolChange: (tool: EditorTool) => void;
  onToolSettingsChange: (
    updater: (current: EditorToolSettings) => EditorToolSettings,
  ) => void;
};

const TOOL_SIZE_OPTIONS = [1, 2, 3, 4] as const;

const TOOL_OPTIONS: Array<{
  id: EditorTool;
  label: string;
}> = [
  { id: 'paint', label: '画笔' },
  { id: 'erase', label: '橡皮' },
  { id: 'fill', label: '填充桶' },
  { id: 'line', label: '线条' },
  { id: 'rectangle', label: '矩形' },
  { id: 'sample', label: '取色' },
  { id: 'move', label: '移动' },
];

function renderSizeControls(params: {
  label: string;
  size: EditorToolSettings['paintSize'];
  onChange: (size: EditorToolSettings['paintSize']) => void;
}) {
  const { label, size, onChange } = params;

  return (
    <fieldset className="tool-setting-group">
      <legend>{label}</legend>
      <div className="tool-setting-group__options" role="list" aria-label={label}>
        {TOOL_SIZE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`chip-button tool-size-chip${size === option ? ' is-active' : ''}`}
            onClick={() => onChange(option)}
            aria-pressed={size === option}
          >
            {option} px
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function EditingToolbar({
  activeColor,
  palette,
  onColorChange,
  tool,
  toolSettings,
  onToolChange,
  onToolSettingsChange,
}: EditingToolbarProps) {
  const toolSettingsContent =
    tool === 'paint'
      ? renderSizeControls({
          label: '画笔尺寸',
          size: toolSettings.paintSize,
          onChange: (size) =>
            onToolSettingsChange((current) => ({ ...current, paintSize: size })),
        })
      : tool === 'erase'
        ? renderSizeControls({
            label: '橡皮尺寸',
            size: toolSettings.eraseSize,
            onChange: (size) =>
              onToolSettingsChange((current) => ({ ...current, eraseSize: size })),
          })
        : null;

  return (
    <section className="panel tool-panel" aria-label="编辑工具">
      <div className="panel__header">
        <div className="panel-title-block">
          <h2>工具</h2>
        </div>
      </div>

      <div className="tool-panel__body">
        <div className="tool-section">
          <span className="tool-section__label">当前工具</span>
          <div className="tool-row">
            {TOOL_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`chip-button tool-button${tool === option.id ? ' is-active' : ''}`}
                onClick={() => onToolChange(option.id)}
              >
                <span
                  className="tool-button__icon"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: TOOL_ICON_SVGS[option.id] }}
                />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {toolSettingsContent ? (
          <div className="tool-setting-card" aria-live="polite">
            <div className="tool-setting-card__header">
              <span className="tool-section__label">当前设置</span>
            </div>
            {toolSettingsContent}
          </div>
        ) : null}

        <label className="color-picker" htmlFor="active-color">
          <span className="tool-section__label">当前颜色</span>
          <div className="color-picker__row">
            <input
              id="active-color"
              type="color"
              value={activeColor}
              onChange={(event) => onColorChange(event.target.value)}
            />
            <code>{activeColor}</code>
          </div>
          {palette.length > 0 ? (
            <div className="color-palette" role="list" aria-label="当前色板">
              {palette.map((color) => {
                const isActive = activeColor.toLowerCase() === color.toLowerCase();

                return (
                  <button
                    key={color}
                    type="button"
                    className={`color-palette__swatch${isActive ? ' is-active' : ''}`}
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
        </label>
      </div>
    </section>
  );
}
