import type { ConversionOptions } from '../types/pixel';
import type { ScenarioDefinition } from '../types/studio';

export const DEFAULT_OPTIONS: ConversionOptions = {
  gridSize: 16,
  paletteSize: 16,
  dithering: false,
  cleanupNoise: true,
  preserveSilhouette: true,
  simplifyShapes: true,
  animeMode: true,
  fillFrame: false,
};

export const FIT_WINDOW_ZOOM = 1;
export const ACTUAL_SIZE_ZOOM = -1;

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'pixel',
    label: '像素绘画',
    exports: ['PNG', 'GIF', 'Sprite Sheet'],
  },
  {
    id: 'beads',
    label: '拼豆图纸',
    exports: ['打印图纸', '豆子清单', 'PNG'],
  },
  {
    id: 'crochet',
    label: '钩织图纸',
    exports: ['PDF 图纸', 'PNG 图样', '行列说明'],
  },
] as const;
