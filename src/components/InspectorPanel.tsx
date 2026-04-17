import type { ConversionOptions, PixelGrid } from '../types/pixel';
import {
  inferDetailPreset,
  inferFramingPreset,
  inferImageKindPreset,
} from '../utils/conversionPresets';

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
  const detailPreset = inferDetailPreset(options);
  const imageKindPreset = inferImageKindPreset(options);
  const framingPreset = inferFramingPreset(options);
  const detailPresetLabel =
    detailPreset === 'clean'
      ? '简洁'
      : detailPreset === 'detailed'
        ? '细节'
        : '平衡';
  const imageKindLabel = imageKindPreset === 'line-art-character' ? '角色线稿' : '通用图像';
  const framingLabel = framingPreset === 'subject-focus' ? '主体突出' : '完整构图';

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
        <li>颜色上限：{options.paletteSize} 色</li>
        <li>细节等级：{detailPresetLabel}</li>
        <li>图像类型：{imageKindLabel}</li>
        <li>画面构图：{framingLabel}</li>
      </ul>
    </section>
  );
}
