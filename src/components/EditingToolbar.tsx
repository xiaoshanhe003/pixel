import type * as React from 'react';
import type { EditorTool } from '../types/studio';
import { REDO_SVG, TOOL_ICON_SVGS, UNDO_SVG } from '../utils/toolIcons';

type EditingToolbarProps = {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  extraControls?: React.ReactNode;
};

const TOOL_OPTIONS: Array<{
  id: EditorTool;
  label: string;
}> = [
  { id: 'select', label: '选择' },
  { id: 'paint', label: '画笔' },
  { id: 'erase', label: '橡皮' },
  { id: 'fill', label: '填充桶' },
  { id: 'line', label: '线条' },
  { id: 'rectangle', label: '矩形' },
  { id: 'sample', label: '取色' },
  { id: 'move', label: '抓手' },
];

const TOOL_GROUPS: Array<{
  label: string;
  items: EditorTool[];
}> = [
  {
    label: '选择与视图',
    items: ['select', 'move'],
  },
  {
    label: '绘制',
    items: ['paint', 'erase', 'sample', 'line', 'rectangle', 'fill'],
  },
];

export default function EditingToolbar({
  tool,
  onToolChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  extraControls,
}: EditingToolbarProps) {
  const toolOptionById = new Map(TOOL_OPTIONS.map((option) => [option.id, option]));

  return (
    <section className="panel tool-panel tool-panel--inline" aria-label="编辑工具">
      <div className="tool-panel__inline-row">
        <div className="tool-panel__groups" aria-label="工具分类">
          {TOOL_GROUPS.map((group) => (
            <section key={group.label} className="tool-cluster" aria-label={group.label}>
              <div className="tool-row tool-row--inline tool-cluster__buttons">
                {group.items.map((toolId) => {
                  const option = toolOptionById.get(toolId);

                  if (!option) {
                    return null;
                  }

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`chip-button tool-button${tool === option.id ? ' is-active' : ''}`}
                      onClick={() => onToolChange(option.id)}
                      aria-pressed={tool === option.id}
                      aria-label={option.label}
                    >
                      <span
                        className="tool-button__icon"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: TOOL_ICON_SVGS[option.id] }}
                      />
                      <span className="tool-button__tooltip" aria-hidden="true">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {extraControls ? (
          <section className="tool-panel__inline-actions tool-cluster" aria-label="历史与视图">
            <div className="tool-cluster__buttons">
              <button
                type="button"
                className="chip-button tool-button"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="撤销"
              >
                <span
                  className="tool-button__icon"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: UNDO_SVG }}
                />
                <span className="tool-button__tooltip" aria-hidden="true">
                  撤销
                </span>
              </button>
              <button
                type="button"
                className="chip-button tool-button"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label="重做"
              >
                <span
                  className="tool-button__icon"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: REDO_SVG }}
                />
                <span className="tool-button__tooltip" aria-hidden="true">
                  重做
                </span>
              </button>
              {extraControls}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
