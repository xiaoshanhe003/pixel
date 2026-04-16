import type { ConversionOptions, PixelGrid } from '../types/pixel';

type InspectorPanelProps = {
  grid: PixelGrid;
  options: ConversionOptions;
  transparentCount: number;
  scenarioLabel: string;
  frameCount: number;
  materialCountLabel?: string;
};

export default function InspectorPanel({
  grid,
  options,
  transparentCount,
  scenarioLabel,
  frameCount,
  materialCountLabel,
}: InspectorPanelProps) {
  return (
    <section className="panel panel--sidebar">
      <div className="panel__header">
        <h2>网格检查器</h2>
        <span>{grid.width} x {grid.height}</span>
      </div>

      <ul className="inspector-list">
        <li>总格数：{grid.cells.length}</li>
        <li>实际颜色：{grid.palette.length}</li>
        <li>透明格：{transparentCount}</li>
        <li>当前场景：{scenarioLabel}</li>
        <li>工作帧数：{frameCount}</li>
        {materialCountLabel ? <li>{materialCountLabel}</li> : null}
        <li>调色板上限：{options.paletteSize} 色</li>
        <li>
          抖动：{options.dithering ? '开启' : '关闭'} | 清理：
          {options.cleanupNoise ? '开启' : '关闭'}
        </li>
        <li>
          形状简化：{options.simplifyShapes ? '开启' : '关闭'}
        </li>
        <li>
          线稿角色模式：{options.animeMode ? '开启' : '关闭'}
        </li>
        <li>
          主体铺满：{options.fillFrame ? '开启' : '关闭'}
        </li>
      </ul>
    </section>
  );
}
