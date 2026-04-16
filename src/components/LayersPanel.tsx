import type { StudioLayer } from '../types/studio';

type LayersPanelProps = {
  layers: StudioLayer[];
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
};

export default function LayersPanel({
  layers,
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
}: LayersPanelProps) {
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

      <div className="layers-list">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            className={`layer-card${layer.id === activeLayerId ? ' is-active' : ''}`}
          >
            <button
              type="button"
              className="layer-card__select"
              onClick={() => onSelectLayer(layer.id)}
            >
              选中
            </button>
            <input
              aria-label={`${layer.name} 名称`}
              className="layer-card__input"
              value={layer.name}
              onChange={(event) => onRenameLayer(layer.id, event.target.value)}
            />
            <div className="layer-card__actions">
              <button
                type="button"
                className="chip-button"
                onClick={() => onToggleVisibility(layer.id)}
              >
                {layer.visible ? '隐藏' : '显示'}
              </button>
              <button
                type="button"
                className="chip-button"
                onClick={() => onToggleLock(layer.id)}
              >
                {layer.locked ? '解锁' : '锁定'}
              </button>
              <button
                type="button"
                className="chip-button"
                onClick={() => onMoveLayer(layer.id, 'up')}
                disabled={index === 0}
              >
                上移
              </button>
              <button
                type="button"
                className="chip-button"
                onClick={() => onMoveLayer(layer.id, 'down')}
                disabled={index === layers.length - 1}
              >
                下移
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
