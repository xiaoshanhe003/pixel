import type { EditorTool } from '../types/studio';
import { TOOL_ICON_SVGS } from '../utils/toolIcons';

type EditingToolbarProps = {
  activeColor: string;
  palette: readonly string[];
  onColorChange: (color: string) => void;
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
};

const TOOL_OPTIONS: Array<{ id: EditorTool; label: string }> = [
  { id: 'paint', label: '画笔' },
  { id: 'erase', label: '橡皮' },
  { id: 'fill', label: '填充桶' },
  { id: 'line', label: '线条' },
  { id: 'rectangle', label: '矩形' },
  { id: 'sample', label: '取色' },
  { id: 'move', label: '移动' },
];

export default function EditingToolbar({
  activeColor,
  palette,
  onColorChange,
  tool,
  onToolChange,
}: EditingToolbarProps) {
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
