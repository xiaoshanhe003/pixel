import type { PixelGrid } from '../types/pixel';
import type { StudioFrame } from '../types/studio';

type FrameStripProps = {
  frames: Array<{ frame: StudioFrame; preview: PixelGrid }>;
  activeFrameId: string;
  isPlaying: boolean;
  fps: number;
  onSelectFrame: (frameId: string) => void;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onDeleteFrame: () => void;
  onTogglePlayback: () => void;
  onFpsChange: (fps: number) => void;
};

function getFilledCellCount(frame: PixelGrid): number {
  return frame.cells.filter((cell) => cell.color).length;
}

export default function FrameStrip({
  frames,
  activeFrameId,
  isPlaying,
  fps,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onTogglePlayback,
  onFpsChange,
}: FrameStripProps) {
  return (
    <section className="panel frame-strip" aria-label="动画帧">
      <div className="panel__header">
        <h2>逐帧动画</h2>
        <span>{frames.length} 帧</span>
      </div>

      <div className="frame-strip__actions">
        <button
          type="button"
          className={`chip-button${isPlaying ? ' is-active' : ''}`}
          onClick={onTogglePlayback}
          disabled={frames.length <= 1}
        >
          {isPlaying ? '暂停预览' : '播放预览'}
        </button>
        <button
          type="button"
          className="chip-button"
          onClick={() => onFpsChange(Math.max(1, fps - 1))}
        >
          降速
        </button>
        <span className="frame-strip__fps" aria-label={`当前预览速度 ${fps} fps`}>
          {fps} FPS
        </span>
        <button
          type="button"
          className="chip-button"
          onClick={() => onFpsChange(Math.min(24, fps + 1))}
        >
          加速
        </button>
        <button type="button" className="chip-button" onClick={onAddFrame}>
          新建空白帧
        </button>
        <button type="button" className="chip-button" onClick={onDuplicateFrame}>
          复制当前帧
        </button>
        <button
          type="button"
          className="chip-button"
          onClick={onDeleteFrame}
          disabled={frames.length <= 1}
        >
          删除当前帧
        </button>
      </div>

      <div className="frame-strip__list">
        {frames.map(({ frame, preview }, index) => (
          <button
            key={frame.id}
            type="button"
            className={`frame-card${frame.id === activeFrameId ? ' is-active' : ''}`}
            aria-label={`第 ${index + 1} 帧`}
            onClick={() => onSelectFrame(frame.id)}
          >
            <div
              className="frame-card__thumbnail"
              style={{
                gridTemplateColumns: `repeat(${preview.width}, minmax(0, 1fr))`,
              }}
            >
              {preview.cells.map((cell) => (
                <span
                  key={`${frame.id}-${cell.x}-${cell.y}`}
                  className={`frame-card__pixel${cell.color ? '' : ' frame-card__pixel--transparent'}`}
                  style={cell.color ? { backgroundColor: cell.color } : undefined}
                />
              ))}
            </div>
            <strong>第 {index + 1} 帧</strong>
            <span>{preview.width} x {preview.height}</span>
            <span>{getFilledCellCount(preview)} 个已填色像素</span>
          </button>
        ))}
      </div>
    </section>
  );
}
