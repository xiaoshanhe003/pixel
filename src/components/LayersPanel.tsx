import { useState } from 'react';
import type { GridSize } from '../types/pixel';
import type { StudioLayer } from '../types/studio';

const EYE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5c5.25 0 9.27 3.11 10 7c-.73 3.89 -4.75 7 -10 7s-9.27 -3.11 -10 -7c.73 -3.89 4.75 -7 10 -7" /><path d="M12 9a3 3 0 1 1 0 6a3 3 0 0 1 0 -6" /></svg>`;
const EYE_OFF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18" /><path d="M10.58 10.59a2 2 0 0 0 2.83 2.82" /><path d="M9.88 5.09A10.46 10.46 0 0 1 12 5c5.25 0 9.27 3.11 10 7a11.8 11.8 0 0 1 -3.11 4.62" /><path d="M6.61 6.62C4.62 7.85 3.24 9.74 2 12c.73 3.89 4.75 7 10 7c1.87 0 3.61 -.4 5.11 -1.1" /></svg>`;
const GRIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /></svg>`;

type LayersPanelProps = {
  layers: StudioLayer[];
  width: GridSize;
  height: GridSize;
  activeLayerId: string;
  onSelectLayer: (layerId: string) => void;
  onAddLayer: () => void;
  onDuplicateLayer: () => void;
  onDeleteLayer: () => void;
  onMergeLayerDown: () => void;
  onRenameLayer: (layerId: string, name: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
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
  onMoveLayer,
  onReorderLayer,
  onOpacityChange,
}: LayersPanelProps) {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const activeLayer = layers.find((layer) => layer.id === activeLayerId) ?? layers[0];
  const activeLayerIndex = layers.findIndex((layer) => layer.id === activeLayer?.id);

  return (
    <section className="panel panel--sidebar" aria-label="图层面板">
      <div className="panel__header">
        <h2>图层</h2>
        <span>{layers.length} 个</span>
      </div>

      <div className="frame-strip__actions">
        <button type="button" className="chip-button" onClick={onAddLayer}>
          新建图层
        </button>
        <button type="button" className="chip-button" onClick={onDuplicateLayer}>
          复制图层
        </button>
        <button
          type="button"
          className="chip-button"
          onClick={onDeleteLayer}
          disabled={layers.length <= 1}
        >
          删除图层
        </button>
        <button
          type="button"
          className="chip-button"
          onClick={onMergeLayerDown}
          disabled={layers.length <= 1}
        >
          合并到下层
        </button>
      </div>

      <div className="layers-list" aria-label="图层列表">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            className={`layer-row${layer.id === activeLayerId ? ' is-active' : ''}${
              draggedLayerId === layer.id ? ' is-dragging' : ''
            }${dropTargetIndex === index ? ' is-drop-target' : ''}${
              !layer.visible ? ' is-hidden' : ''
            }`}
            role="button"
            tabIndex={0}
            aria-pressed={layer.id === activeLayerId}
            onClick={() => onSelectLayer(layer.id)}
            onDoubleClick={() => {
              onSelectLayer(layer.id);
              setEditingLayerId(layer.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectLayer(layer.id);
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
            <div
              className="layer-row__handle icon-button--ghost"
              role="button"
              tabIndex={-1}
              draggable
              aria-label={`拖动排序 ${layer.name}`}
              onClick={(event) => event.stopPropagation()}
              onDragStart={(event) => {
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
              <span
                className="layer-row__icon"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: GRIP_SVG }}
              />
            </div>
            <div className="layer-row__main">
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
                <span
                  className={`layer-row__meta${
                    Math.round(layer.opacity * 100) !== 100 ? ' is-emphasized' : ''
                  }`}
                >
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            </div>
            <button
              type="button"
              className={`layer-row__visibility icon-button--ghost${layer.visible ? '' : ' is-muted'}`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleVisibility(layer.id);
              }}
              aria-label={`${layer.visible ? '隐藏' : '显示'} ${layer.name}`}
            >
              <span
                className="layer-row__icon"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: layer.visible ? EYE_SVG : EYE_OFF_SVG }}
              />
            </button>
          </div>
        ))}
      </div>

      {activeLayer ? (
        <div className="layer-detail">
          <span className="layer-detail__label">当前图层</span>
          <input
            aria-label={`${activeLayer.name} 名称`}
            className="layer-card__input"
            value={activeLayer.name}
            onClick={() => setEditingLayerId(activeLayer.id)}
            onChange={(event) => onRenameLayer(activeLayer.id, event.target.value)}
          />
          <label className="layer-detail__opacity">
            <span>透明度</span>
            <div className="layer-detail__opacity-control">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(activeLayer.opacity * 100)}
                onChange={(event) =>
                  onOpacityChange(activeLayer.id, Number(event.target.value) / 100)
                }
                aria-label={`${activeLayer.name} 透明度`}
              />
              <span aria-label={`${activeLayer.name} 透明度数值`}>
                {Math.round(activeLayer.opacity * 100)}%
              </span>
            </div>
          </label>
          <div className="layer-card__actions">
            <button
              type="button"
              className="chip-button"
              onClick={() => onToggleVisibility(activeLayer.id)}
            >
              {activeLayer.visible ? '隐藏' : '显示'}
            </button>
            <button
              type="button"
              className="chip-button"
              onClick={() => onToggleLock(activeLayer.id)}
            >
              {activeLayer.locked ? '解锁' : '锁定'}
            </button>
            <button
              type="button"
              className="chip-button"
              onClick={() => onMoveLayer(activeLayer.id, 'up')}
              disabled={activeLayerIndex === 0}
            >
              上移
            </button>
            <button
              type="button"
              className="chip-button"
              onClick={() => onMoveLayer(activeLayer.id, 'down')}
              disabled={activeLayerIndex === layers.length - 1}
            >
              下移
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
