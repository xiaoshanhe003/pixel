import { useEffect, useState } from 'react';
import type { GridSize } from '../types/pixel';
import type { StudioLayer } from '../types/studio';
import { Checkbox } from './ui/checkbox';

const GRIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /></svg>`;
const COPY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z"/><path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2"/></svg>`;
const ARROW_UP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14"/><path d="M18 11l-6 -6"/><path d="M6 11l6 -6"/></svg>`;
const ARROW_DOWN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14"/><path d="M18 13l-6 6"/><path d="M6 13l6 6"/></svg>`;
const LOCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 13m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z"/><path d="M8 13v-4a4 4 0 1 1 8 0v4"/></svg>`;
const LOCK_OPEN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 13m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z"/><path d="M8 13v-4a4 4 0 0 1 7.5 -2"/></svg>`;
const CLEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M19 20h-11.5l-4.5 -4.5a1 1 0 0 1 0 -1.5l9.5 -9.5a1 1 0 0 1 1.5 0l7 7a1 1 0 0 1 0 1.5l-6.5 6.5"/><path d="M18 13.3l-6.3 -6.3"/><path d="M22 21l-5 0"/></svg>`;
const MERGE_DOWN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 18h10"/><path d="M7 6h4"/><path d="M13 6h4"/><path d="M12 8l0 6"/><path d="M9 11l3 3l3 -3"/></svg>`;
const TRASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7l1 -3h4l1 3"/></svg>`;

type LayersPanelProps = {
  layers: StudioLayer[];
  width: GridSize;
  height: GridSize;
  activeLayerId: string;
  onSelectLayer: (layerId: string) => void;
  onAddLayer: () => void;
  onDuplicateLayer: (layerId?: string) => void;
  onDeleteLayer: (layerId?: string) => void;
  onMergeLayerDown: (layerId?: string) => void;
  onRenameLayer: (layerId: string, name: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onClearLayer: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: 'up' | 'down') => void;
  onReorderLayer: (layerId: string, targetIndex: number) => void;
  onOpacityChange: (layerId: string, opacity: number) => void;
};

export default function LayersPanel({
  layers,
  width,
  height,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onMergeLayerDown,
  onRenameLayer,
  onToggleVisibility,
  onToggleLock,
  onClearLayer,
  onMoveLayer,
  onReorderLayer,
  onOpacityChange,
}: LayersPanelProps) {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [contextMenuLayerId, setContextMenuLayerId] = useState<string | null>(null);
  const [expandedOpacityLayerId, setExpandedOpacityLayerId] = useState<string | null>(null);

  useEffect(() => {
    const handlePointerDown = () => setContextMenuLayerId(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenuLayerId(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <section className="panel panel--sidebar" aria-label="图层面板">
      <div className="panel__header">
        <h2>图层</h2>
        <div className="panel__header-actions">
          <button type="button" className="chip-button" onClick={onAddLayer}>
            新建图层
          </button>
        </div>
      </div>
      <div className="layers-list" aria-label="图层列表">
        {layers.map((layer, index) => (
          <div key={layer.id} className="layer-item">
            <div
            className={`layer-row${layer.id === activeLayerId ? ' is-active' : ''}${
              draggedLayerId === layer.id ? ' is-dragging' : ''
            }${dropTargetIndex === index ? ' is-drop-target' : ''}${
              !layer.visible ? ' is-hidden' : ''
            }`}
            role="button"
            tabIndex={0}
            aria-pressed={layer.id === activeLayerId}
            onClick={() => onSelectLayer(layer.id)}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSelectLayer(layer.id);
              setContextMenuLayerId((current) => (current === layer.id ? null : layer.id));
            }}
            onDoubleClick={() => {
              onSelectLayer(layer.id);
              setEditingLayerId(layer.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectLayer(layer.id);
              }

              if (event.key === 'ContextMenu') {
                event.preventDefault();
                onSelectLayer(layer.id);
                setContextMenuLayerId(layer.id);
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={() => setDropTargetIndex(index)}
            onDrop={() => {
              if (draggedLayerId && draggedLayerId !== layer.id) {
                onReorderLayer(draggedLayerId, index);
              }
              setDraggedLayerId(null);
              setDropTargetIndex(null);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDropTargetIndex(null);
              }
            }}
          >
            <span
              className="layer-row__handle layer-row__icon"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: GRIP_SVG }}
            />
            <div
              className="layer-row__main"
              draggable
              onDragStart={(event) => {
                const target = event.target as HTMLElement | null;

                if (target?.closest('.layer-row__name-input')) {
                  event.preventDefault();
                  return;
                }

                setDraggedLayerId(layer.id);
                setDropTargetIndex(index);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', layer.id);

                const row = event.currentTarget.closest('.layer-row');

                if (row instanceof HTMLElement) {
                  const { left, top } = row.getBoundingClientRect();
                  event.dataTransfer.setDragImage(
                    row,
                    event.clientX - left,
                    event.clientY - top,
                  );
                }
              }}
              onDragEnd={() => {
                setDraggedLayerId(null);
                setDropTargetIndex(null);
              }}
            >
              <div
                className="layer-row__thumbnail"
                style={{
                  gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
                }}
              >
                {layer.cells.map((cell) => (
                  <span
                    key={`${layer.id}-${cell.x}-${cell.y}`}
                    className={`layer-row__pixel${cell.color ? '' : ' layer-row__pixel--transparent'}`}
                    style={cell.color ? { backgroundColor: cell.color, opacity: layer.opacity } : undefined}
                  />
                ))}
              </div>
              <div className="layer-row__copy">
                {editingLayerId === layer.id ? (
                  <input
                    aria-label={`${layer.name} 名称`}
                    className="layer-row__name-input"
                    value={layer.name}
                    autoFocus
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onRenameLayer(layer.id, event.target.value)}
                    onBlur={() => setEditingLayerId(null)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === 'Escape') {
                        event.preventDefault();
                        setEditingLayerId(null);
                      }
                    }}
                  />
                ) : (
                  <span className="layer-row__name">{layer.name}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              className={`layer-row__opacity-trigger${
                Math.round(layer.opacity * 100) !== 100 ? ' is-emphasized' : ''
              }`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setExpandedOpacityLayerId((current) =>
                  current === layer.id ? null : layer.id,
                );
              }}
              onDoubleClick={(event) => event.stopPropagation()}
              aria-expanded={expandedOpacityLayerId === layer.id}
              aria-controls={`layer-opacity-${layer.id}`}
            >
              {Math.round(layer.opacity * 100)}%
            </button>
            <Checkbox
              className="layer-row__visibility-checkbox"
              checked={layer.visible}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
              onCheckedChange={() => onToggleVisibility(layer.id)}
              aria-label={`显示 ${layer.name}`}
            />
            {contextMenuLayerId === layer.id ? (
              <div
                className="layer-row__context-menu"
                role="menu"
                aria-label={`${layer.name} 操作`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="layer-row__context-action"
                  role="menuitem"
                  onClick={() => {
                    onDuplicateLayer(layer.id);
                    setContextMenuLayerId(null);
                  }}
                >
                  <span
                    className="layer-row__context-icon"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: COPY_SVG }}
                  />
                  复制图层
                </button>
                <button
                  type="button"
                  className="layer-row__context-action"
                  role="menuitem"
                  onClick={() => {
                    onToggleLock(layer.id);
                    setContextMenuLayerId(null);
                  }}
                >
                  <span
                    className="layer-row__context-icon"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: layer.locked ? LOCK_OPEN_SVG : LOCK_SVG }}
                  />
                  {layer.locked ? '解锁图层' : '锁定图层'}
                </button>
                <button
                  type="button"
                  className="layer-row__context-action"
                  role="menuitem"
                  onClick={() => {
                    onMoveLayer(layer.id, 'up');
                    setContextMenuLayerId(null);
                  }}
                  disabled={index === 0}
                >
                  <span
                    className="layer-row__context-icon"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: ARROW_UP_SVG }}
                  />
                  上移
                </button>
                <button
                  type="button"
                  className="layer-row__context-action"
                  role="menuitem"
                  onClick={() => {
                    onMoveLayer(layer.id, 'down');
                    setContextMenuLayerId(null);
                  }}
                  disabled={index === layers.length - 1}
                >
                  <span
                    className="layer-row__context-icon"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: ARROW_DOWN_SVG }}
                  />
                  下移
                </button>
                <div className="layer-row__context-divider" aria-hidden="true" />
                <button
                  type="button"
                  className="layer-row__context-action"
                  role="menuitem"
                  onClick={() => {
                    onClearLayer(layer.id);
                    setContextMenuLayerId(null);
                  }}
                  disabled={layer.locked}
                >
                  <span
                    className="layer-row__context-icon"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: CLEAR_SVG }}
                  />
                  清除图层
                </button>
                <button
                  type="button"
                  className="layer-row__context-action"
                  role="menuitem"
                  onClick={() => {
                    onMergeLayerDown(layer.id);
                    setContextMenuLayerId(null);
                  }}
                  disabled={layers.length <= 1 || index === layers.length - 1 || layer.locked}
                >
                  <span
                    className="layer-row__context-icon"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: MERGE_DOWN_SVG }}
                  />
                  合并到下层
                </button>
                <div className="layer-row__context-divider" aria-hidden="true" />
                <button
                  type="button"
                  className="layer-row__context-action layer-row__context-action--danger"
                  role="menuitem"
                  onClick={() => {
                    onDeleteLayer(layer.id);
                    setContextMenuLayerId(null);
                  }}
                  disabled={layers.length <= 1}
                >
                  <span
                    className="layer-row__context-icon"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: TRASH_SVG }}
                  />
                  删除图层
                </button>
              </div>
            ) : null}
            </div>
            {expandedOpacityLayerId === layer.id ? (
              <div
                id={`layer-opacity-${layer.id}`}
                className="layer-row__opacity-panel"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <label className="layer-row__opacity-control">
                  <span className="layer-row__opacity-label">不透明度</span>
                  <div className="layer-row__opacity-slider">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(layer.opacity * 100)}
                      onChange={(event) =>
                        onOpacityChange(layer.id, Number(event.target.value) / 100)
                      }
                      aria-label={`${layer.name} 不透明度`}
                    />
                    <span className="layer-row__opacity-value">
                      {Math.round(layer.opacity * 100)}%
                    </span>
                  </div>
                </label>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
